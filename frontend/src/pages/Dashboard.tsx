import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const DEFAULT_CONTRACTS = ['ES', 'NQ', 'YM', 'CL', 'GC'];

interface User {
  username: string;
  // Add other properties as needed based on the API response
}

interface TradePrompt {
  side: string;
  price: number;
  symbol: string;
  quantity: number;
}

interface MarketStructureSnapshot {
  divergences: any[];
  liquidity_sweeps: any[];
  fair_value_gaps: any[];
  supply_demand_zones: any[];
}

interface BacktestResult {
  trades: Array<{
    side: string;
    entry_time: string;
    exit_time: string;
    entry_price: number;
    exit_price: number;
    pnl: number;
  }>;
  total_pnl: number;
  wins: number;
  losses: number;
  signals: Record<string, number>;
  patterns: Record<string, number>;
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<string[]>(DEFAULT_CONTRACTS);
  const [contractNotice, setContractNotice] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>(DEFAULT_CONTRACTS[0]);
  const [logs, setLogs] = useState<string[]>([]);
  const [buyThreshold, setBuyThreshold] = useState<number>(30);
  const [sellThreshold, setSellThreshold] = useState<number>(70);
  const [autoTrade, setAutoTrade] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(0);
  const [pendingTrade, setPendingTrade] = useState<TradePrompt | null>(null);
  const [resolution, setResolution] = useState<string>('1');
  const [analysisStart, setAnalysisStart] = useState<string>(() => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [analysisEnd, setAnalysisEnd] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 16);
  });
  const [analysisResult, setAnalysisResult] = useState<MarketStructureSnapshot | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [backtestStatus, setBacktestStatus] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8000/auth/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response && err.response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('token');
          navigate('/');
        } else {
          console.error('An error occurred:', err);
          alert('An error occurred while fetching user data.');
        }
      });

    axios.get('http://localhost:8000/contracts')
      .then(res => {
        const symbols: string[] = res.data.contracts || [];
        const firstSymbol = symbols[0] || DEFAULT_CONTRACTS[0];

        setContracts(symbols.length ? symbols : DEFAULT_CONTRACTS);
        setSelectedSymbol(firstSymbol);
        if (res.data.error) {
          setContractNotice('Using fallback contracts: ' + res.data.error);
        } else if (res.data.source === 'fallback' || symbols.length === 0) {
          setContractNotice('Using fallback contracts until Topstep credentials are configured.');
        } else {
          setContractNotice('');
        }
      })
      .catch(err => {
        console.error('Failed to fetch contracts:', err);
        setContracts(DEFAULT_CONTRACTS);
        setSelectedSymbol(DEFAULT_CONTRACTS[0]);
        setContractNotice('Could not load contracts; showing fallback list.');
      });

    axios.get('http://localhost:8000/auth/rules', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        // API may return null if the user record predates rule columns
        const buy = res.data.buy_threshold ?? 30;
        const sell = res.data.sell_threshold ?? 70;
        setBuyThreshold(buy);
        setSellThreshold(sell);
      })
      .catch(err => {
        console.error('Failed to fetch rules:', err);
        // fallback to defaults if the request fails
        setBuyThreshold(30);
        setSellThreshold(70);
      });
  }, [navigate]);

  useEffect(() => {
    if (!eventSourceRef.current) return;
    if (countdown <= 0) {
      setCountdown(intervalSeconds);
      return;
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, intervalSeconds]);

  const unixFromLocal = (val: string) => Math.floor(new Date(val).getTime() / 1000);

  const renderPatternList = (label: string, items: any[], formatter?: (item: any) => string) => (
    <div className="pattern-block">
      <h4>{label}</h4>
      {items.length === 0 ? (
        <p className="muted">No matches in range.</p>
      ) : (
        <ul>
          {items.map((item, idx) => (
            <li key={`${label}-${idx}`}>{formatter ? formatter(item) : JSON.stringify(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="card dashboard-card">
        <header className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="header-right">
            <span>Welcome {user?.username}</span>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/');
              }}
            >
              Logout
            </button>
          </div>
        </header>
        <div className="dashboard-grid">
          <div className="controls">
            <div>
              <label htmlFor="contract-select">Contract:</label>
              <select
                id="contract-select"
                value={selectedSymbol}
                onChange={e => setSelectedSymbol(e.target.value)}
              >
                {contracts.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {contractNotice && <p className="inline-warning">{contractNotice}</p>}
            </div>
            <div className="rule-inputs">
              <div>
                <label htmlFor="resolution">TradingView Resolution:</label>
                <select
                  id="resolution"
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                >
                  <option value="1">1 minute</option>
                  <option value="3">3 minute</option>
                  <option value="5">5 minute</option>
                  <option value="15">15 minute</option>
                  <option value="60">1 hour</option>
                  <option value="D">Daily</option>
                </select>
              </div>
            </div>
            <div className="rule-inputs">
              <div>
                <label htmlFor="buy">Buy RSI below: </label>
                <input
                  id="buy"
                  type="number"
                  value={buyThreshold}
                  onChange={e => setBuyThreshold(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="sell">Sell RSI above: </label>
                <input
                  id="sell"
                  type="number"
                  value={sellThreshold}
                  onChange={e => setSellThreshold(Number(e.target.value))}
                />
              </div>
              <button
                onClick={() => {
                  axios
                    .put(
                      'http://localhost:8000/auth/rules',
                      {
                        buy_threshold: buyThreshold,
                        sell_threshold: sellThreshold
                      },
                      {
                        headers: {
                          Authorization: `Bearer ${localStorage.getItem('token')}`
                        }
                      }
                    )
                    .catch(err => console.error('Failed to update rules', err));
                  axios
                    .post('http://localhost:8000/scheduler/update-config', {
                      buy_threshold: buyThreshold,
                      sell_threshold: sellThreshold,
                      quantity,
                      interval_seconds: intervalSeconds
                    })
                    .catch(err => console.error('Failed to sync bot rules', err));
                }}
              >
                Save Rules
              </button>
            </div>
            <div className="rule-inputs">
              <div>
                <label htmlFor="quantity">Quantity: </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="interval">Interval Seconds: </label>
                <input
                  id="interval"
                  type="number"
                  value={intervalSeconds}
                  onChange={e => setIntervalSeconds(Number(e.target.value))}
                />
                <div className="interval-pills">
                  <button type="button" onClick={() => setIntervalSeconds(60)}>
                    1m
                  </button>
                  <button type="button" onClick={() => setIntervalSeconds(180)}>
                    3m
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="auto-toggle">Automated Trading</label>
              <input
                id="auto-toggle"
                type="checkbox"
                checked={autoTrade}
                onChange={e => {
                  const val = e.target.checked;
                  setAutoTrade(val);
                  axios
                    .post('http://localhost:8000/scheduler/update-config', {
                      auto_trade: val
                    })
                    .catch(err => console.error('Failed to update auto trade', err));
                }}
              />
            </div>
            <div className="button-row">
              <button
                onClick={() => {
                  if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                  }

                  const url = `http://localhost:8000/scheduler/run-bot?symbol=${encodeURIComponent(selectedSymbol)}&buy_threshold=${buyThreshold ?? 30}&sell_threshold=${sellThreshold ?? 70}&auto_trade=${autoTrade}&quantity=${quantity}&interval_seconds=${intervalSeconds}`;
                  const es = new EventSource(url);
                  eventSourceRef.current = es;
                  setLogs([]);
                  setCountdown(intervalSeconds);
                  es.onmessage = e => {
                    const msg = e.data;
                    try {
                      const obj = JSON.parse(msg);
                      if (obj.type === 'prompt') {
                        setPendingTrade(obj);
                        return;
                      }
                    } catch {
                      // not JSON, fall through
                    }

                    setLogs(prev => [...prev, msg]);

                    if (msg.includes('⏰ Fetching data')) {
                      setCountdown(intervalSeconds);
                    }
                  };
                  es.onerror = err => {
                    console.error('EventSource failed:', err);
                    es.close();
                    eventSourceRef.current = null;
                  };
                }}
              >
                Run Bot
              </button>
              <button
                onClick={() => {
                  if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                  }
                  axios
                    .post('http://localhost:8000/scheduler/stop-bot')
                    .catch(err => console.error('Failed to stop bot', err));
                  setCountdown(0);
                }}
              >
                Stop Bot
              </button>
            </div>
          </div>
          <pre className="logs">{logs.join('\n')}</pre>
          {countdown > 0 && (
            <p className="countdown">Next fetch in: {countdown}s</p>
          )}
        {pendingTrade && (
          <div className="prompt">
            <p>{`Signal ${pendingTrade.side} at ${pendingTrade.price}`}</p>
            <button
              onClick={() => {
                axios
                  .post('http://localhost:8000/scheduler/execute-trade', pendingTrade)
                  .then(() => setLogs(prev => [...prev, 'Manual trade executed']))
                  .catch(err => {
                    console.error('Manual trade failed', err);
                    setLogs(prev => [...prev, 'Manual trade failed']);
                  });
                setPendingTrade(null);
              }}
            >
              {pendingTrade.side}
            </button>
            <button onClick={() => setPendingTrade(null)}>Cancel</button>
          </div>
        )}
        </div>
        <div className="analysis-grid">
          <div className="card">
            <h3>Market Structure Analysis</h3>
            <div className="rule-inputs">
              <div>
                <label htmlFor="analysis-start">Start</label>
                <input
                  id="analysis-start"
                  type="datetime-local"
                  value={analysisStart}
                  onChange={e => setAnalysisStart(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="analysis-end">End</label>
                <input
                  id="analysis-end"
                  type="datetime-local"
                  value={analysisEnd}
                  onChange={e => setAnalysisEnd(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!analysisStart || !analysisEnd) {
                  alert('Please select a start and end time.');
                  return;
                }
                setAnalysisStatus('Loading market structure...');
                axios
                  .post('http://localhost:8000/analysis/market-analysis', {
                    symbol: selectedSymbol,
                    resolution,
                    start: unixFromLocal(analysisStart),
                    end: unixFromLocal(analysisEnd)
                  })
                  .then(res => {
                    setAnalysisResult(res.data);
                    setAnalysisStatus('');
                  })
                  .catch(err => {
                    console.error('Market analysis failed', err);
                    setAnalysisStatus('Unable to fetch analysis.');
                  });
              }}
            >
              Run Analysis
            </button>
            {analysisStatus && <p className="muted">{analysisStatus}</p>}
            {analysisResult && (
              <div className="analysis-results">
                {renderPatternList(
                  'Divergence Signals',
                  analysisResult.divergences,
                  item => `${item.divergence_type} between ${item.price1?.toFixed?.(2) ?? item.price1} and ${item.price2?.toFixed?.(2) ?? item.price2}`
                )}
                {renderPatternList(
                  'Liquidity Sweeps',
                  analysisResult.liquidity_sweeps,
                  item => `${item.side} sweep at ${item.sweep_price?.toFixed?.(2) ?? item.sweep_price}`
                )}
                {renderPatternList(
                  'Fair Value Gaps',
                  analysisResult.fair_value_gaps,
                  item => `${item.direction} gap ${item.start?.toFixed?.(2) ?? item.start} → ${item.end?.toFixed?.(2) ?? item.end}`
                )}
                {renderPatternList(
                  'Supply / Demand Zones',
                  analysisResult.supply_demand_zones,
                  item => `${item.type} ${item.lower?.toFixed?.(2) ?? item.lower} - ${item.upper?.toFixed?.(2) ?? item.upper}`
                )}
              </div>
            )}
          </div>
          <div className="card">
            <h3>RSI Strategy Backtest</h3>
            <p className="muted">
              Uses the same thresholds above to simulate historical performance with TradingView
              data.
            </p>
            <div className="rule-inputs">
              <div>
                <label htmlFor="backtest-start">Start</label>
                <input
                  id="backtest-start"
                  type="datetime-local"
                  value={analysisStart}
                  onChange={e => setAnalysisStart(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="backtest-end">End</label>
                <input
                  id="backtest-end"
                  type="datetime-local"
                  value={analysisEnd}
                  onChange={e => setAnalysisEnd(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!analysisStart || !analysisEnd) {
                  alert('Please select a start and end time.');
                  return;
                }
                setBacktestStatus('Running backtest...');
                axios
                  .post('http://localhost:8000/analysis/backtest', {
                    symbol: selectedSymbol,
                    resolution,
                    start: unixFromLocal(analysisStart),
                    end: unixFromLocal(analysisEnd),
                    buy_threshold: buyThreshold,
                    sell_threshold: sellThreshold
                  })
                  .then(res => {
                    setBacktestResult(res.data);
                    setBacktestStatus('');
                  })
                  .catch(err => {
                    console.error('Backtest failed', err);
                    setBacktestStatus('Unable to run backtest.');
                  });
              }}
            >
              Run Backtest
            </button>
            {backtestStatus && <p className="muted">{backtestStatus}</p>}
            {backtestResult && (
              <div className="backtest-results">
                <div className="result-row">
                  <div>
                    <h4>Performance</h4>
                    <p>Total PnL: {backtestResult.total_pnl.toFixed(2)}</p>
                    <p>
                      Wins: {backtestResult.wins} · Losses: {backtestResult.losses}
                    </p>
                  </div>
                  <div>
                    <h4>Signals</h4>
                    <p>Buys: {backtestResult.signals?.buy ?? 0}</p>
                    <p>Sells: {backtestResult.signals?.sell ?? 0}</p>
                    <p>Holds: {backtestResult.signals?.hold ?? 0}</p>
                  </div>
                  <div>
                    <h4>Patterns</h4>
                    <p>Divergences: {backtestResult.patterns?.divergences ?? 0}</p>
                    <p>Liquidity Sweeps: {backtestResult.patterns?.liquidity_sweeps ?? 0}</p>
                    <p>Fair Value Gaps: {backtestResult.patterns?.fair_value_gaps ?? 0}</p>
                    <p>Supply/Demand Zones: {backtestResult.patterns?.supply_demand_zones ?? 0}</p>
                  </div>
                </div>
                <div>
                  <h4>Trades</h4>
                  {backtestResult.trades.length === 0 ? (
                    <p className="muted">No trades executed in this window.</p>
                  ) : (
                    <table className="trade-table">
                      <thead>
                        <tr>
                          <th>Side</th>
                          <th>Entry</th>
                          <th>Exit</th>
                          <th>Entry Price</th>
                          <th>Exit Price</th>
                          <th>PnL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backtestResult.trades.map((trade, idx) => (
                          <tr key={`trade-${idx}`}>
                            <td>{trade.side}</td>
                            <td>{new Date(trade.entry_time).toLocaleString()}</td>
                            <td>{new Date(trade.exit_time).toLocaleString()}</td>
                            <td>{trade.entry_price.toFixed(2)}</td>
                            <td>{trade.exit_price.toFixed(2)}</td>
                            <td className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                              {trade.pnl.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
  );
}

export default Dashboard;
