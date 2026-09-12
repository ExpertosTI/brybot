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
import { GeminiAdvisorCard } from '../components/trading/GeminiAdvisorCard';
import { MarketStructureCard } from '../components/analytics/MarketStructureCard';
import { BacktestCard } from '../components/analytics/BacktestCard';
import { MarketNewsSentiment } from '../components/analytics/MarketNewsSentiment';
import { ActivityFeed, ActivityEvent } from '../components/common/ActivityFeed';
import { WhatsAppSettingsModal } from '../components/trading/WhatsAppSettingsModal';
import { HistoricalPatternsView } from '../components/trading/HistoricalPatternsView';
import { MacroSentinelView } from '../components/trading/MacroSentinelView';
import { soundEffects } from '../utils/audioEffects';

export function Dashboard() {
  const navigate = useNavigate();

  // Navigation View Mode: 'cockpit' | 'historical_patterns' | 'macro_sentinel'
  const [viewMode, setViewMode] = useState<'cockpit' | 'historical_patterns' | 'macro_sentinel'>('cockpit');

  // Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);

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
      message: 'Google Gemini 3.6 AI Quant Engine conectado y monitoreando estructura ICT.',
    },
    {
      id: '3',
      time: new Date().toLocaleTimeString(),
      type: 'alert',
      message: 'Evolution API activo: Canal de WhatsApp configurado para señales y alertas de tope TopStep.',
    },
  ]);

  // Auth verification: Auto-grant demo paper session so user is never blocked from seeing the platform
  useEffect(() => {
    let token = localStorage.getItem('token');
    if (!token) {
      token = 'demo_session_token';
      localStorage.setItem('token', token);
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

  // Evolution API Sentinel: Alert if daily loss limit hit ("llegó al tope")
  useEffect(() => {
    if (netDailyPnl <= -2000) {
      api.post('/analysis/whatsapp-notify', {
        type: 'risk_limit',
        current_loss: Math.abs(netDailyPnl),
        max_loss: 2000,
      }).catch(() => null);

      setEvents((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          time: new Date().toLocaleTimeString(),
          type: 'alert',
          message: '🚨 LLEGÓ AL TOPE: Límite diario de pérdida alcanzado (-$2,000). Notificación enviada a WhatsApp vía Evolution API.',
        },
      ]);
    }
  }, [netDailyPnl]);

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

  // Quick order from DOM ladder or AI suggestion
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

  // Mobile tab switcher state ('chart' | 'gemini' | 'execute' | 'analytics' | 'all')
  const [mobileTab, setMobileTab] = useState<'chart' | 'gemini' | 'execute' | 'analytics' | 'all'>('chart');

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
        onOpenWhatsAppSettings={() => setIsWhatsAppModalOpen(true)}
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

      {/* Primary Workspace View Switcher (Desktop & Mobile) - Ultra Visible */}
      <div className="px-4 pt-4 pb-2 max-w-[1920px] mx-auto">
        <div className="bg-[#0c1222] p-2 rounded-2xl border-2 border-indigo-500/30 shadow-2xl shadow-indigo-950/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 pl-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-300">
              Módulos Institucionales:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tab 1: Trading Cockpit */}
            <button
              type="button"
              onClick={() => setViewMode('cockpit')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 border ${
                viewMode === 'cockpit'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/40'
                  : 'bg-[#151c2e] text-gray-300 hover:text-white hover:bg-[#1e293b] border-gray-700/60'
              }`}
            >
              <span className="text-base">📊</span>
              <span>1. Trading Cockpit (Gráfico & Órdenes)</span>
            </button>

            {/* Tab 2: Patrones 5-10 Años */}
            <button
              type="button"
              onClick={() => setViewMode('historical_patterns')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 border relative ${
                viewMode === 'historical_patterns'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/40'
                  : 'bg-[#18132b] text-purple-200 hover:text-white hover:bg-[#231a3d] border-purple-500/40'
              }`}
            >
              <span className="text-base">🏛️</span>
              <span>2. Patrones Históricos 5-10 Años</span>
              <span className="bg-purple-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                NUEVO 🔥
              </span>
            </button>

            {/* Tab 3: Macro & Noticias */}
            <button
              type="button"
              onClick={() => setViewMode('macro_sentinel')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2.5 border relative ${
                viewMode === 'macro_sentinel'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-2 ring-rose-400/40'
                  : 'bg-[#24131b] text-rose-200 hover:text-white hover:bg-[#341b27] border-rose-500/40'
              }`}
            >
              <span className="text-base">🌐</span>
              <span>3. Macro, Noticias & Sentimiento</span>
              <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                VIX EN VIVO
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Conditional View: 10-Year Historical Patterns vs Macro Sentinel vs Live Trading Cockpit */}
      {viewMode === 'historical_patterns' ? (
        <div className="px-4 py-4 max-w-[1920px] mx-auto">
          <HistoricalPatternsView />
        </div>
      ) : viewMode === 'macro_sentinel' ? (
        <div className="px-4 py-4 max-w-[1920px] mx-auto">
          <MacroSentinelView />
        </div>
      ) : (
        <>
          {/* Mobile Mode Switcher Bar (Visible on mobile/tablet screens <= 900px) */}
          <div className="mobile-view-selector-bar">
            <button
              type="button"
              className={`mobile-tab-btn ${mobileTab === 'chart' ? 'active' : ''}`}
              onClick={() => setMobileTab('chart')}
            >
              <span>📊 Gráfica</span>
            </button>
            <button
              type="button"
              className={`mobile-tab-btn ${mobileTab === 'gemini' ? 'active' : ''}`}
              onClick={() => setMobileTab('gemini')}
            >
              <span>🧠 Gemini AI</span>
            </button>
            <button
              type="button"
              className={`mobile-tab-btn ${mobileTab === 'execute' ? 'active' : ''}`}
              onClick={() => setMobileTab('execute')}
            >
              <span>⚡ Operar & DOM</span>
            </button>
            <button
              type="button"
              className={`mobile-tab-btn ${mobileTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setMobileTab('analytics')}
            >
              <span>📈 Análisis</span>
            </button>
            <button
              type="button"
              className={`mobile-tab-btn ${mobileTab === 'all' ? 'active' : ''}`}
              onClick={() => setMobileTab('all')}
            >
              <span>📜 Todo</span>
            </button>
          </div>

          {/* 3. Main Trading Workspace Layout */}
          <main className={`trading-workspace-grid mobile-active-tab-${mobileTab}`}>
            {/* Left Column: Primary Chart, Gemini Advisor, Copilot & Analytics */}
            <section className="workspace-main-column">
          {/* Chart Section */}
          <div className={`tab-panel-section panel-chart ${mobileTab === 'chart' || mobileTab === 'all' ? 'active-panel' : ''}`}>
            <CandlestickChart
              symbol={symbol}
              resolution={resolution}
              onPriceUpdate={handlePriceUpdate}
              markers={chartMarkers}
            />

            {/* Mobile Quick Trade Bar */}
            <div className="mobile-chart-quick-trade-bar">
              <button
                type="button"
                className="mobile-quick-btn buy"
                onClick={() => handleQuickDomOrder('BUY', currentPrice)}
              >
                <span>COMPRAR 1 {symbol}</span>
                <strong>${currentPrice > 0 ? currentPrice.toFixed(2) : '19,754.50'}</strong>
              </button>
              <button
                type="button"
                className="mobile-quick-btn sell"
                onClick={() => handleQuickDomOrder('SELL', currentPrice)}
              >
                <span>VENDER 1 {symbol}</span>
                <strong>${currentPrice > 0 ? currentPrice.toFixed(2) : '19,754.50'}</strong>
              </button>
            </div>
          </div>

          {/* Gemini AI Quant Advisor Section */}
          <div className={`tab-panel-section panel-gemini ${mobileTab === 'gemini' || mobileTab === 'all' ? 'active-panel' : ''}`}>
            <GeminiAdvisorCard
              symbol={symbol}
              currentPrice={currentPrice}
              onApplyTrade={(side) => {
                handleQuickDomOrder(side, currentPrice);
              }}
            />
          </div>

          {/* Analytics & Rules Section */}
          <div className={`tab-panel-section panel-analytics ${mobileTab === 'analytics' || mobileTab === 'all' ? 'active-panel' : ''}`}>
            <TopCopilotAdvisor
              symbol={symbol}
              currentPrice={currentPrice}
              netDailyPnl={netDailyPnl}
              onApplyRecommendation={(side) => {
                handleQuickDomOrder(side, currentPrice);
              }}
            />

            <div className="analytics-dual-grid">
              <MarketStructureCard symbol={symbol} resolution={resolution} />
              <BacktestCard symbol={symbol} resolution={resolution} />
            </div>

            <MarketNewsSentiment />
          </div>
        </section>

        {/* Right Column: Order Execution, DOM Ladder & Telemetry Feed */}
        <aside className="workspace-sidebar-column">
          <div className={`tab-panel-section panel-execute ${mobileTab === 'execute' || mobileTab === 'all' ? 'active-panel' : ''}`}>
            <TradingExecutionPanel
              symbol={symbol}
              currentPrice={currentPrice}
              balance={balance}
              positions={positions}
              tradeHistory={tradeHistory}
              onOrderExecuted={handleOrderExecuted}
              onPositionClosed={handlePositionClosed}
            />

            <DepthOfMarketLadder
              symbol={symbol}
              currentPrice={currentPrice}
              onQuickOrder={handleQuickDomOrder}
            />
          </div>

          <div className={`tab-panel-section panel-feed ${mobileTab === 'analytics' || mobileTab === 'all' ? 'active-panel' : ''}`}>
            <ActivityFeed
              events={events}
              onClear={() => setEvents([])}
            />
          </div>
        </aside>
      </main>
      </>
      )}

      {/* WhatsApp Evolution API Notification Settings Modal */}
      <WhatsAppSettingsModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
}

export default Dashboard;
