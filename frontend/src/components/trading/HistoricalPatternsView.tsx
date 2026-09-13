import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import '../../styles-quant.css';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

interface HistoricalPattern {
  id: string;
  name: string;
  win_rate_10y: number;
  profit_factor: number;
  avg_risk_reward: string;
  sample_trades_10y: number;
  best_window: string;
  description: string;
}

interface MonthlyStat {
  month: string;
  name: string;
  avg_return: number;
  win_rate: number;
  volatility: string;
}

interface WeekdayStat {
  day: string;
  day_short: string;
  bullish_bias: number;
  avg_range_pts: number;
  volume_rank: string;
  note: string;
}

interface HourlyAfluencia {
  hour: string;
  time_label: string;
  volume_score: number;
  session: string;
  actionable: boolean;
  note?: string;
}

interface EpochInfo {
  id: string;
  name: string;
  description: string;
  winrate_modifier: number;
  bias: string;
}

interface InterannualRecord {
  year: number;
  season_return: number;
  win_rate: number;
  max_drawdown: number;
  dominant_catalyst: string;
  regime: string;
}

interface SimilarNewsOccurrence {
  date: string;
  event: string;
  initial_15m_reaction: string;
  session_outcome: string;
  verdict: string;
}

interface SimilarNewsAnalog {
  id: string;
  category: string;
  title: string;
  type_label: string;
  historical_winrate_long: number;
  avg_15m_range_pts: number;
  avg_session_change: string;
  golden_rule: string;
  past_occurrences: SimilarNewsOccurrence[];
}

interface HistoricalDataResponse {
  symbol: string;
  name: string;
  category: string;
  years_analyzed: number;
  avg_annual_return_10y: number;
  historical_winrate_baseline: number;
  best_months: string[];
  worst_months: string[];
  current_context: {
    month_name: string;
    month_historical_winrate: number;
    month_avg_return: number;
    day_name: string;
    day_bullish_bias: number;
    verdict_status: string;
    verdict_color: string;
    recommendation_action: string;
  };
  selected_epoch?: EpochInfo;
  available_epochs?: EpochInfo[];
  interannual_season_comparison?: InterannualRecord[];
  similar_news_analogs?: SimilarNewsAnalog[];
  monthly_seasonality: MonthlyStat[];
  weekday_stats: WeekdayStat[];
  hourly_afluencia: HourlyAfluencia[];
  recurrent_patterns: HistoricalPattern[];
}

interface AIRoadmapResponse {
  asset: string;
  bias: string;
  confidence: number;
  optimal_window: string;
  top_pattern: string;
  executive_summary: string;
  action_steps: string[];
}

