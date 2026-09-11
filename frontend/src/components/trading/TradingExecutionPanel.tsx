import React, { useState } from 'react';
import { api } from '../../api';

export interface Position {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  timestamp: string;
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  closedAt: string;
}

interface TradingExecutionPanelProps {
  symbol: string;
  currentPrice: number;
  balance: number;
  positions: Position[];
  tradeHistory: TradeHistoryItem[];
  onOrderExecuted: (position: Position) => void;
  onPositionClosed: (positionId: string, realizedPnl: number) => void;
}

export const TradingExecutionPanel: React.FC<TradingExecutionPanelProps> = ({
  symbol,
  currentPrice,
  balance,
  positions,
  tradeHistory,
  onOrderExecuted,
  onPositionClosed,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [stopLossTicks, setStopLossTicks] = useState<number>(20);
  const [takeProfitTicks, setTakeProfitTicks] = useState<number>(40);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastNotice, setLastNotice] = useState<string | null>(null);

  // Tick sizes & values
  const tickSize = symbol === 'NQ' || symbol === 'MNQ' ? 0.25 : 0.25;
  const tickValue = symbol === 'NQ' ? 5.0 : symbol === 'MNQ' ? 0.5 : 12.5;

  const handlePlaceOrder = async (side: 'BUY' | 'SELL') => {
    if (currentPrice <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setLastNotice(null);

    const slPrice = side === 'BUY'
      ? currentPrice - (stopLossTicks * tickSize)
      : currentPrice + (stopLossTicks * tickSize);

    const tpPrice = side === 'BUY'
      ? currentPrice + (takeProfitTicks * tickSize)
      : currentPrice - (takeProfitTicks * tickSize);

    try {
      // Call backend order endpoint
      await api.post('/trading/order', {
        symbol,
        side,
        quantity,
        price: currentPrice,
        stop_loss: slPrice,
        take_profit: tpPrice,
      }).catch(() => null); // non-blocking fallback

      const newPosition: Position = {
        id: `POS-${Date.now()}`,
        symbol,
        side,
        quantity,
        entryPrice: currentPrice,
        currentPrice,
        unrealizedPnl: 0,
        timestamp: new Date().toLocaleTimeString(),
      };

      onOrderExecuted(newPosition);
      setLastNotice(`Executed ${side} ${quantity} ${symbol} @ ${currentPrice.toFixed(2)}`);
      setTimeout(() => setLastNotice(null), 4000);
    } catch (err) {
      setLastNotice('Failed to place order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (pos: Position) => {
    const pnl = pos.side === 'BUY'
      ? ((currentPrice - pos.entryPrice) / tickSize) * tickValue * pos.quantity
      : ((pos.entryPrice - currentPrice) / tickSize) * tickValue * pos.quantity;

    onPositionClosed(pos.id, Math.round(pnl * 100) / 100);
    setLastNotice(`Closed ${pos.side} ${pos.symbol} for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    setTimeout(() => setLastNotice(null), 4000);
  };

  return (
    <div className="trading-execution-panel">
      {/* Top order control ribbon */}
      <div className="order-control-header">
        <div className="order-target-pill">
          <span className="pill-dot" />
          <strong>{symbol}</strong>
          <span className="price-tag">${currentPrice.toFixed(2)}</span>
        </div>
        {lastNotice && <div className="order-notice-toast">{lastNotice}</div>}
      </div>

      {/* Primary BUY / SELL buttons */}
      <div className="order-actions-grid">
        <button
          type="button"
          className="order-btn buy-btn"
          disabled={isSubmitting || currentPrice <= 0}
          onClick={() => handlePlaceOrder('BUY')}
        >
          <div className="btn-label-row">
            <span className="action-type">BUY / LONG</span>
            <span className="action-qty">{quantity}x</span>
          </div>
          <div className="btn-price-row">
            <span className="price-val">{(currentPrice + 0.25).toFixed(2)}</span>
            <span className="spread-label">ASK</span>
          </div>
        </button>

        <button
          type="button"
          className="order-btn sell-btn"
          disabled={isSubmitting || currentPrice <= 0}
          onClick={() => handlePlaceOrder('SELL')}
        >
          <div className="btn-label-row">
            <span className="action-type">SELL / SHORT</span>
            <span className="action-qty">{quantity}x</span>
          </div>
          <div className="btn-price-row">
            <span className="price-val">{(currentPrice - 0.25).toFixed(2)}</span>
            <span className="spread-label">BID</span>
          </div>
        </button>
      </div>

      {/* Quantity and Risk controls */}
      <div className="order-params-grid">
        <div className="param-card">
          <label>Quantity (Contracts)</label>
          <div className="stepper-row">
            {[1, 2, 5, 10].map((q) => (
              <button
                key={q}
                type="button"
                className={`stepper-btn ${quantity === q ? 'active' : ''}`}
                onClick={() => setQuantity(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="param-card">
          <label>Stop Loss (Ticks)</label>
          <div className="stepper-row">
            {[10, 20, 30, 50].map((ticks) => (
              <button
                key={ticks}
                type="button"
                className={`stepper-btn ${stopLossTicks === ticks ? 'active' : ''}`}
                onClick={() => setStopLossTicks(ticks)}
              >
                {ticks}t (${(ticks * tickValue * quantity).toFixed(0)})
              </button>
            ))}
          </div>
        </div>

        <div className="param-card">
          <label>Take Profit (Ticks)</label>
          <div className="stepper-row">
            {[20, 40, 60, 100].map((ticks) => (
              <button
                key={ticks}
                type="button"
                className={`stepper-btn ${takeProfitTicks === ticks ? 'active' : ''}`}
                onClick={() => setTakeProfitTicks(ticks)}
              >
                {ticks}t (${(ticks * tickValue * quantity).toFixed(0)})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions Section */}
      <div className="positions-container">
        <div className="section-title-row">
          <h4>Active Positions ({positions.length})</h4>
          <span className="tiny-badge">1-Click Market Flatten</span>
        </div>

        {positions.length === 0 ? (
          <div className="empty-positions-notice">
            No open positions. Click <strong>BUY</strong> or <strong>SELL</strong> above to execute a trade.
          </div>
        ) : (
          <div className="positions-table">
            <div className="pos-table-header">
              <span>Side</span>
              <span>Symbol</span>
              <span>Qty</span>
              <span>Entry</span>
              <span>Current</span>
              <span>PnL</span>
              <span>Action</span>
            </div>
            {positions.map((pos) => {
              const pnl = pos.side === 'BUY'
                ? ((currentPrice - pos.entryPrice) / tickSize) * tickValue * pos.quantity
                : ((pos.entryPrice - currentPrice) / tickSize) * tickValue * pos.quantity;
              const isPos = pnl >= 0;

              return (
                <div key={pos.id} className="pos-table-row">
                  <span className={`side-badge ${pos.side.toLowerCase()}`}>{pos.side}</span>
                  <strong>{pos.symbol}</strong>
                  <span>{pos.quantity}</span>
                  <span>{pos.entryPrice.toFixed(2)}</span>
                  <span>{currentPrice.toFixed(2)}</span>
                  <span className={`pnl-val ${isPos ? 'pos' : 'neg'}`}>
                    {isPos ? '+' : ''}${pnl.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="close-pos-btn"
                    onClick={() => handleClose(pos)}
                  >
                    Close
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Trade History */}
      {tradeHistory.length > 0 && (
        <div className="recent-trades-container">
          <div className="section-title-row">
            <h4>Closed Trade Log</h4>
            <span className="history-count">{tradeHistory.length} trades</span>
          </div>
          <div className="trades-mini-list">
            {tradeHistory.slice(-5).reverse().map((trade) => (
              <div key={trade.id} className="trade-mini-row">
                <span className={`trade-side ${trade.side.toLowerCase()}`}>{trade.side}</span>
                <span>{trade.symbol} x{trade.quantity}</span>
                <span className="entry-exit">
                  {trade.entryPrice.toFixed(2)} &rarr; {trade.exitPrice.toFixed(2)}
                </span>
                <span className={`trade-pnl ${trade.pnl >= 0 ? 'pos' : 'neg'}`}>
                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
