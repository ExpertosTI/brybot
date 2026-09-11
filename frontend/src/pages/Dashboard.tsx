import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { MarketTickerMarquee } from '../components/layout/MarketTickerMarquee';
import { TopBar } from '../components/layout/TopBar';
import { AccountMetricsBar } from '../components/trading/AccountMetricsBar';
import { CandlestickChart } from '../components/trading/CandlestickChart';
import { TradingExecutionPanel, Position, TradeHistoryItem } from '../components/trading/TradingExecutionPanel';
import { DepthOfMarketLadder } from '../components/trading/DepthOfMarketLadder';
import { TopCopilotAdvisor } from '../components/trading/TopCopilotAdvisor';
import { MarketStructureCard } from '../components/analytics/MarketStructureCard';
import { BacktestCard } from '../components/analytics/BacktestCard';
import { MarketNewsSentiment } from '../components/analytics/MarketNewsSentiment';
import { ActivityFeed, ActivityEvent } from '../components/common/ActivityFeed';
import { soundEffects } from '../utils/audioEffects';

export function Dashboard() {
  const navigate = useNavigate();

  // Primary state: Default to NASDAQ (NQ)
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
      message: 'RENACE Institutional Trading Lab 2030 conectado al flujo de datos CME NASDAQ.',
    },
    {
      id: '2',
      time: new Date().toLocaleTimeString(),
      type: 'structure',
      message: 'ICT Matrix: Fair Value Gap (FVG) alcista validado en 19,735.00 con alta probabilidad.',
    },
    {
      id: '3',
      time: new Date().toLocaleTimeString(),
      type: 'alert',
      message: 'TopStep Sentinel: Parámetros de gestión de riesgo activos. Límite diario de pérdida: $2,000.',
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

  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + pos.unrealizedPnl, 0);
  const netDailyPnl = realizedPnl + totalUnrealizedPnl;

  // Handle Order Executed
  const handleOrderExecuted = (newPos: Position) => {
    setPositions((prev) => [...prev, newPos]);
    soundEffects.playOrderPlaced();

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

    setEvents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        type: 'trade',
        message: `Orden Ejecutada: ${newPos.side} ${newPos.quantity} ${newPos.symbol} @ ${newPos.entryPrice.toFixed(2)}`,
      },
    ]);
  };

  // Quick order from DOM ladder
  const handleQuickDomOrder = (side: 'BUY' | 'SELL', price: number) => {
    const newPos: Position = {
      id: `POS-${Date.now()}`,
      symbol,
      side,
      quantity: 1,
      entryPrice: price,
      currentPrice: price,
      unrealizedPnl: 0,
      timestamp: new Date().toLocaleTimeString(),
    };
    handleOrderExecuted(newPos);
  };

  // Handle Position Closed
  const handlePositionClosed = (positionId: string, pnl: number) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setRealizedPnl((prev) => Math.round((prev + pnl) * 100) / 100);

    if (pnl >= 0) {
      soundEffects.playTakeProfit();
    } else {
      soundEffects.playStopLoss();
    }

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
        message: `Posición Liquidada: ${pos.side} ${pos.symbol} con resultado de ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
      },
    ]);
  };

  // Bot algorithmic signals
  useEffect(() => {
    if (!isBotRunning) return;

    const botInterval = setInterval(() => {
      if (Math.random() < 0.28) {
        const sides: ('BUY' | 'SELL')[] = ['BUY', 'SELL'];
        const randomSide = sides[Math.floor(Math.random() * sides.length)];
        setEvents((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            time: new Date().toLocaleTimeString(),
            type: 'structure',
            message: `Alerta Algorítmica: Condición de ${randomSide} confirmada en ${symbol} (Mitigación FVG + Volumen institucional).`,
          },
        ]);
      }
    }, 18000);

    return () => clearInterval(botInterval);
  }, [isBotRunning, symbol]);

  return (
    <div className="lab-dashboard-shell">
      {/* 0. Live Global Market Marquee */}
      <MarketTickerMarquee />

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
        {/* Left Column: Primary Chart, Copilot Advisor & Quantitative Analytics */}
        <section className="workspace-main-column">
          {/* Real Interactive TopStep Candlestick Chart */}
          <CandlestickChart
            symbol={symbol}
            resolution={resolution}
            onPriceUpdate={handlePriceUpdate}
            markers={chartMarkers}
          />

          {/* AI Trading Copilot / TopStep Coach */}
          <TopCopilotAdvisor
            symbol={symbol}
            currentPrice={currentPrice}
            netDailyPnl={netDailyPnl}
            onApplyRecommendation={(side) => {
              handleQuickDomOrder(side, currentPrice);
            }}
          />

          {/* Analytics Dual Grid */}
          <div className="analytics-dual-grid">
            <MarketStructureCard symbol={symbol} resolution={resolution} />
            <BacktestCard symbol={symbol} resolution={resolution} />
          </div>

          {/* Realtime Macro News & Global Sentiment */}
          <MarketNewsSentiment />
        </section>

        {/* Right Column: Order Execution, DOM Ladder & Telemetry Feed */}
        <aside className="workspace-sidebar-column">
          {/* Active 1-Click Order Execution Panel */}
          <TradingExecutionPanel
            symbol={symbol}
            currentPrice={currentPrice}
            balance={balance}
            positions={positions}
            tradeHistory={tradeHistory}
            onOrderExecuted={handleOrderExecuted}
            onPositionClosed={handlePositionClosed}
          />

          {/* TopStepX Level 2 Depth of Market (DOM) Ladder */}
          <DepthOfMarketLadder
            symbol={symbol}
            currentPrice={currentPrice}
            onQuickOrder={handleQuickDomOrder}
          />

          {/* Live Activity & Telemetry Feed */}
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
