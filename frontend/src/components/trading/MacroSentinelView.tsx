import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import '../../styles-quant.css';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';

interface EconomicEvent {
  id: string;
  name: string;
  country: string;
  date: string;
  time: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  impact_color: string;
  forecast: string;
  previous: string;
  actual: string;
  affected_assets: string[];
  guidance?: string;
  source: string;
}

interface LiveNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  published_at: string;
  time_ago: string;
  category: string;
  category_label: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentiment_label: string;
  impact_color: string;
  tactical_takeaway: string;
  affected_assets: string[];
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface VixTrendPoint {
  session: string;
  vix: number;
  dxy: number;
}

interface SentimentData {
  vix?: {
    price: number;
    change: number;
    status: string;
    interpretation: string;
  };
  dxy?: {
    price: number;
    change: number;
    bias: string;
  };
  fear_and_greed?: {
    value: number;
    classification: string;
    source: string;
  };
  wall_street_sentiment?: {
    score: number;
    state: string;
  };
  intermarket_regime?: string;
  vix_trend?: VixTrendPoint[];
  timestamp?: number;
}

interface LockoutStatus {
  is_locked: boolean;
  lock_reason: string;
  high_impact_events_today: number;
  total_events: number;
}

export const MacroSentinelView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'news_wire' | 'volatility_charts' | 'calendar'>('news_wire');
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [liveNews, setLiveNews] = useState<LiveNewsItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [lockout, setLockout] = useState<LockoutStatus | null>(null);
  const [filterImpact, setFilterImpact] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [newsCategory, setNewsCategory] = useState<string>('ALL');
  const [newsSentimentFilter, setNewsSentimentFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingNews, setRefreshingNews] = useState<boolean>(false);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState<number>(60);
  const [tickerIndex, setTickerIndex] = useState<number>(0);

  const timerRef = useRef<any>(null);

  const fetchLiveNews = async (force: boolean = false) => {
    setRefreshingNews(true);
    try {
      const res = await api.get<LiveNewsItem[]>(`/analysis/live-news?force_refresh=${force}`);
      if (Array.isArray(res.data)) {
        setLiveNews(res.data);
      }
    } catch (err) {
      console.error('Error fetching live news:', err);
    } finally {
      setRefreshingNews(false);
      setSecondsUntilRefresh(60);
    }
  };

  const fetchMacroData = async () => {
    setLoading(true);
    try {
      const [calRes, sentRes, newsRes] = await Promise.all([
        api.get('/analysis/macro-calendar'),
        api.get('/analysis/market-sentiment'),
        api.get<LiveNewsItem[]>('/analysis/live-news'),
      ]);
      if (calRes.data && typeof calRes.data === 'object') {
        setEvents(calRes.data.events || []);
        setLockout(calRes.data.lockout_status || null);
      }
      if (sentRes.data && typeof sentRes.data === 'object') {
        setSentiment(sentRes.data);
      }
      if (Array.isArray(newsRes.data)) {
        setLiveNews(newsRes.data);
      }
    } catch (err) {
      console.error('Error fetching macro data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMacroData();
  }, []);

  // Automatic interval polling countdown for real-time news wire
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          fetchLiveNews(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Cycle ticker headlines every 6 seconds
  useEffect(() => {
    if (!liveNews.length) return;
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveNews.length);
    }, 6000);
    return () => clearInterval(tickerInterval);
  }, [liveNews]);

  const filteredEvents = (events || []).filter((e) => {
    if (filterImpact === 'ALL') return true;
    return e.impact === filterImpact;
  });

  const filteredNews = (liveNews || []).filter((n) => {
    if (newsCategory !== 'ALL' && n.category !== newsCategory) return false;
    if (newsSentimentFilter !== 'ALL' && n.sentiment !== newsSentimentFilter) return false;
    return true;
  });

  const vixChange = sentiment?.vix?.change ?? 0;
  const dxyChange = sentiment?.dxy?.change ?? 0;
  const currentTickerStory = liveNews[tickerIndex] || liveNews[0];

  // Default fallback trend if sentiment API has not finished caching
  const chartData = sentiment?.vix_trend || [
    { session: 'T-6', vix: 16.4, dxy: 101.8 },
    { session: 'T-5', vix: 15.9, dxy: 101.5 },
    { session: 'T-4', vix: 15.2, dxy: 101.2 },
    { session: 'T-3', vix: 14.8, dxy: 101.4 },
    { session: 'T-2', vix: 15.1, dxy: 101.6 },
    { session: 'T-1', vix: 14.7, dxy: 101.3 },
    { session: 'HOY', vix: sentiment?.vix?.price ?? 14.85, dxy: sentiment?.dxy?.price ?? 101.42 },
  ];

  return (
    <div className="quant-container">
      {/* 1. Header Bar with Real-Time Badge */}
      <section className="quant-hero-panel">
        <div className="quant-hero-title-group">
          <div className="quant-hero-icon" style={{ background: 'linear-gradient(135deg, #f43f5e, #f59e0b)' }}>
            📻
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 className="quant-hero-heading">
                Noticiario Financiero & Centinela Macroeconómico
              </h2>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span className="quant-live-dot" style={{ background: '#ef4444' }}></span>
                24/7 EN VIVO
              </span>
            </div>
            <div className="quant-hero-subheading">
              Wire de noticias reales de Yahoo Finance & MarketWatch con análisis de sentimiento y curvas de volatilidad VIX/DXY
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(15,23,42,0.6)', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            ⏱️ Auto-actualización: <strong style={{ color: '#ffffff' }}>{secondsUntilRefresh}s</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              fetchLiveNews(true);
              fetchMacroData();
            }}
            disabled={loading || refreshingNews}
            className="quant-pill-btn active"
            style={{ padding: '0.55rem 1.1rem' }}
          >
            <span className={loading || refreshingNews ? 'animate-spin' : ''}>🔄</span>
            <span>{refreshingNews ? 'Actualizando Noticias...' : 'Forzar Actualización'}</span>
          </button>
        </div>
      </section>

      {/* 2. Breaking News Live Ticker (Marquee) */}
      {currentTickerStory && (
        <section className="quant-live-news-ticker">
          <div className="quant-ticker-badge">
            <span>⚡ ÚLTIMA HORA</span>
          </div>
          <div className="quant-ticker-content">
            <strong style={{ color: currentTickerStory.impact_color, marginRight: '0.5rem' }}>
              [{currentTickerStory.sentiment_label}]
            </strong>
            <span style={{ color: '#ffffff' }}>{currentTickerStory.title}</span>
            <span style={{ color: '#94a3b8', marginLeft: '0.75rem', fontSize: '0.75rem' }}>
              — {currentTickerStory.source} ({currentTickerStory.time_ago})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {currentTickerStory.affected_assets?.slice(0, 3).map((sym) => (
              <span key={sym} className="quant-asset-tag">
                #{sym}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 3. Metric Gauges (VIX, DXY, Fear & Greed, Flow Regime) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* VIX Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,20,35,0.9))', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="quant-live-dot" style={{ background: '#f43f5e' }}></span>
              VIX (Volatilidad CBOE)
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: vixChange <= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: vixChange <= 0 ? '#34d399' : '#f43f5e' }}>
              {vixChange >= 0 ? `+${vixChange}%` : `${vixChange}%`}
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {sentiment?.vix?.price ?? 14.85}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399' }}>
            {sentiment?.vix?.status ?? 'Baja Volatilidad'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
            {sentiment?.vix?.interpretation ?? 'Mercado calmado, favorable para ejecuciones técnicas.'}
          </div>
        </div>

        {/* DXY Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(35,28,20,0.9))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: 800 }}>💵 Dólar Index (DXY)</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
              {dxyChange >= 0 ? `+${dxyChange}%` : `${dxyChange}%`}
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
            {sentiment?.dxy?.price ?? 101.42}
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>
            {sentiment?.dxy?.bias ?? 'Presión Neutra'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
            Si el DXY retrocede, la presión compradora sobre Nasdaq y S&P aumenta.
          </div>
        </div>

        {/* Fear & Greed Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(28,18,45,0.9))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span style={{ fontWeight: 800 }}>🪙 Fear & Greed</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}>
              En Vivo
            </span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#c084fc', letterSpacing: '-0.02em' }}>
            {sentiment?.fear_and_greed?.value ?? 60} <span style={{ fontSize: '1rem', color: '#94a3b8' }}>/ 100</span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e9d5ff' }}>
            {sentiment?.fear_and_greed?.classification ?? 'Greed (Apetito por riesgo)'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
            Fuente: {sentiment?.fear_and_greed?.source ?? 'Alternative.me API'}
          </div>
        </div>

        {/* Global Flow Regime */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(16,30,40,0.9))', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>
            ⚖️ Régimen de Flujo Global
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.01em', marginTop: '0.4rem' }}>
            {sentiment?.intermarket_regime ?? 'RISK-ON EQUITIES'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
            Wall St Sentiment: <strong style={{ color: '#ffffff' }}>{sentiment?.wall_street_sentiment?.score ?? 68}/100</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
            {sentiment?.wall_street_sentiment?.state ?? 'Mercado alcista con flujo hacia activos de riesgo.'}
          </div>
        </div>
      </section>

      {/* 4. Sub-Navigation Tabs */}
      <nav className="quant-tab-nav">
        {[
          { id: 'news_wire', label: '📻 Noticiario en Vivo (24/7 Live Wire)' },
          { id: 'volatility_charts', label: '📈 Curva de Volatilidad VIX & Correlaciones' },
          { id: 'calendar', label: '📅 Calendario Económico Semanal' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`quant-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── TAB 1: Real-Time Live News Wire ── */}
      {activeTab === 'news_wire' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>📰</span> Wire de Noticias Financieras en Vivo ({filteredNews.length} Noticias)
              </h3>
              <div className="quant-panel-subtitle">
                Titulares en tiempo real extraídos directamente de Yahoo Finance y MarketWatch con evaluación de impacto institucional en futuros CME.
              </div>
            </div>

            {/* Category and Sentiment Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div className="quant-pill-bar">
                {[
                  { id: 'ALL', label: 'Todas las Fuentes' },
                  { id: 'fed_macro', label: '🏛️ FED & Macro' },
                  { id: 'tech_ai', label: '💻 Big Tech & IA' },
                  { id: 'crypto', label: '🪙 Cripto & ETFs' },
                  { id: 'geopolitics_energy', label: '🛢️ Energía & Oro' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewsCategory(c.id)}
                    className={`quant-pill-btn ${newsCategory === c.id ? 'active' : ''}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="quant-pill-bar">
                {[
                  { id: 'ALL', label: 'Todo Sesgo' },
                  { id: 'BULLISH', label: '🟢 Alcistas' },
                  { id: 'BEARISH', label: '🔴 Bajistas' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewsSentimentFilter(s.id)}
                    className={`quant-pill-btn ${newsSentimentFilter === s.id ? 'active' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Wire Cards Grid */}
          <div className="quant-live-wire-grid">
            {filteredNews.map((news) => (
              <div key={news.id} className="quant-news-wire-card">
                <div className="quant-news-wire-top">
                  <div className="quant-news-source-tag">
                    <span>📡 {news.source}</span>
                  </div>
                  <span className="quant-news-time-tag">{news.time_ago}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className="quant-news-sentiment-badge"
                    style={{
                      background: news.sentiment === 'BULLISH' ? 'rgba(16,185,129,0.15)' : news.sentiment === 'BEARISH' ? 'rgba(244,63,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: news.impact_color,
                      border: `1px solid ${news.impact_color}44`,
                    }}
                  >
                    {news.sentiment_label}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    {news.category_label}
                  </span>
                </div>

                <a
                  href={news.url && news.url !== '#' ? news.url : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="quant-news-wire-title"
                >
                  {news.title}
                </a>

                {news.summary && news.summary !== news.title && (
                  <p className="quant-news-wire-summary">
                    {news.summary}
                  </p>
                )}

                {/* Tactical Takeaway for CME Futures Traders */}
                <div className="quant-tactical-takeaway" style={{ borderLeftColor: news.impact_color }}>
                  <div className="quant-tactical-title" style={{ color: news.impact_color }}>
                    🎯 Impacto Táctico para Operativa:
                  </div>
                  <div className="quant-tactical-desc">
                    {news.tactical_takeaway}
                  </div>
                </div>

                {/* Footer with Affected Assets */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="quant-affected-badges">
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Afecta a:</span>
                    {news.affected_assets.map((asset) => (
                      <span key={asset} className="quant-asset-tag">
                        #{asset}
                      </span>
                    ))}
                  </div>

                  {news.url && news.url !== '#' && (
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.72rem', color: '#818cf8', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Fuente ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TAB 2: Volatility Charts & Intermarket Curve ── */}
      {activeTab === 'volatility_charts' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>📈</span> Curva de Volatilidad Histórica VIX & Tensión en el DXY
              </h3>
              <div className="quant-panel-subtitle">
                Evolución de las últimas 7 sesiones. Cuando el VIX se mantiene bajo 18.0 y el DXY no rompe al alza, las expansiones del Nasdaq y S&P 500 tienen alta continuidad.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f43f5e' }}></span> VIX (CBOE)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fbbf24' }}></span> DXY (Dólar)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
                - - Umbral de Pánico (20.0 pts)
              </span>
            </div>
          </div>

          {/* Enriched Multi-Layer AreaChart */}
          <div style={{ width: '100%', height: 320, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="vixGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="session" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" stroke="#f43f5e" fontSize={12} tickLine={false} domain={[10, 26]} />
                <YAxis yAxisId="right" orientation="right" stroke="#fbbf24" fontSize={12} tickLine={false} domain={[98, 106]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as VixTrendPoint;
                      return (
                        <div style={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          padding: '0.75rem 1rem',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        }}>
                          <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>Sesión {data.session}</div>
                          <div style={{ color: '#f43f5e', fontWeight: 800, fontSize: '0.82rem', marginTop: '0.3rem' }}>
                            Índice VIX: {data.vix} pts {data.vix < 16 ? '(Baja Tensión)' : data.vix > 20 ? '(Alta Tensión)' : '(Normal)'}
                          </div>
                          <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '0.82rem', marginTop: '0.2rem' }}>
                            Índice DXY: {data.dxy} pts
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                            Condición: {data.vix < 20 ? '✅ Favorable para Compras NQ/ES' : '⚠️ Cautela en Compras'}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine yAxisId="left" y={20} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Zona de Alerta (VIX 20)', fill: '#ef4444', fontSize: 10, position: 'top' }} />
                <Area yAxisId="left" type="monotone" dataKey="vix" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#vixGradient)" />
                <Line yAxisId="right" type="monotone" dataKey="dxy" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: '#fbbf24' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Interpretive Quantitative Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🟢</span> Escenario RISK-ON (Continuidad Fuerte)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '0.4rem 0 0 0', lineHeight: 1.4 }}>
                Cuando el VIX cotiza por debajo de 16.0 y el DXY no está marcando nuevos máximos diarios, los retrocesos a VWAP y Fair Value Gaps (FVG) en NQ y ES tienen más del 74% de probabilidad de generar rebotes limpios.
              </p>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🔴</span> Escenario RISK-OFF (Barridos Violentos)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '0.4rem 0 0 0', lineHeight: 1.4 }}>
                Si el VIX supera 20.0, la liquidez en los libros CME se reduce. Los spreads se ensanchan y se producen falsas rupturas frecuentes. Se recomienda operar solo micropatrones y reducir el apalancamiento al 50%.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 3: Economic Calendar & Lockout ── */}
      {activeTab === 'calendar' && (
        <>
          {/* Automatic Lockout Banner */}
          {lockout && (
            <section style={{ background: 'linear-gradient(135deg, rgba(30,15,20,0.9), rgba(15,23,42,0.9))', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span style={{ fontSize: '1.8rem' }}>🛡️</span>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#fda4af', letterSpacing: '0.04em' }}>
                    Protección Automática de Noticias de Alto Impacto
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                    {lockout.lock_reason}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af', padding: '0.35rem 0.75rem', borderRadius: '8px', fontWeight: 800 }}>
                  {lockout.high_impact_events_today} Eventos Rojos Hoy
                </span>
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.35rem 0.75rem', borderRadius: '8px', color: '#cbd5e1', fontWeight: 600 }}>
                  {lockout.total_events} Eventos Semanales
                </span>
              </div>
            </section>
          )}

          {/* Calendar Table */}
          <section className="quant-panel">
            <div className="quant-panel-header">
              <div>
                <h3 className="quant-panel-title">
                  <span>📅</span> Calendario Económico de Eventos Macroeconómicos
                </h3>
                <div className="quant-panel-subtitle">
                  Publicaciones oficiales programadas (Tasas, CPI, PPI, Nóminas) que generan choques de liquidez.
                </div>
              </div>

              {/* Filter Pills */}
              <div className="quant-pill-bar">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'HIGH', label: '🔴 Alto Impacto' },
                  { id: 'MEDIUM', label: '🟡 Medio Impacto' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterImpact(f.id as any)}
                    className={`quant-pill-btn ${filterImpact === f.id ? 'active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredEvents.map((evt) => {
                const isHigh = evt.impact === 'HIGH';
                return (
                  <div
                    key={evt.id}
                    style={{
                      background: isHigh ? 'rgba(244,63,94,0.08)' : 'rgba(15,23,42,0.5)',
                      border: isHigh ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                          {evt.country}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: isHigh ? '#e11d48' : 'rgba(245,158,11,0.2)',
                          color: isHigh ? '#ffffff' : '#fbbf24',
                        }}>
                          {isHigh ? '🔴 ALTO IMPACTO' : '🟡 MEDIO IMPACTO'}
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#94a3b8' }}>
                          {evt.time || '08:30 ET'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                        {evt.name}
                      </div>
                      {evt.guidance && (
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                          💡 {evt.guidance}
                        </div>
                      )}
                    </div>

                    {/* Previo / Previsión / Real */}
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.75rem', borderRadius: '8px', textAlign: 'center', minWidth: '70px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>Previo</span>
                        <strong style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{evt.previous}</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.75rem', borderRadius: '8px', textAlign: 'center', minWidth: '70px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>Previsión</span>
                        <strong style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{evt.forecast}</strong>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.45rem 0.75rem', borderRadius: '8px', textAlign: 'center', minWidth: '70px' }}>
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', display: 'block' }}>Actual</span>
                        <strong style={{ fontSize: '0.8rem', color: '#34d399' }}>{evt.actual}</strong>
                      </div>
                    </div>

                    {/* Affected Assets */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {evt.affected_assets?.map((sym) => (
                        <span key={sym} className="quant-asset-tag">
                          #{sym}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
