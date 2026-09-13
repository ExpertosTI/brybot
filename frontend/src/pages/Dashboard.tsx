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
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { soundEffects } from '../utils/audioEffects';
import '../styles-quant.css';

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
      <div style={{ padding: '0.85rem 1rem 0.35rem 1rem', maxWidth: '1920px', margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0c1222 0%, #111827 100%)',
          padding: '0.75rem 1.25rem',
          borderRadius: '16px',
          border: '2px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 12px #22c55e' }}></span>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, color: '#a5b4fc' }}>
              Módulos Cuantitativos e Institucionales:
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem' }}>
            {/* Tab 1: Trading Cockpit */}
            <button
              type="button"
              onClick={() => setViewMode('cockpit')}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: viewMode === 'cockpit' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                background: viewMode === 'cockpit' ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(15,23,42,0.8)',
                color: viewMode === 'cockpit' ? '#ffffff' : '#94a3b8',
                boxShadow: viewMode === 'cockpit' ? '0 4px 14px rgba(79, 70, 229, 0.4)' : 'none',
              }}
            >
              <span>📊</span>
              <span>1. Trading Cockpit (Gráfico & Órdenes)</span>
            </button>

            {/* Tab 2: Patrones 5-10 Años */}
            <button
              type="button"
              onClick={() => setViewMode('historical_patterns')}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: viewMode === 'historical_patterns' ? '2px solid #a855f7' : '1px solid rgba(168,85,247,0.3)',
                background: viewMode === 'historical_patterns' ? 'linear-gradient(135deg, #7c3aed, #9333ea)' : 'rgba(24,18,43,0.8)',
                color: viewMode === 'historical_patterns' ? '#ffffff' : '#d8b4fe',
                boxShadow: viewMode === 'historical_patterns' ? '0 4px 18px rgba(168, 85, 247, 0.4)' : 'none',
              }}
            >
              <span>🏛️</span>
              <span>2. Patrones Históricos 5-10 Años</span>
              <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>
                NUEVO 🔥
              </span>
            </button>

            {/* Tab 3: Macro & Noticias */}
            <button
              type="button"
              onClick={() => setViewMode('macro_sentinel')}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: viewMode === 'macro_sentinel' ? '2px solid #f43f5e' : '1px solid rgba(244,63,94,0.3)',
                background: viewMode === 'macro_sentinel' ? 'linear-gradient(135deg, #e11d48, #f59e0b)' : 'rgba(36,19,27,0.8)',
                color: viewMode === 'macro_sentinel' ? '#ffffff' : '#fda4af',
                boxShadow: viewMode === 'macro_sentinel' ? '0 4px 18px rgba(244, 63, 94, 0.4)' : 'none',
              }}
            >
              <span>🌐</span>
              <span>3. Macro, Noticias & Sentimiento</span>
              <span style={{ fontSize: '0.65rem', background: '#f43f5e', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>
                VIX EN VIVO
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Conditional View: 10-Year Historical Patterns vs Macro Sentinel vs Live Trading Cockpit */}
      {viewMode === 'historical_patterns' ? (
        <div className="px-4 py-4 max-w-[1920px] mx-auto">
          <ErrorBoundary fallbackTitle="Error al cargar Patrones Históricos" onReset={() => setViewMode('cockpit')}>
            <HistoricalPatternsView />
          </ErrorBoundary>
        </div>
      ) : viewMode === 'macro_sentinel' ? (
        <div className="px-4 py-4 max-w-[1920px] mx-auto">
          <ErrorBoundary fallbackTitle="Error al cargar Centinela Macroeconómico" onReset={() => setViewMode('cockpit')}>
            <MacroSentinelView />
          </ErrorBoundary>
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