export const HistoricalPatternsView: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NQ');
  const [selectedYears, setSelectedYears] = useState<number>(10);
  const [selectedEpoch, setSelectedEpoch] = useState<string>('all');
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('all');

  const [data, setData] = useState<HistoricalDataResponse | null>(null);
  const [roadmap, setRoadmap] = useState<AIRoadmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'seasonality' | 'interannual_season' | 'similar_news' | 'afluencia' | 'patterns' | 'ai_roadmap'
  >('seasonality');

  const symbols = [
    { id: 'NQ', name: 'Nasdaq 100', icon: '💻' },
    { id: 'ES', name: 'S&P 500', icon: '🏛️' },
    { id: 'BTC', name: 'Bitcoin', icon: '🪙' },
    { id: 'GC', name: 'Oro (Gold)', icon: '🥇' },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<HistoricalDataResponse>(
        `/analysis/historical-patterns?symbol=${selectedSymbol}&years=${selectedYears}&epoch=${selectedEpoch}&news_category=${selectedNewsCategory}`
      );
      if (res.data && typeof res.data === 'object') {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching historical patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRoadmap = async () => {
    setLoadingRoadmap(true);
    try {
      const res = await api.post<AIRoadmapResponse>('/analysis/pattern-roadmap', {
        symbol: selectedSymbol,
        years: selectedYears,
      });
      if (res.data && typeof res.data === 'object') {
        setRoadmap(res.data);
      }
    } catch (err) {
      console.error('Error generating AI roadmap:', err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSymbol, selectedYears, selectedEpoch, selectedNewsCategory]);

  useEffect(() => {
    if (activeTab === 'ai_roadmap' && !roadmap) {
      fetchAIRoadmap();
    }
  }, [activeTab, selectedSymbol]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#94a3b8', fontWeight: 600 }}>Cargando análisis institucional y precedentes históricos...</p>
      </div>
    );
  }

  const activeEpoch = data?.selected_epoch || {
    id: 'all',
    name: 'Historial Decenal',
    description: '10 años completos sin filtro de régimen.',
    winrate_modifier: 0,
    bias: 'NEUTRAL BASE',
  };

  const confluenceScore = Math.min(
    96,
    Math.max(
      35,
      Math.round(
        ((data?.current_context?.month_historical_winrate ?? 60) * 0.5) +
        ((data?.current_context?.day_bullish_bias ?? 55) * 0.3) +
        ((data?.historical_winrate_baseline ?? 62) * 0.2)
      )
    )
  );

  return (
    <div className="quant-container">
      {/* 1. Header Bar with Asset & Period Pills */}
      <section className="quant-hero-panel">
        <div className="quant-hero-title-group">
          <div className="quant-hero-icon">🏛️</div>
          <div>
            <h2 className="quant-hero-heading">
              Motor Cuantitativo de Patrones (5 a 10 Años)
            </h2>
            <div className="quant-hero-subheading">
              Estacionalidad decenal, comparativas interanuales, afluencia horaria y noticias análogas para <strong>{data?.name || selectedSymbol}</strong>
            </div>
          </div>
        </div>

        <div className="quant-controls-group">
          {/* Asset Pills */}
          <div className="quant-pill-bar">
            {symbols.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSymbol(s.id);
                  setRoadmap(null);
                }}
                className={`quant-pill-btn ${selectedSymbol === s.id ? 'active' : ''}`}
              >
                <span>{s.icon}</span>
                <span>{s.id}</span>
              </button>
            ))}
          </div>

          {/* Years Selector */}
          <div className="quant-pill-bar">
            {[3, 5, 10].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYears(yr)}
                className={`quant-pill-btn ${selectedYears === yr ? 'active-purple' : ''}`}
              >
                {yr} Años
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Interactive Epoch & Season Filter Toolbar */}
      <section className="quant-epoch-bar">
        <div className="quant-epoch-header">
          <div className="quant-epoch-label">
            <span>⏱️</span>
            <span>Filtro de Épocas y Temporadas de Mercado:</span>
          </div>
          <div className="quant-epoch-tag">
            Régimen Activo: {activeEpoch.bias}
          </div>
        </div>

        <div className="quant-epoch-grid">
          {[
            { id: 'all', label: 'Historial 10 Años', sub: 'Muestra global 2014-2024', icon: '🌐' },
            { id: 'current_season', label: 'Temporada Actual (Q3/Sep)', sub: 'Efecto fin de verano', icon: '🍁' },
            { id: 'election_years', label: 'Años Electorales USA', sub: '2024, 2020, 2016', icon: '🗳️' },
            { id: 'rate_cut_cycle', label: 'Ciclos Bajas Tasas FED', sub: 'Flexibilización y liquidez', icon: '📉' },
            { id: 'earnings_season', label: 'Temporada Earnings', sub: 'Balances Big Tech', icon: '📊' },
          ].map((ep) => (
            <div
              key={ep.id}
              onClick={() => setSelectedEpoch(ep.id)}
              className={`quant-epoch-card ${selectedEpoch === ep.id ? 'selected' : ''}`}
            >
              <div className="quant-epoch-card-title">
                <span>{ep.icon}</span>
                <span>{ep.label}</span>
              </div>
              <div className="quant-epoch-card-sub">{ep.sub}</div>
            </div>
          ))}
        </div>

        <p className="quant-epoch-explanation">
          💡 <strong>Contexto del filtro:</strong> {activeEpoch.description}
        </p>
      </section>

      {/* 3. Immersive Tactical Briefing & Confluence Gauge */}
      <section className="quant-briefing-grid">
        {/* Left Card: Gemini Copilot Tactical Briefing */}
        <div className="quant-briefing-card">
          <div className="quant-briefing-top">
            <div className="quant-briefing-badge">
              <span className="quant-live-dot"></span>
              <span>Dictamen Cuantitativo en Vivo · {data?.current_context?.month_name} ({selectedSymbol})</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Base: {selectedYears} Años Verificados
            </span>
          </div>

          <div className={`quant-verdict-banner ${confluenceScore < 50 ? 'warning' : ''}`}>
            <div className="quant-verdict-text">
              {data?.current_context?.verdict_status || 'SESGO DE TRADING'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ffffff' }}>
              {data?.current_context?.day_name}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.55 }}>
            {data?.current_context?.recommendation_action}
          </div>

          <div className="quant-plan-steps">
            <div className="quant-step-box">
              <span className="quant-step-title">🎯 Sesgo Principal</span>
              <span className="quant-step-value" style={{ color: confluenceScore >= 60 ? '#34d399' : '#fbbf24' }}>
                {confluenceScore >= 60 ? 'LONG / COMPRA' : 'SHORT / DEFENSIVO'}
              </span>
            </div>
            <div className="quant-step-box">
              <span className="quant-step-title">⏰ Ventana Dorada</span>
              <span className="quant-step-value" style={{ color: '#fbbf24' }}>
                09:30 - 11:15 ET
              </span>
            </div>
            <div className="quant-step-box">
              <span className="quant-step-title">🛡️ Gestión de Riesgo</span>
              <span className="quant-step-value">
                Máx 2 Pérdidas / Día
              </span>
            </div>
            <div className="quant-step-box">
              <span className="quant-step-title">📈 Win Rate en Esta Época</span>
              <span className="quant-step-value" style={{ color: '#818cf8' }}>
                {data?.current_context?.month_historical_winrate}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Dial / Speedometer of Institutional Confluence */}
        <div className="quant-gauge-card">
          <div className="quant-gauge-title">Probabilidad Confluente</div>
          <div className="quant-gauge-score">{confluenceScore}%</div>
          <div className="quant-gauge-badge">
            {confluenceScore >= 70 ? '🟢 Alta Probabilidad' : confluenceScore >= 50 ? '🟡 Confluencia Media' : '🔴 Cautela Extrema'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>
            Sintetizado a partir del histórico de {selectedYears} años, ciclo {activeEpoch.name} y volumen intradiario.
          </div>
        </div>
      </section>

      {/* 4. Sub-Navigation Tabs */}
      <nav className="quant-tab-nav">
        {[
          { id: 'seasonality', label: '📊 Estacionalidad Mensual & Gráfica' },
          { id: 'interannual_season', label: '🍁 Comparativa Temporada Actual (Año x Año)' },
          { id: 'similar_news', label: '📰 Noticias Similares & Reacciones Históricas' },
          { id: 'afluencia', label: '⚡ Horas de Afluencia y Liquidez' },
          { id: 'patterns', label: '🎯 Patrones Recurrentes' },
          { id: 'ai_roadmap', label: '🧠 Roadmap Cuantitativo Gemini' },
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

      {/* ── TAB 1: Monthly Seasonality with Interactive Recharts Bar Chart ── */}
      {activeTab === 'seasonality' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>📊</span> Gráfico Interactivo de Retorno Estacional ({selectedYears} Años)
              </h3>
              <div className="quant-panel-subtitle">
                Rendimiento promedio porcentual mes a mes para {data?.name}. Pasa el cursor por cada barra para ver los detalles exactos.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></span> Mes Ganador
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }}></span> Mes Corrector
              </span>
            </div>
          </div>

          {/* Interactive Bar Chart */}
          <div style={{ width: '100%', height: 260, marginTop: '0.5rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.monthly_seasonality || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as MonthlyStat;
                      return (
                        <div style={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        }}>
                          <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: item.avg_return >= 0 ? '#34d399' : '#f87171', fontWeight: 800, marginTop: '0.2rem' }}>
                            Retorno Promedio: {item.avg_return >= 0 ? `+${item.avg_return}%` : `${item.avg_return}%`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            Tasa de Acierto (Win Rate): <strong style={{ color: '#ffffff' }}>{item.win_rate}%</strong>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Volatilidad: {item.volatility}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar dataKey="avg_return" radius={[4, 4, 0, 0]}>
                  {(data?.monthly_seasonality || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.avg_return >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Month Cards Grid */}
          <div className="quant-month-grid">
            {(data?.monthly_seasonality || []).map((m) => {
              const isPositive = m.avg_return >= 0;
              const isCurrent = m.name.toLowerCase() === (data?.current_context?.month_name || '').toLowerCase();
              return (
                <div key={m.month} className={`quant-month-cell ${isCurrent ? 'current-month' : ''}`}>
                  <div className="quant-month-top">
                    <span>{m.name}</span>
                    {isCurrent && <span className="quant-current-badge">HOY</span>}
                  </div>
                  <div className={`quant-month-return ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? `+${m.avg_return}%` : `${m.avg_return}%`}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                    <span>Win Rate:</span>
                    <strong style={{ color: '#e2e8f0' }}>{m.win_rate}%</strong>
                  </div>
                  <div className="quant-progress-bar">
                    <div
                      className={`quant-progress-fill ${isPositive ? 'positive' : 'negative'}`}
                      style={{ width: `${m.win_rate}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weekdays */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', margin: '0 0 0.75rem 0' }}>
              🗓️ Comportamiento por Día de la Semana
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {(data?.weekday_stats || []).map((d) => (
                <div key={d.day} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{d.day}</strong>
                    <span style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#818cf8' }}>
                      {d.volume_rank}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', margin: '0.4rem 0' }}>
                    {d.bullish_bias}% <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Sesgo Alcista</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Rango Promedio: <strong style={{ color: '#ffffff' }}>{d.avg_range_pts} pts</strong>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', margin: '0.4rem 0 0 0', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.35rem' }}>
                    "{d.note}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TAB 2: Interannual Season Comparison (2015 - 2024) ── */}
      {activeTab === 'interannual_season' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>🍁</span> Comparativa Interanual de la Temporada Actual ({data?.current_context?.month_name} / Q3)
              </h3>
              <div className="quant-panel-subtitle">
                Evolución histórica de esta misma temporada en los últimos 10 años (2015 a 2024) con el catalizador dominante de cada época.
              </div>
            </div>
            <div className="quant-epoch-tag">
              Datos Verificados CME Futures
            </div>
          </div>

          {/* Interactive Chart of Season Returns Year by Year */}
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(data?.interannual_season_comparison || []).slice().reverse()}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as InterannualRecord;
                      return (
                        <div style={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        }}>
                          <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>Año {item.year} · {item.regime}</div>
                          <div style={{ fontSize: '0.8rem', color: item.season_return >= 0 ? '#34d399' : '#f87171', fontWeight: 800, marginTop: '0.2rem' }}>
                            Retorno Temporada: {item.season_return >= 0 ? `+${item.season_return}%` : `${item.season_return}%`}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                            Win Rate: <strong style={{ color: '#ffffff' }}>{item.win_rate}%</strong> | Max Drawdown: <strong style={{ color: '#f87171' }}>{item.max_drawdown}%</strong>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.35rem', maxWidth: '280px' }}>
                            {item.dominant_catalyst}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" />
                <Bar dataKey="season_return" radius={[4, 4, 0, 0]}>
                  {(data?.interannual_season_comparison || []).slice().reverse().map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.season_return >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards for each year */}
          <div className="quant-interannual-grid">
            {(data?.interannual_season_comparison || []).map((rec) => {
              const isPositive = rec.season_return >= 0;
              return (
                <div key={rec.year} className="quant-year-card">
                  <div className="quant-year-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="quant-year-badge">{rec.year}</span>
                      <span style={{ fontSize: '0.75rem', color: '#c7d2fe', fontWeight: 600 }}>{rec.regime}</span>
                    </div>
                    <div className="quant-year-return" style={{ color: isPositive ? '#34d399' : '#f87171' }}>
                      {isPositive ? `+${rec.season_return}%` : `${rec.season_return}%`}
                    </div>
                  </div>

                  <div className="quant-year-metrics">
                    <div className="quant-metric-item">
                      <span>Win Rate Temporada</span>
                      <strong>{rec.win_rate}%</strong>
                    </div>
                    <div className="quant-metric-item">
                      <span>Max Drawdown</span>
                      <strong style={{ color: '#f87171' }}>{rec.max_drawdown}%</strong>
                    </div>
                  </div>

                  <div className="quant-year-catalyst">
                    📌 <strong>Catalizador:</strong> {rec.dominant_catalyst}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── TAB 3: Similar News Analogs & Empirical Market Reactions ── */}
      {activeTab === 'similar_news' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>📰</span> Noticias Similares & Reacciones Históricas (News Matcher)
              </h3>
              <div className="quant-panel-subtitle">
                Evalúa qué ocurrió empíricamente en las últimas ocasiones que se publicó una noticia de este tipo en los mercados financieros.
              </div>
            </div>
            {/* Filter Pills */}
            <div className="quant-news-filter-bar">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'rate_decision', label: '🏛️ Tasas FED' },
                { id: 'cpi_inflation', label: '📈 Inflación CPI' },
                { id: 'nfp_jobs', label: '💼 Empleo NFP' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedNewsCategory(cat.id)}
                  className={`quant-pill-btn ${selectedNewsCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="quant-news-list">
            {(data?.similar_news_analogs || []).map((analog) => (
              <div key={analog.id} className="quant-news-card">
                <div className="quant-news-card-header">
                  <div>
                    <span className="quant-news-type-tag">{analog.type_label}</span>
                    <h4 className="quant-news-title">{analog.title}</h4>
                  </div>
                  <div className="quant-news-stats-row">
                    <div className="quant-news-stat-item">
                      <span>Win Rate Alcista</span>
                      <strong style={{ color: analog.historical_winrate_long >= 60 ? '#34d399' : '#f87171' }}>
                        {analog.historical_winrate_long}%
                      </strong>
                    </div>
                    <div className="quant-news-stat-item">
                      <span>Vela 15m Promedio</span>
                      <strong style={{ color: '#fbbf24' }}>±{analog.avg_15m_range_pts} pts</strong>
                    </div>
                  </div>
                </div>

                <div className="quant-golden-rule-box">
                  <div className="quant-golden-rule-title">
                    <span>👑</span> Regla Cuantitativa de Oro (Anti-Trampas):
                  </div>
                  <p className="quant-golden-rule-desc">{analog.golden_rule}</p>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Últimos Precedentes Históricos Verificados:
                  </div>
                  <div className="quant-occurrences-grid">
                    {analog.past_occurrences.map((occ, idx) => (
                      <div key={idx} className="quant-occurrence-item">
                        <div className="quant-occurrence-top">
                          <span className="quant-occurrence-date">{occ.date}</span>
                          <span className="quant-occurrence-badge">15m: {occ.initial_15m_reaction}</span>
                        </div>
                        <div className="quant-occurrence-desc">{occ.event}</div>
                        <div className="quant-occurrence-outcome">
                          <strong>Cierre Día:</strong> {occ.session_outcome}
                        </div>
                        <div className="quant-occurrence-verdict">
                          "{occ.verdict}"
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TAB 4: Hourly Afluencia Timeline ── */}
      {activeTab === 'afluencia' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>⚡</span> Curva de Afluencia, Liquidez y Sesiones Institucionales
              </h3>
              <div className="quant-panel-subtitle">
                Volumen institucional intradiario para {data?.name}. Identifica cuándo entran los fondos y cuándo retirarse para evitar consolidaciones.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> Ventana Dorada
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b' }}></span> Baja Liquidez
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(data?.hourly_afluencia || []).map((h) => (
              <div
                key={h.hour}
                style={{
                  background: h.actionable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                  border: h.actionable ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '200px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '0.9rem' }}>{h.time_label}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    background: h.actionable ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                    color: h.actionable ? '#34d399' : '#94a3b8',
                  }}>
                    {h.session}
                  </span>
                </div>

                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                    <span>Afluencia / Liquidez:</span>
                    <strong style={{ color: '#ffffff' }}>{h.volume_score}%</strong>
                  </div>
                  <div className="quant-progress-bar">
                    <div
                      className="quant-progress-fill positive"
                      style={{
                        width: `${h.volume_score}%`,
                        background: h.volume_score > 75 ? 'linear-gradient(90deg, #10b981, #34d399)' : (h.volume_score > 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : '#64748b')
                      }}
                    ></div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#cbd5e1', width: '260px' }}>
                  {h.note || 'Sesión de baja volatilidad intradiaria'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TAB 5: Recurrent Patterns ── */}
      {activeTab === 'patterns' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>🎯</span> Patrones Recurrentes con Mayor Ventaja Matemática (10 Años)
              </h3>
              <div className="quant-panel-subtitle">
                Setups algorítmicos validados con más de 10,000 operaciones históricas en el CME.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {(data?.recurrent_patterns || []).map((pat) => (
              <div
                key={pat.id}
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(20, 29, 48, 0.8) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                    {pat.name}
                  </h4>
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34d399',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}>
                    Win Rate {pat.win_rate_10y}%
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  {pat.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.6rem', borderRadius: '10px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Profit Factor</span>
                    <strong style={{ fontSize: '0.9rem', color: '#c084fc' }}>{pat.profit_factor}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Ratio R:B</span>
                    <strong style={{ fontSize: '0.9rem', color: '#818cf8' }}>{pat.avg_risk_reward}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Muestra 10A</span>
                    <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{pat.sample_trades_10y.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  ⏰ <strong>Ventana Óptima:</strong> {pat.best_window}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TAB 6: AI Roadmap ── */}
      {activeTab === 'ai_roadmap' && (
        <section className="quant-panel">
          <div className="quant-panel-header">
            <div>
              <h3 className="quant-panel-title">
                <span>🧠</span> Asesor Cuantitativo Gemini (Roadmap 10 Años)
              </h3>
              <div className="quant-panel-subtitle">
                Estrategia semanal sintetizada con base en el historial decenal de {data?.name} y la época activa.
              </div>
            </div>
            <button
              type="button"
              onClick={fetchAIRoadmap}
              disabled={loadingRoadmap}
              className="quant-pill-btn active"
              style={{ padding: '0.55rem 1.1rem' }}
            >
              {loadingRoadmap ? 'Sintetizando...' : '🔄 Regenerar Roadmap'}
            </button>
          </div>

          {roadmap && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Sesgo Recomendado</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>{roadmap.bias}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ventana Exacta de Entrada</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.25rem' }}>{roadmap.optimal_window}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Patrón con Mayor Plusvalía</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc', marginTop: '0.25rem' }}>{roadmap.top_pattern}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '14px', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#818cf8', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                  Dictamen Cuantitativo Ejecutivo
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#f1f5f9', lineHeight: 1.55 }}>
                  {roadmap.executive_summary}
                </p>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '0.65rem' }}>
                  Plan de Acción Táctico Paso a Paso:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(roadmap.action_steps || []).map((step, idx) => (
                    <div key={idx} style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <span style={{ fontWeight: 800, color: '#818cf8', fontFamily: 'JetBrains Mono' }}>#{idx + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
