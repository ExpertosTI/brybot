import React, { useState } from 'react';

interface NewsItem {
  id: string;
  time: string;
  source: string;
  headline: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium';
}

export const MarketNewsSentiment: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'HIGH'>('ALL');

  const newsList: NewsItem[] = [
    {
      id: '1',
      time: 'Hace 4 min',
      source: 'BLOOMBERG TERMINAL',
      headline: 'Fed Chair Powell destaca progreso continuo en la desinflación; mercados descuentan mayor probabilidad de flexibilización monetaria.',
      sentiment: 'bullish',
      impact: 'high',
    },
    {
      id: '2',
      time: 'Hace 14 min',
      source: 'REUTERS FINANCIAL',
      headline: 'Rendimiento de los bonos del Tesoro a 10 años retrocede a 4.08%, impulsando la demanda compradora en futuros del NASDAQ 100.',
      sentiment: 'bullish',
      impact: 'high',
    },
    {
      id: '3',
      time: 'Hace 28 min',
      source: 'CME LIQUIDITY FEED',
      headline: 'Fuerte volumen institucional de compra detectado en contratos E-mini NQ en la zona de soporte 19,720.00 - 19,740.00.',
      sentiment: 'bullish',
      impact: 'medium',
    },
    {
      id: '4',
      time: 'Hace 42 min',
      source: 'WALL STREET JOURNAL',
      headline: 'Sector Semiconductores e Inteligencia Artificial lidera el rally de apertura de Nueva York con entradas de fondos pasivos.',
      sentiment: 'bullish',
      impact: 'high',
    },
    {
      id: '5',
      time: 'Hace 1h 10m',
      source: 'ECONOMIC INSIGHT',
      headline: 'Subasta de deuda del Tesoro supera expectativas de demanda internacional, reduciendo la prima de riesgo macro.',
      sentiment: 'neutral',
      impact: 'medium',
    },
  ];

  const filteredNews = filter === 'HIGH' ? newsList.filter((n) => n.impact === 'high') : newsList;

  return (
    <div className="panel-card market-news-sentiment-panel">
      <div className="panel-header">
        <div className="header-left">
          <span className="panel-eyebrow">MACRO DATA & SENTIMIENTO GLOBAL</span>
          <h3>Lectura de Mercado & Noticias en Vivo</h3>
        </div>
        <div className="news-filter-pills">
          <button
            type="button"
            className={`n-pill ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            Todas
          </button>
          <button
            type="button"
            className={`n-pill ${filter === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilter('HIGH')}
          >
            🔴 Alto Impacto
          </button>
        </div>
      </div>

      {/* Realtime Sentiment Gauge */}
      <div className="sentiment-hero-box">
        <div className="sentiment-top-row">
          <div className="sentiment-title">
            <span className="sent-badge bullish">BULLISH BIAS (76%)</span>
            <strong>Tendencia Predominante: Alcista</strong>
          </div>
          <span className="institutional-flow">Flujo Institucional: <strong>ACUMULACIÓN</strong></span>
        </div>

        <div className="sentiment-ratio-bar">
          <div className="ratio-bullish" style={{ width: '76%' }}>
            <span>76% Compradores</span>
          </div>
          <div className="ratio-bearish" style={{ width: '24%' }}>
            <span>24%</span>
          </div>
        </div>

        <p className="sentiment-synthesis">
          Los catalizadores de política monetaria y la relajación de tasas soberanas mantienen una presión compradora sostenida sobre los índices de tecnología (NASDAQ / NQ). Se favorecen compras en retrocesos hacia soportes institucionales.
        </p>
      </div>

      {/* Economic Calendar Event Banner */}
      <div className="macro-calendar-banner">
        <div className="cal-left">
          <span className="cal-impact-tag high">🔴 EVENTO DE ALTO IMPACTO</span>
          <span className="cal-event-name">Minutas del Comité Federal de Mercado Abierto (FOMC)</span>
        </div>
        <div className="cal-right">
          <span className="cal-countdown">EN 2H 15M</span>
          <span className="cal-volatility">Volatilidad Esperada: ALTA</span>
        </div>
      </div>

      {/* News Feed Stream */}
      <div className="news-stream-list">
        {filteredNews.map((news) => (
          <div key={news.id} className="news-item-card">
            <div className="news-item-meta">
              <span className="news-source">{news.source}</span>
              <span className="news-time">{news.time}</span>
              <span className={`news-impact-tag ${news.impact}`}>
                {news.impact === 'high' ? 'ALTO IMPACTO' : 'MEDIO'}
              </span>
            </div>
            <p className="news-headline">{news.headline}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
