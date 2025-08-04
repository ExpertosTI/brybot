import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [buyThreshold, setBuyThreshold] = useState<number>(30);
  const [sellThreshold, setSellThreshold] = useState<number>(70);
  const [autoTrade, setAutoTrade] = useState<boolean>(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(0);
  const [pendingTrade, setPendingTrade] = useState<TradePrompt | null>(null);
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
        setContracts(res.data.contracts);
        if (res.data.contracts.length > 0) {
          setSelectedSymbol(res.data.contracts[0]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch contracts:', err);
        alert('Could not load contracts list.');
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
  }, []);

  useEffect(() => {
    if (!eventSourceRef.current) return;
    if (countdown <= 0) {
      setCountdown(intervalSeconds);
      return;
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, intervalSeconds]);

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
      </div>
      </div>
  );
}

export default Dashboard;
