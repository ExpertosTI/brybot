import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  const [data, setData] = useState<HistoricalDataResponse | null>(null);
  const [roadmap, setRoadmap] = useState<AIRoadmapResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'seasonality' | 'afluencia' | 'patterns' | 'ai_roadmap'>('seasonality');

  const symbols = [
    { id: 'NQ', name: 'Nasdaq 100', icon: '💻' },
    { id: 'ES', name: 'S&P 500', icon: '🏛️' },
    { id: 'BTC', name: 'Bitcoin', icon: '🪙' },
    { id: 'GC', name: 'Oro (Gold)', icon: '🥇' },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get<HistoricalDataResponse>(`/analysis/historical-patterns?symbol=${selectedSymbol}&years=${selectedYears}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching historical patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIRoadmap = async () => {
    setLoadingRoadmap(true);
    try {
      const res = await axios.post<AIRoadmapResponse>('/analysis/pattern-roadmap', {
        symbol: selectedSymbol,
        years: selectedYears,
      });
      setRoadmap(res.data);
    } catch (err) {
      console.error('Error generating AI roadmap:', err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSymbol, selectedYears]);

  useEffect(() => {
    if (activeTab === 'ai_roadmap' && !roadmap) {
      fetchAIRoadmap();
    }
  }, [activeTab, selectedSymbol]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Analizando 10 años de datos históricos institucionales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-white">
      {/* Header & Controls Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-xl shadow-lg">🏛️</span>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                Motor Cuantitativo de Patrones (5 a 10 Años)
              </h2>
              <p className="text-xs text-gray-400">
                Estacionalidad fractal, horarios de afluencia institucional y probabilidades para {data?.name || selectedSymbol}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset Pills */}
          <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-700/60">
            {symbols.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSymbol(s.id);
                  setRoadmap(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  selectedSymbol === s.id
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.id}</span>
              </button>
            ))}
          </div>

          {/* Years Selector */}
          <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-700/60 text-xs">
            {[5, 10].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYears(yr)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedYears === yr ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {yr} Años
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 shadow-lg">
          <div className="text-gray-400 text-xs font-medium">Retorno Anual Promedio ({selectedYears}A)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">+{data?.avg_annual_return_10y}%</div>
          <div className="text-[11px] text-gray-500 mt-1">Rentabilidad sostenida 10 años</div>
        </div>

        <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 shadow-lg">
          <div className="text-gray-400 text-xs font-medium">Win Rate Base Histórico</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{data?.historical_winrate_baseline}%</div>
          <div className="text-[11px] text-gray-500 mt-1">Tasa de acierto matemática</div>
        </div>

        <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 shadow-lg">
          <div className="text-gray-400 text-xs font-medium">Mejores Meses de Plusvalía</div>
          <div className="text-base font-bold text-purple-300 mt-1 truncate">
            {data?.best_months.slice(0, 2).join(', ')}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Meses de máxima expansión</div>
        </div>

        <div className="bg-[#111827] border border-gray-800/80 rounded-xl p-4 shadow-lg">
          <div className="text-gray-400 text-xs font-medium">Horario de Afluencia de Oro</div>
          <div className="text-base font-bold text-amber-400 mt-1">09:30 - 11:15 ET</div>
          <div className="text-[11px] text-gray-500 mt-1">Apertura NY + Silver Bullet</div>
        </div>
      </div>

      {/* Live Context Banner */}
      {data?.current_context && (
        <div className="bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-[#111827] border border-indigo-500/30 rounded-2xl p-4.5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Contexto Estacional Actual · {data.current_context.month_name} & {data.current_context.day_name}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {data.current_context.recommendation_action}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-indigo-900/40 px-3.5 py-2 rounded-xl border border-indigo-500/20 text-xs">
            <span className="text-gray-400">Veredicto 10A:</span>
            <span className="font-bold text-emerald-400">{data.current_context.verdict_status}</span>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-gray-800 gap-6 text-sm font-medium">
        {[
          { id: 'seasonality', label: '📅 Estacionalidad (12 Meses & Semanal)' },
          { id: 'afluencia', label: '⚡ Horas de Afluencia y Liquidez' },
          { id: 'patterns', label: '🎯 Patrones Recurrentes (Win Rate)' },
          { id: 'ai_roadmap', label: '🧠 Roadmap Cuantitativo Gemini' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 transition-all relative ${
              activeTab === tab.id
                ? 'text-indigo-400 font-bold border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Seasonality */}
      {activeTab === 'seasonality' && (
        <div className="space-y-6">
          {/* Monthly Seasonality Matrix */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <span>📊</span> Rendimiento y Tasa de Acierto Mes a Mes ({selectedYears} Años)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data?.monthly_seasonality.map((m) => {
                const isPositive = m.avg_return >= 0;
                const isCurrentMonth = m.name.toLowerCase() === data.current_context.month_name.toLowerCase();

                return (
                  <div
                    key={m.month}
                    className={`rounded-xl p-3 border transition-all ${
                      isCurrentMonth
                        ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-[#1F2937]/50 border-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span className="font-bold">{m.name}</span>
                      {isCurrentMonth && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-bold">HOY</span>}
                    </div>

                    <div className={`text-lg font-extrabold mt-1.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? `+${m.avg_return}%` : `${m.avg_return}%`}
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Win Rate:</span>
                        <span className="font-bold text-gray-300">{m.win_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${m.win_rate}%` }}
                        ></div>
                      </div>
                      <div className="text-[10px] text-gray-500 text-right">Vol: {m.volatility}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekday Stats */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <span>🗓️</span> Comportamiento por Día de la Semana
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data?.weekday_stats.map((d) => (
                <div key={d.day} className="bg-[#1F2937]/40 border border-gray-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-200">{d.day}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-indigo-300 font-semibold">{d.volume_rank}</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-emerald-400">{d.bullish_bias}%</span>
                    <span className="text-xs text-gray-400">Sesgo Alcista</span>
                  </div>

                  <div className="text-xs text-gray-400">
                    Rango Prom: <strong className="text-gray-200">{d.avg_range_pts} pts</strong>
                  </div>

                  <p className="text-[11px] text-gray-400 italic pt-1 border-t border-gray-800">
                    "{d.note}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Hourly Afluencia */}
      {activeTab === 'afluencia' && (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
                <span>⚡</span> Curva de Afluencia, Liquidez y Sesiones Institucionales
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Volumen relativo de transacciones institucionales y ventanas ideales para evitar trampas
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Óptimo</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-600"></span> Evitar</span>
            </div>
          </div>

          <div className="space-y-3">
            {data?.hourly_afluencia.map((h) => (
              <div
                key={h.hour}
                className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  h.actionable
                    ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                    : 'bg-[#1F2937]/30 border-gray-800/80 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 w-48">
                  <span className="font-mono text-sm font-bold text-gray-300">{h.time_label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    h.actionable ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {h.session}
                  </span>
                </div>

                {/* Volume Bar */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Afluencia / Liquidez:</span>
                    <span className="font-bold text-gray-200">{h.volume_score}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.volume_score > 70 ? 'bg-emerald-400' : (h.volume_score > 40 ? 'bg-amber-400' : 'bg-gray-600')}`}
                      style={{ width: `${h.volume_score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Note */}
                <div className="md:w-64 text-xs text-gray-300">
                  {h.note || 'Sesión de baja volatilidad'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Recurrent Patterns */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.recurrent_patterns.map((pat) => (
              <div
                key={pat.id}
                className="bg-[#111827] border border-gray-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-xl space-y-4 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-indigo-400">🎯</span> {pat.name}
                  </h4>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs">
                    Win Rate {pat.win_rate_10y}%
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {pat.description}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800 text-center">
                  <div className="bg-[#1F2937]/50 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">Profit Factor</div>
                    <div className="text-sm font-bold text-purple-400">{pat.profit_factor}</div>
                  </div>
                  <div className="bg-[#1F2937]/50 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">Ratio R:B</div>
                    <div className="text-sm font-bold text-indigo-400">{pat.avg_risk_reward}</div>
                  </div>
                  <div className="bg-[#1F2937]/50 p-2 rounded-lg">
                    <div className="text-[10px] text-gray-400">Muestra (10A)</div>
                    <div className="text-sm font-bold text-gray-300">{pat.sample_trades_10y.toLocaleString()}</div>
                  </div>
                </div>

                <div className="text-xs text-amber-300/90 flex items-center gap-1.5 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                  <span>⏰</span> <strong>Ventana Óptima:</strong> {pat.best_window}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AI Roadmap */}
      {activeTab === 'ai_roadmap' && (
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🧠</span> Asesor Cuantitativo Gemini (Roadmap 10 Años)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Estrategia semanal sintetizada con base en el historial estadístico de {data?.name}
              </p>
            </div>
            <button
              onClick={fetchAIRoadmap}
              disabled={loadingRoadmap}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loadingRoadmap ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sintetizando...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Regenerar Roadmap</span>
                </>
              )}
            </button>
          </div>

          {roadmap && (
            <div className="space-y-5 animate-fadeIn">
              {/* Top Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Sesgo Recomendado</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{roadmap.bias}</div>
                </div>
                <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Ventana Exacta de Entrada</div>
                  <div className="text-lg font-bold text-amber-300 mt-1">{roadmap.optimal_window}</div>
                </div>
                <div className="bg-[#1F2937]/60 border border-gray-800 rounded-xl p-4">
                  <div className="text-xs text-gray-400">Patrón con Mayor Plusvalía</div>
                  <div className="text-sm font-bold text-purple-300 mt-1">{roadmap.top_pattern}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4.5 space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Dictamen Cuantitativo</h4>
                <p className="text-sm text-gray-200 leading-relaxed">{roadmap.executive_summary}</p>
              </div>

              {/* Action Steps */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan de Acción Paso a Paso</h4>
                <div className="space-y-2">
                  {roadmap.action_steps.map((step, idx) => (
                    <div key={idx} className="bg-[#1F2937]/40 border border-gray-800 p-3 rounded-xl text-xs text-gray-300 flex items-start gap-2.5">
                      <span className="font-bold text-indigo-400">#{idx + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
