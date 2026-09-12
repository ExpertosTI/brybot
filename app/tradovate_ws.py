import asyncio
import websockets
import json
import logging
from app.tradovate_client import TradovateClient

logger = logging.getLogger(__name__)

class TradovateWebSocketManager:
    def __init__(self, env="demo"):
        self.env = env
        if env == "demo":
            self.trading_ws_url = "wss://demo.tradovateapi.com/v1/websocket"
            self.md_ws_url = "wss://md-demo.tradovateapi.com/v1/websocket"
        else:
            self.trading_ws_url = "wss://live.tradovateapi.com/v1/websocket"
            self.md_ws_url = "wss://md.tradovateapi.com/v1/websocket"

        self.client = TradovateClient(env)
        self.trading_ws = None
        self.md_ws = None
        self.msg_id = 1
        
        # Callbacks for specific events
        self.on_account_update = None
        self.on_position_update = None
        self.on_md_update = None

    def _get_next_id(self):
        self.msg_id += 1
        return self.msg_id

    async def _handle_heartbeat(self, ws, message):
        """Tradovate SockJS heartbeat mechanism"""
        if message == 'o':
            # SockJS connection opened
            return True
        elif message == 'h':
            # SockJS heartbeat from server
            return True
        elif message == 'c':
            # SockJS closed
            return True
        elif message.startswith('a['):
            # Normal data message wrapper
            return False
        return False

    async def _auth_ws(self, ws):
        token = self.client.get_access_token()
        if not token:
            logger.error("Could not obtain access token for WS auth.")
            return False

        auth_payload = json.dumps({"accessToken": token})
        auth_frame = f"authorize\n{self._get_next_id()}\n\n{auth_payload}"
        await ws.send(auth_frame)
        logger.info("Sent authorize frame to Tradovate WS.")
        return True

    async def start_trading_ws(self):
        """Connects to the Trading & Account WS"""
        while True:
            try:
                async with websockets.connect(self.trading_ws_url) as ws:
                    self.trading_ws = ws
                    logger.info("Connected to Trading WS.")
                    
                    if not await self._auth_ws(ws):
                        await asyncio.sleep(5)
                        continue

                    async for message in ws:
                        if await self._handle_heartbeat(ws, message):
                            continue
                        
                        # Process real messages
                        if message.startswith('a['):
                            data_str = json.loads(message[1:])[0]
                            # Tradovate messages can be strings that are json encoded, or json containing events
                            if 'e' in data_str and 'd' in data_str:
                                event = data_str['e']
                                payload = data_str['d']
                                
                                if event == 'props':
                                    if payload.get('entityType') == 'account' and self.on_account_update:
                                        await self.on_account_update(payload['entity'])
                                    elif payload.get('entityType') == 'position' and self.on_position_update:
                                        await self.on_position_update(payload['entity'])
                                        
            except Exception as e:
                logger.error(f"Trading WS Connection Error: {e}")
                await asyncio.sleep(5)

    async def start_md_ws(self, symbols=None):
        """Connects to Market Data WS"""
        if not symbols:
            symbols = ["MESZ6"]

        while True:
            try:
                async with websockets.connect(self.md_ws_url) as ws:
                    self.md_ws = ws
                    logger.info("Connected to MD WS.")
                    
                    if not await self._auth_ws(ws):
                        await asyncio.sleep(5)
                        continue

                    # Subscribe to quotes
                    for symbol in symbols:
                        sub_payload = json.dumps({"symbol": symbol})
                        sub_frame = f"md/subscribeQuote\n{self._get_next_id()}\n\n{sub_payload}"
                        await ws.send(sub_frame)
                        logger.info(f"Subscribed to {symbol} quotes.")

                    async for message in ws:
                        if await self._handle_heartbeat(ws, message):
                            continue
                        
                        if message.startswith('a['):
                            data_str = json.loads(message[1:])[0]
                            if 'e' in data_str and data_str['e'] == 'md' and self.on_md_update:
                                await self.on_md_update(data_str['d'])
                                
            except Exception as e:
                logger.error(f"MD WS Connection Error: {e}")
                await asyncio.sleep(5)

    def subscribe_account_updates(self, callback):
        self.on_account_update = callback

    def subscribe_position_updates(self, callback):
        self.on_position_update = callback

    def subscribe_md_updates(self, callback):
        self.on_md_update = callback
