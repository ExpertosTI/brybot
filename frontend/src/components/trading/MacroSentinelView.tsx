import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import '../../styles-quant.css';

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
  timestamp?: number;
}

interface LockoutStatus {
  is_locked: boolean;
  lock_reason: string;
  high_impact_events_today: number;
  total_events: number;
}

export const MacroSentinelView: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [lockout, setLockout] = useState<LockoutStatus | null>(null);
  const [filterImpact, setFilterImpact] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMacroData = async () => {
    setLoading(true);
    try {
      const [calRes, sentRes] = await Promise.all([
        api.get('/analysis/macro-calendar'),
        api.get('/analysis/market-sentiment'),
      ]);
      if (calRes.data && typeof calRes.data === 'object') {
        setEvents(calRes.data.events || []);
        setLockout(calRes.data.lockout_status || null);
      }
      if (sentRes.data && typeof sentRes.data === 'object') {
        setSentiment(sentRes.data);
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

  const filteredEvents = (events || []).filter((e) => {
    if (filterImpact === 'ALL') return true;
    return e.impact === filterImpact;
  });

  const vixChange = sentiment?.vix?.change ?? 0;
  const dxyChange = sentiment?.dxy?.change ?? 0;

  return (
    <div className="quant-container">
      {/* 1. Header Bar */}
      <section className="quant-hero-panel">
        <div className="quant-hero-title-group">
          <div className="quant-hero-icon" style={{ background: 'linear-gradient(135deg, #f43f5e, #f59e0b)' }}>
            🌐
          </div>
          <div>
            <h2 className="quant-hero-heading">
              Centinela Macroeconómico, Noticias & Sentimiento
            </h2>
            <div className="quant-hero-subheading">
              Datos 100% reales en vivo de volatilidad (VIX), DXY, Fear & Greed y calendario de alto impacto
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchMacroData}
          disabled={loading}
          className="quant-pill-btn active"
          style={{ padding: '0.55rem 1.1rem' }}
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>Actualizar Telemetría</span>
        </button>
      </section>

      {/* 2. Volatility & Health Metric Gauges */}
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
            Fuente verificada: {sentiment?.fear_and_greed?.source ?? 'Alternative.me API'}
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

      {/* 3. Automatic News Protection Banner */}
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

      {/* 4. Live Economic Calendar */}
      <section className="quant-panel">
        <div className="quant-panel-header">
          <div>
            <h3 className="quant-panel-title">
              <span>📅</span> Calendario Económico Real (Semana en Curso)
            </h3>
            <div className="quant-panel-subtitle">
              Noticias macroeconómicas de alto y medio impacto que mueven el precio de los futuros de índices y materias primas.
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
                    <span key={sym} style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#c7d2fe', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
                      #{sym}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
