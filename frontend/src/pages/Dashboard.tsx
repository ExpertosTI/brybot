import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { TopBar } from '../components/layout/TopBar';
import { AccountMetricsBar } from '../components/trading/AccountMetricsBar';
import { CandlestickChart } from '../components/trading/CandlestickChart';
import { TradingExecutionPanel, Position, TradeHistoryItem } from '../components/trading/TradingExecutionPanel';
import { MarketStructureCard } from '../components/analytics/MarketStructureCard';
import { BacktestCard } from '../components/analytics/BacktestCard';
import { ActivityFeed, ActivityEvent } from '../components/common/ActivityFeed';

export function Dashboard() {
  const navigate = useNavigate();

  // Primary state: Default to NASDAQ (NQ) as requested!
  const [symbol, setSymbol] = useState<string>('NQ');
  const [resolution, setResolution] = useState<string>('1');
  const [currentPrice, setCurrentPrice] = useState<number>(19750.0);
  const [priceChange, setPriceChange] = useState<number>(0.35);
  const [user, setUser] = useState<{ username: string } | null>(null);

  // Financial & Position State
  const [balance, setBalance] = useState<number>(100000.0);
  const [realizedPnl, setRealizedPnl] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [isBotRunning, setIsBotRunning] = useState<boolean>(true);

  // Chart Markers & Events
  const [chartMarkers, setChartMarkers] = useState<any[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: '1',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'RENACE Institutional Trading Lab initialized. Connected to CME NASDAQ feed.',
    },
    {
      id: '2',
      time: new Date().toLocaleTimeString(),
      type: 'structure',
      message: 'ICT Matrix: Bullish Fair Value Gap (FVG) identified at 19,732.50.',
    },
    {
      id: '3',
      time: new Date().toLocaleTimeString(),
      type: 'alert',
      message: 'RSI Algorithm: Scanning NQ momentum cycles with 20/40 tick risk bracket.',
    },
  ]);

  // Auth verification
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true, state: { expired: true } });
      return;
    }

    api.get('/auth/me')
      .then((res) => {
        if (res.data) setUser(res.data);
      })
      .catch(() => {
        // demo fallback
        setUser({ username: 'demo_trader' });
      });
  }, [navigate]);

  // Handle live price updates from chart ticks
  const handlePriceUpdate = useCallback((price: number, change: number) => {
    setCurrentPrice(price);
    setPriceChange(change);

    // Live update unrealized PnL for active positions
    setPositions((prev) =>
      prev.map((pos) => {
        const tickSize = pos.symbol === 'NQ' || pos.symbol === 'MNQ' ? 0.25 : 0.25;
        const tickValue = pos.symbol === 'NQ' ? 5.0 : pos.symbol === 'MNQ' ? 0.5 : 12.5;
        const pnl = pos.side === 'BUY'
          ? ((price - pos.entryPrice) / tickSize) * tickValue * pos.quantity
          : ((pos.entryPrice - price) / tickSize) * tickValue * pos.quantity;
        return { ...pos, currentPrice: price, unrealizedPnl: Math.round(pnl * 100) / 100 };
      })
    );
  }, []);

  // Compute total unrealized PnL
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);

  // Handle Order Executed
  const handleOrderExecuted = (newPos: Position) => {
    setPositions((prev) => [...prev, newPos]);

    // Add marker to chart
    const nowTs = Math.floor(Date.now() / 1000);
    setChartMarkers((prev) => [
      ...prev,
      {
        time: nowTs,
        position: newPos.side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: newPos.side === 'BUY' ? '#00e68a' : '#ff4d6a',
        shape: newPos.side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${newPos.side} ${newPos.quantity}x @ ${newPos.entryPrice.toFixed(2)}`,
      },
    ]);

    // Add activity event
    setEvents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'trade',
        message: `Order Executed: ${newPos.side} ${newPos.quantity} ${newPos.symbol} at ${newPos.entryPrice.toFixed(2)}`,
      },
    ]);
  };

  // Handle Position Closed
  const handlePositionClosed = (positionId: string, pnl: number) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setRealizedPnl((prev) => Math.round((prev + pnl) * 100) / 100);

    const closedItem: TradeHistoryItem = {
      id: `TR-${Date.now()}`,
      symbol: pos.symbol,
      side: pos.side,
      quantity: pos.quantity,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
      pnl,
      closedAt: new Date().toLocaleTimeString(),
    };

    setTradeHistory((prev) => [...prev, closedItem]);

    setEvents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'trade',
        message: `Position Closed: ${pos.side} ${pos.symbol} for ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
      },
    ]);
  };

  // Bot algorithmic signals simulator
  useEffect(() => {
    if (!isBotRunning) return;

    const botInterval = setInterval(() => {
      // 20% chance every 15s of algorithmic signal
      if (Math.random() < 0.25) {
        const sides: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];
        const randomSide = sides[Math.floor(Math.random() * sides.length)];
        setEvents((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            type: 'structure',
            message: `Algorithmic Alert: ${randomSide} trigger criteria met on ${symbol} (RSI exhaustion + liquidity sweep).`,
          },
        ]);
      }
    }, 15000);

    return () => clearInterval(botInterval);
  }, [isBotRunning, symbol]);

  return (
    <div className="lab-dashboard-shell">
      {/* 1. Institutional Top Navigation */}
      <TopBar
        symbol={symbol}
        currentPrice={currentPrice}
        priceChange={priceChange}
        user={user}
      />

      {/* 2. Account & Risk Management Bar */}
      <AccountMetricsBar
        balance={balance}
        realizedPnl={realizedPnl}
        unrealizedPnl={totalUnrealizedPnl}
        symbol={symbol}
        resolution={resolution}
        onSelectSymbol={(sym) => setSymbol(sym)}
        onSelectResolution={(res) => setResolution(res)}
        isBotRunning={isBotRunning}
        onToggleBot={() => setIsBotRunning(!isBotRunning)}
      />

      {/* 3. Main Trading Workspace Layout */}
      <main className="trading-workspace-grid">
        {/* Left Column: Primary Chart & Quantitative Analytics */}
        <section className="workspace-main-column">
          {/* Real Candlestick Chart */}
          <CandlestickChart
            symbol={symbol}
            resolution={resolution}
            onPriceUpdate={handlePriceUpdate}
            markers={chartMarkers}
          />

          {/* Analytics Dual Grid */}
          <div className="analytics-dual-grid">
            <MarketStructureCard symbol={symbol} resolution={resolution} />
            <BacktestCard symbol={symbol} resolution={resolution} />
          </div>
        </section>

        {/* Right Column: Active Order Panel & Telemetry Stream */}
        <aside className="workspace-sidebar-column">
          <TradingExecutionPanel
            symbol={symbol}
            currentPrice={currentPrice}
            balance={balance}
            positions={positions}
            tradeHistory={tradeHistory}
            onOrderExecuted={handleOrderExecuted}
            onPositionClosed={handlePositionClosed}
          />

          <ActivityFeed
            events={events}
            onClear={() => setEvents([])}
          />
        </aside>
      </main>
    </div>
  );
}

export default Dashboard;
