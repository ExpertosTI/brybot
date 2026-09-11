import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface BacktestCardProps {
  symbol: string;
  resolution: string;
}

export const BacktestCard: React.FC<BacktestCardProps> = ({ symbol, resolution }) => {
  const [result, setResult] = useState<{
    total_pnl: number;
    wins: number;
    losses: number;
    trades: any[];
    signals: { buy: number; sell: number; hold: number };
    patterns: any;
  } | null>(null);
  const [buyThreshold, setBuyThreshold] = useState(30);
  const [sellThreshold, setSellThreshold] = useState(70);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 3600 * 24 * 7; // 7 days
      const res = await api.post('/analysis/backtest', {
        symbol,
        resolution,
        start,
        end: now,
        buy_threshold: buyThreshold,
        sell_threshold: sellThreshold,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to execute backtest.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [symbol, resolution]);

  const totalTrades = (result?.wins ?? 0) + (result?.losses ?? 0);
  const winRate = totalTrades > 0 ? Math.round(((result?.wins ?? 0) / totalTrades) * 100) : 0;
  const pnl = result?.total_pnl ?? 0;

  return (
    <div className="panel-card backtest-card">
      <div className="panel-header">
        <div className="header-left">
          <span className="panel-eyebrow">QUANT ENGINE</span>
          <h3>Algorithmic Backtest ({symbol})</h3>
        </div>
        <button
          type="button"
          className="run-backtest-btn"
          onClick={runSimulation}
          disabled={loading}
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      <div className="backtest-controls-row">
        <div className="slider-group">
          <label>RSI Oversold Buy: <strong>{buyThreshold}</strong></label>
          <input
            type="range"
            min="15"
            max="45"
            value={buyThreshold}
            onChange={(e) => setBuyThreshold(Number(e.target.value))}
          />
        </div>
        <div className="slider-group">
          <label>RSI Overbought Sell: <strong>{sellThreshold}</strong></label>
          <input
            type="range"
            min="55"
            max="85"
            value={sellThreshold}
            onChange={(e) => setSellThreshold(Number(e.target.value))}
          />
        </div>
      </div>

      {error && <div className="inline-alert danger">{error}</div>}

      <div className="backtest-stats-grid">
        <div className="b-stat-box">
          <span className="b-stat-label">SIMULATED P&L</span>
          <span className={`b-stat-val ${pnl >= 0 ? 'pos' : 'neg'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </span>
        </div>

        <div className="b-stat-box">
          <span className="b-stat-label">WIN RATE</span>
          <span className="b-stat-val text-emerald">{winRate}%</span>
        </div>

        <div className="b-stat-box">
          <span className="b-stat-label">TOTAL TRADES</span>
          <span className="b-stat-val">{totalTrades}</span>
        </div>

        <div className="b-stat-box">
          <span className="b-stat-label">WINS / LOSSES</span>
          <span className="b-stat-val">
            <span className="pos">{result?.wins ?? 0}W</span> / <span className="neg">{result?.losses ?? 0}L</span>
          </span>
        </div>
      </div>

      {result?.trades && result.trades.length > 0 && (
        <div className="backtest-trades-scroll">
          <div className="mini-trade-table">
            <div className="table-row-head">
              <span>Side</span>
              <span>Entry</span>
              <span>Exit</span>
              <span>P&L</span>
            </div>
            {result.trades.slice(0, 5).map((t: any, idx: number) => (
              <div key={idx} className="table-row-item">
                <span className={`side-badge ${t.side.toLowerCase()}`}>{t.side}</span>
                <span>{typeof t.entry_price === 'number' ? t.entry_price.toFixed(2) : t.entry_price}</span>
                <span>{typeof t.exit_price === 'number' ? t.exit_price.toFixed(2) : t.exit_price}</span>
                <span className={`pnl-val ${t.pnl >= 0 ? 'pos' : 'neg'}`}>
                  {t.pnl >= 0 ? '+' : ''}${typeof t.pnl === 'number' ? t.pnl.toFixed(2) : t.pnl}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
