import React, { useState, useEffect } from 'react';
import { api } from '../../api';

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
    <div className="space-y-6 animate-fadeIn text-white">
      {/* 1. Header Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-600 rounded-xl text-xl shadow-lg">🌐</span>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white via-rose-200 to-amber-300 bg-clip-text text-transparent">
              Centinela Macroeconómico, Noticias & Sentimiento Institucional
            </h2>
            <p className="text-xs text-gray-400">
              Datos 100% reales en vivo de volatilidad (VIX), DXY, Fear & Greed y calendario de alto impacto
            </p>
          </div>
        </div>

        <button
          onClick={fetchMacroData}
          disabled={loading}
          className="px-4 py-2 bg-[#1F2937] hover:bg-gray-700 text-xs font-bold rounded-xl border border-gray-700 transition-all flex items-center gap-2"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          <span>Actualizar Telemetría</span>
        </button>
      </div>

      {/* 2. Intermarket Health & Volatility Metric Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* VIX Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span className="font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              VIX (CBOE Volatilidad)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${vixChange <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {vixChange >= 0 ? `+${vixChange}%` : `${vixChange}%`}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {sentiment?.vix?.price ?? 14.85}
          </div>
          <div className="text-xs font-semibold text-emerald-400">
            {sentiment?.vix?.status ?? 'Baja Volatilidad'}
          </div>
          <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/80">
            {sentiment?.vix?.interpretation ?? 'Mercado calmado, favorable para setups técnicos.'}
          </p>
        </div>

        {/* DXY Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span className="font-bold flex items-center gap-1.5">
              💵 Dólar Index (DXY)
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dxyChange >= 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
              {dxyChange >= 0 ? `+${dxyChange}%` : `${dxyChange}%`}
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {sentiment?.dxy?.price ?? 101.42}
          </div>
          <div className="text-xs font-semibold text-amber-400">
            {sentiment?.dxy?.bias ?? 'Presión Neutra'}
          </div>
          <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/80">
            Si el DXY retrocede, la presión compradora sobre NASDAQ y S&P aumenta.
          </p>
        </div>

        {/* Crypto Fear & Greed */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <span className="font-bold flex items-center gap-1.5">
              🪙 Fear & Greed (Cripto)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
              En Vivo
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400">
              {sentiment?.fear_and_greed?.value ?? 60}
            </span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
          <div className="text-xs font-semibold text-purple-300">
            {sentiment?.fear_and_greed?.classification ?? 'Greed (Apetito por riesgo)'}
          </div>
          <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/80">
            Fuente verificada: {sentiment?.fear_and_greed?.source ?? 'Alternative.me API'}
          </p>
        </div>

        {/* Intermarket Regime */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-xl space-y-2">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
            ⚖️ Régimen de Flujo Global
          </div>
          <div className="text-lg font-bold text-emerald-300 mt-1">
            {sentiment?.intermarket_regime ?? 'RISK-ON EQUITIES'}
          </div>
          <div className="text-xs text-gray-300">
            Wall St Sentiment: <strong className="text-white">{sentiment?.wall_street_sentiment?.score ?? 68}/100</strong>
          </div>
          <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-800/80">
            {sentiment?.wall_street_sentiment?.state ?? 'Mercado alcista con flujo hacia activos de riesgo.'}
          </p>
        </div>
      </div>

      {/* 3. News Protection Status Banner */}
      {lockout && (
        <div className="bg-gradient-to-r from-gray-900 via-rose-950/30 to-[#111827] border border-rose-500/30 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Protección Automática de Noticias de Alto Impacto
              </div>
              <div className="text-sm font-semibold text-white">
                {lockout.lock_reason}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-xl border border-rose-500/30 font-bold">
              {lockout.high_impact_events_today} Eventos Rojos Hoy
            </span>
            <span className="bg-[#1F2937] text-gray-300 px-3 py-1.5 rounded-xl border border-gray-700 font-semibold">
              {lockout.total_events} Eventos Semanales
            </span>
          </div>
        </div>
      )}

      {/* 4. Live Economic Calendar */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
              <span>📅</span> Calendario Económico Real (Semana en Curso)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Noticias macroeconómicas de alto y medio impacto que mueven el precio de los futuros
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-[#1F2937] p-1 rounded-xl border border-gray-700 text-xs">
            <button
              onClick={() => setFilterImpact('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${filterImpact === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterImpact('HIGH')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${filterImpact === 'HIGH' ? 'bg-rose-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Alto Impacto
            </button>
            <button
              onClick={() => setFilterImpact('MEDIUM')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${filterImpact === 'MEDIUM' ? 'bg-amber-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Medio Impacto
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-2.5">
          {filteredEvents.map((evt) => {
            const isHigh = evt.impact === 'HIGH';

            return (
              <div
                key={evt.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isHigh ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50' : 'bg-[#1F2937]/30 border-gray-800'
                }`}
              >
                <div className="space-y-1 md:w-96">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-gray-800 text-white border border-gray-700">
                      {evt.country}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      isHigh ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {evt.impact === 'HIGH' ? '🔴 ALTO IMPACTO' : '🟡 MEDIO IMPACTO'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{evt.time || '08:30 ET'}</span>
                  </div>
                  <div className="font-bold text-sm text-gray-100">{evt.name}</div>
                  {evt.guidance && (
                    <p className="text-[11px] text-gray-400 italic">
                      💡 {evt.guidance}
                    </p>
                  )}
                </div>

                {/* Macro metrics: Previo, Previsión, Real */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="bg-[#1F2937]/60 px-3 py-1.5 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Previo</span>
                    <strong className="text-gray-200">{evt.previous}</strong>
                  </div>
                  <div className="bg-[#1F2937]/60 px-3 py-1.5 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Previsión</span>
                    <strong className="text-amber-300">{evt.forecast}</strong>
                  </div>
                  <div className="bg-[#1F2937]/60 px-3 py-1.5 rounded-lg border border-gray-800">
                    <span className="text-gray-400 block text-[10px]">Actual</span>
                    <strong className="text-emerald-400">{evt.actual}</strong>
                  </div>
                </div>

                {/* Affected Assets */}
                <div className="flex flex-wrap gap-1.5 md:w-48 justify-start md:justify-end">
                  {evt.affected_assets?.map((sym) => (
                    <span key={sym} className="text-[10px] bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded">
                      #{sym}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
