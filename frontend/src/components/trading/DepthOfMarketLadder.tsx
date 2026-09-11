import React, { useState, useEffect } from 'react';
import { soundEffects } from '../../utils/audioEffects';

interface DepthOfMarketLadderProps {
  symbol: string;
  currentPrice: number;
  onQuickOrder: (side: 'BUY' | 'SELL', price: number) => void;
}

interface LadderRow {
  price: number;
  bidVol: number;
  askVol: number;
  isSpread: boolean;
}

export const DepthOfMarketLadder: React.FC<DepthOfMarketLadderProps> = ({
  symbol,
  currentPrice,
  onQuickOrder,
}) => {
  const [rows, setRows] = useState<LadderRow[]>([]);
  const tickSize = symbol === 'NQ' || symbol === 'MNQ' ? 0.25 : 0.25;

  // Build 11 rows around the current price
  useEffect(() => {
    if (currentPrice <= 0) return;

    const basePrice = Math.round(currentPrice / tickSize) * tickSize;
    const newRows: LadderRow[] = [];

    for (let i = 5; i >= -5; i--) {
      const p = Math.round((basePrice + i * tickSize) * 100) / 100;
      const isAbove = p > currentPrice;
      const isBelow = p < currentPrice;

      newRows.push({
        price: p,
        askVol: isAbove ? Math.floor(Math.random() * 45 + 12) : 0,
        bidVol: isBelow ? Math.floor(Math.random() * 50 + 15) : 0,
        isSpread: Math.abs(p - currentPrice) < tickSize,
      });
    }

    setRows(newRows);

    // Micro flickering of order book sizes
    const interval = setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.askVol > 0) {
            const delta = Math.floor((Math.random() - 0.48) * 6);
            return { ...r, askVol: Math.max(5, r.askVol + delta) };
          }
          if (r.bidVol > 0) {
            const delta = Math.floor((Math.random() - 0.48) * 6);
            return { ...r, bidVol: Math.max(5, r.bidVol + delta) };
          }
          return r;
        })
      );
    }, 1400);

    return () => clearInterval(interval);
  }, [currentPrice, symbol, tickSize]);

  return (
    <div className="panel-card dom-ladder-panel">
      <div className="dom-header">
        <div className="dom-title-row">
          <span className="dom-badge">LEVEL II DOM</span>
          <h4>Libro de Órdenes & Profundidad (CME)</h4>
        </div>
        <span className="dom-symbol-tag">{symbol} Depth</span>
      </div>

      <div className="dom-table">
        <div className="dom-table-head">
          <span>BID VOL</span>
          <span>PRECIO</span>
          <span>ASK VOL</span>
          <span>ACCIÓN</span>
        </div>

        <div className="dom-table-body">
          {rows.map((row) => {
            const isCurrent = row.isSpread;
            const maxVol = 60;
            const bidPct = Math.min(100, Math.round((row.bidVol / maxVol) * 100));
            const askPct = Math.min(100, Math.round((row.askVol / maxVol) * 100));

            return (
              <div
                key={row.price}
                className={`dom-row ${isCurrent ? 'current-market-row' : ''}`}
              >
                {/* Bid Volume Bar */}
                <div className="dom-cell bid-cell">
                  {row.bidVol > 0 && (
                    <>
                      <div className="vol-fill bid-fill" style={{ width: `${bidPct}%` }} />
                      <span className="vol-number">{row.bidVol}</span>
                    </>
                  )}
                </div>

                {/* Price Label */}
                <div className="dom-cell price-cell">
                  <span className={`ladder-price ${isCurrent ? 'price-active' : ''}`}>
                    {row.price.toFixed(2)}
                  </span>
                  {isCurrent && <span className="market-marker">LAST</span>}
                </div>

                {/* Ask Volume Bar */}
                <div className="dom-cell ask-cell">
                  {row.askVol > 0 && (
                    <>
                      <div className="vol-fill ask-fill" style={{ width: `${askPct}%` }} />
                      <span className="vol-number">{row.askVol}</span>
                    </>
                  )}
                </div>

                {/* 1-Click Quick Execution on Price */}
                <div className="dom-cell action-cell">
                  {row.price <= currentPrice ? (
                    <button
                      type="button"
                      className="dom-order-btn buy"
                      onClick={() => {
                        onQuickOrder('BUY', row.price);
                        soundEffects.playOrderPlaced();
                      }}
                      title={`Comprar 1 ${symbol} @ ${row.price.toFixed(2)}`}
                    >
                      BUY
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dom-order-btn sell"
                      onClick={() => {
                        onQuickOrder('SELL', row.price);
                        soundEffects.playOrderPlaced();
                      }}
                      title={`Vender 1 ${symbol} @ ${row.price.toFixed(2)}`}
                    >
                      SELL
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
