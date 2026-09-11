import React from 'react';

interface AccountMetricsBarProps {
  balance: number;
  realizedPnl: number;
  unrealizedPnl: number;
  symbol: string;
  resolution: string;
  onSelectSymbol: (symbol: string) => void;
  onSelectResolution: (res: string) => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
}

const AVAILABLE_SYMBOLS = [
  { key: 'NQ', name: 'NASDAQ 100', category: 'Indices' },
  { key: 'MNQ', name: 'Micro NQ', category: 'Indices' },
  { key: 'ES', name: 'S&P 500', category: 'Indices' },
  { key: 'GC', name: 'Gold', category: 'Metals' },
  { key: 'BTC', name: 'Bitcoin', category: 'Crypto' },
];

const RESOLUTIONS = [
  { key: '1', label: '1m' },
  { key: '5', label: '5m' },
  { key: '15', label: '15m' },
  { key: '60', label: '1h' },
  { key: 'D', label: '1D' },
];

export const AccountMetricsBar: React.FC<AccountMetricsBarProps> = ({
  balance,
  realizedPnl,
  unrealizedPnl,
  symbol,
  resolution,
  onSelectSymbol,
  onSelectResolution,
  isBotRunning,
  onToggleBot,
}) => {
  const totalEquity = balance + realizedPnl + unrealizedPnl;
  const netDailyPnl = realizedPnl + unrealizedPnl;
  const isProfit = netDailyPnl >= 0;
  const dailyLossLimit = 2000;
  const currentDrawdown = netDailyPnl < 0 ? Math.abs(netDailyPnl) : 0;
  const drawdownPct = Math.min(100, Math.round((currentDrawdown / dailyLossLimit) * 100));

  return (
    <div className="account-metrics-bar">
      {/* Symbol & Timeframe selectors */}
      <div className="bar-left-controls">
        <div className="symbol-selector-pills">
          {AVAILABLE_SYMBOLS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`symbol-pill ${symbol === s.key ? 'active' : ''}`}
              onClick={() => onSelectSymbol(s.key)}
            >
              <span className="sym-key">{s.key}</span>
              <span className="sym-cat">{s.name}</span>
            </button>
          ))}
        </div>

        <div className="timeframe-selector-pills">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`tf-pill ${resolution === r.key ? 'active' : ''}`}
              onClick={() => onSelectResolution(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account stats */}
      <div className="bar-right-metrics">
        <div className="metric-box">
          <span className="metric-label">ACCOUNT EQUITY</span>
          <span className="metric-value equity">
            ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">TODAY'S P&L</span>
          <span className={`metric-value ${isProfit ? 'pos' : 'neg'}`}>
            {isProfit ? '+' : ''}${netDailyPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="metric-box drawdown-box">
          <div className="drawdown-header">
            <span className="metric-label">MAX DAILY LOSS ($2,000)</span>
            <span className="dd-pct">{drawdownPct}%</span>
          </div>
          <div className="drawdown-meter">
            <div
              className={`drawdown-fill ${drawdownPct > 75 ? 'danger' : drawdownPct > 40 ? 'warning' : 'safe'}`}
              style={{ width: `${drawdownPct}%` }}
            />
          </div>
        </div>

        {/* Bot Engine Toggle */}
        <button
          type="button"
          className={`bot-toggle-btn ${isBotRunning ? 'running' : 'idle'}`}
          onClick={onToggleBot}
        >
          <span className="pulse-indicator" />
          <span className="bot-btn-text">
            {isBotRunning ? 'BOT: ACTIVE' : 'BOT: PAUSED'}
          </span>
        </button>
      </div>
    </div>
  );
};
