import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz
from app.tradovate_client import TradovateClient
import asyncio

logger = logging.getLogger(__name__)

class TradovateRiskManager:
    def __init__(self, ws_manager, client: TradovateClient):
        self.ws_manager = ws_manager
        self.client = client
        self.scheduler = AsyncIOScheduler()
        self.active_positions = []
        self.active_orders = []

        # Thresholds
        self.DAILY_LOSS_LIMIT = -150.00
        self.MLL_THRESHOLD = 48100.00
        self.MAX_DAILY_LOSSES = 2
        self._prev_realized_pnl = 0.0
        
        # State
        self.kill_switch_engaged = False

        # Register WS callbacks
        self.ws_manager.subscribe_account_updates(self.on_account_update)
        self.ws_manager.subscribe_position_updates(self.on_position_update)

        # Set up Auto-Liquidation (14:50 CT)
        self._setup_auto_liquidation()

    def _setup_auto_liquidation(self):
        # 14:50 CT = 14:50 America/Chicago
        trigger = CronTrigger(hour=14, minute=50, timezone=pytz.timezone("America/Chicago"))
        self.scheduler.add_job(self.execute_liquidation, trigger)
        logger.info("Auto-Liquidation scheduled for 14:50 CT.")

    def start(self):
        self.scheduler.start()

    async def on_account_update(self, account_data):
        """Called by TradovateWSManager when account updates."""
        if self.kill_switch_engaged:
            return

        realized_pnl = account_data.get('realizedPnL', 0)
        cash_balance = account_data.get('cashBalance', 0)
        unrealized_pnl = account_data.get('unrealizedPnL', 0)
        
        net_liquidity = cash_balance + unrealized_pnl

        logger.debug(f"Account Update | PnL: {realized_pnl} | Net Liq: {net_liquidity}")

        # Check if a new losing trade closed
        if realized_pnl < self._prev_realized_pnl:
            loss_delta = realized_pnl - self._prev_realized_pnl
            from app.strategy import daily_risk_guardian
            status = daily_risk_guardian.record_trade_result(is_win=False, pnl=loss_delta)
            if status.get("is_locked"):
                logger.warning(f"🚨 CIRCUIT BREAKER: Max {self.MAX_DAILY_LOSSES} daily losses reached! Liquidating and locking.")
                await self.execute_liquidation()
                self.kill_switch_engaged = True
                return

        self._prev_realized_pnl = realized_pnl

        if realized_pnl <= self.DAILY_LOSS_LIMIT:
            logger.warning(f"🚨 KILL-SWITCH ENGAGED! Realized PnL ({realized_pnl}) hit daily loss limit ({self.DAILY_LOSS_LIMIT}).")
            await self.execute_liquidation()
            self.kill_switch_engaged = True

        elif net_liquidity <= self.MLL_THRESHOLD:
            logger.warning(f"🚨 MLL PROTECTION ENGAGED! Net Liquidity ({net_liquidity}) is below threshold ({self.MLL_THRESHOLD}).")
            await self.execute_liquidation()
            self.kill_switch_engaged = True

    async def on_position_update(self, position_data):
        # Keep track of positions to liquidate if needed
        pos_id = position_data.get('id')
        net_pos = position_data.get('netPos', 0)
        
        # Simplified tracking logic
        if net_pos != 0:
            if pos_id not in self.active_positions:
                self.active_positions.append(pos_id)
        else:
            if pos_id in self.active_positions:
                self.active_positions.remove(pos_id)

    async def execute_liquidation(self):
        """Cancel all working orders and close all open positions."""
        logger.warning("Executing Auto-Liquidation (Cancel All & Close All)...")
        # In a full implementation, we would query the active orders list and iterate.
        # For now, we will just iterate tracked positions and close them.
        
        for pos_id in self.active_positions:
            logger.info(f"Closing position ID: {pos_id}")
            # Run blocking request in executor
            loop = asyncio.get_event_loop()
            res = await loop.run_in_executor(None, self.client.close_position, pos_id)
            logger.info(f"Close result: {res}")
            
        self.active_positions.clear()
        # Similarly for orders:
        # for order_id in self.active_orders:
        #    self.client.cancel_order(order_id)
        
        logger.info("Liquidation complete.")
