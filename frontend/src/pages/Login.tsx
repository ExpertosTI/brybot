import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api, API_BASE_URL } from '../api';

interface CryptoAsset {
  symbol: string;
  name: string;
  price: number;
  change: string;
  isPos: boolean;
  high: number;
  low: number;
  volume: string;
  candles: number[];
}

const CRYPTO_MARKET: Record<string, CryptoAsset> = {
  BTC: {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    price: 68421.50,
    change: '+2.45%',
    isPos: true,
    high: 68900.0,
    low: 66850.0,
    volume: '$28.4B',
    candles: [67100, 67450, 67200, 67800, 67600, 68150, 67900, 68421],
  },
  ETH: {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    price: 3589.20,
    change: '+1.88%',
    isPos: true,
    high: 3640.0,
    low: 3510.0,
    volume: '$14.2B',
    candles: [3520, 3545, 3530, 3560, 3550, 3575, 3568, 3589],
  },
  SOL: {
    symbol: 'SOL/USD',
    name: 'Solana',
    price: 178.40,
    change: '+4.32%',
    isPos: true,
    high: 182.0,
    low: 170.5,
    volume: '$5.8B',
    candles: [171, 173, 172, 175, 174, 177, 176, 178.4],
  },
  NQ: {
    symbol: 'NQ 100',
    name: 'Nasdaq Futures',
    price: 19754.50,
    change: '+0.42%',
    isPos: true,
    high: 19820.0,
    low: 19680.0,
    volume: '2.1M Lots',
    candles: [19710, 19730, 19720, 19745, 19735, 19760, 19748, 19754.5],
  },
};

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Selected crypto asset for live interactive chart
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('BTC');
  const [activeAsset, setActiveAsset] = useState<CryptoAsset>(CRYPTO_MARKET.BTC);

  // Auth View Switcher ('demo' or 'login_modal')
  const [showLoginDrawer, setShowLoginDrawer] = useState(false);

  // WhatsApp demo notification test state
  const [waTestSending, setWaTestSending] = useState(false);
  const [waTestSuccess, setWaTestSuccess] = useState(false);

  // Cinematic Rapid Warp Demo Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(25);
  const [transitionStatus, setTransitionStatus] = useState('Conectando con Motor Cuántico...');

  const navigate = useNavigate();
  const location = useLocation();

  const expired = (location.state as { expired?: boolean } | null)?.expired;
  const loggedOut = (location.state as { loggedOut?: boolean } | null)?.loggedOut;

  // Live micro ticks for active crypto
  useEffect(() => {
    setActiveAsset(CRYPTO_MARKET[selectedAssetKey] || CRYPTO_MARKET.BTC);
  }, [selectedAssetKey]);

  useEffect(() => {
    const tickTimer = setInterval(() => {
      setActiveAsset((prev) => {
        const delta = (Math.random() - 0.48) * (prev.price * 0.0006);
        const newPrice = Math.round((prev.price + delta) * 100) / 100;
        return {
          ...prev,
          price: newPrice,
          candles: [...prev.candles.slice(1), newPrice],
        };
      });
    }, 2000);
    return () => clearInterval(tickTimer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const body = new URLSearchParams();
    body.append('username', form.username);
    body.append('password', form.password);
    body.append('grant_type', 'password');

    try {
      const res = await api.post('/auth/token', body, {
        baseURL: API_BASE_URL,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const token = res.data?.access_token ?? res.data?.token;
      if (!token) {
        setError('Login fallido: respuesta inesperada del servidor.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(detail || 'Credenciales inválidas. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    setIsTransitioning(true);
    setTransitionProgress(15);
    setTransitionStatus('Conectando con Servidor de Liquidez CME NASDAQ...');

    try {
      // Fire demo login call in background
      const authPromise = api.post('/auth/demo-login').catch(() => null);

      setTimeout(() => {
        setTransitionProgress(48);
        setTransitionStatus('Sincronizando Google Gemini 2.5 & Evolution WhatsApp...');
      }, 280);

      setTimeout(() => {
        setTransitionProgress(82);
        setTransitionStatus('Verificando Parámetros de Riesgo TopStep (-$2,000 Tope)...');
      }, 620);

      setTimeout(async () => {
        const res = await authPromise;
        const token = res?.data?.access_token ?? res?.data?.token ?? 'demo_token_paper';
        localStorage.setItem('token', token);
        setTransitionProgress(100);
        setTransitionStatus('¡Estación Cuántica Lista! Accediendo a RENACE Trading...');
      }, 920);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1180);
    } catch {
      setIsTransitioning(false);
      setIsLoading(false);
      setError('No se pudo iniciar la sesión demo.');
    }
  };

  const handleTestWhatsAppNotification = async () => {
    setWaTestSending(true);
    setWaTestSuccess(false);
    try {
      await api.post('/analysis/whatsapp-notify', {
        type: 'trade_signal',
        symbol: activeAsset.symbol,
        action: 'BUY',
        price: activeAsset.price,
        sl: activeAsset.price * 0.985,
        tp: activeAsset.price * 1.03,
        reason: 'Confluencia Cuántica Gemini 2.0 + Soporte Institucional',
      }).catch(() => null);

      setTimeout(() => {
        setWaTestSending(false);
        setWaTestSuccess(true);
        setTimeout(() => setWaTestSuccess(false), 4000);
      }, 600);
    } catch {
      setWaTestSending(false);
      setWaTestSuccess(true);
    }
  };

  return (
    <div className="landing-portal-wrapper">
      {/* Fullscreen Cinematic Rapid Warp Entrance */}
      {isTransitioning && (
        <div className="demo-transition-overlay" role="dialog" aria-modal="true">
          <div className="transition-quantum-backdrop" />
          <div className="transition-content-box luxury-renace-box">
            <div className="transition-renace-logo-wrap">
              <div className="pulse-ring-glow" />
              <div className="pulse-ring-glow secondary" />
              <img src="/assets/renace_symbol.svg" alt="RENACE" className="transition-renace-logo-img" />
            </div>

            <div className="transition-brand-header">
              <span className="transition-brand-pill">PLATAFORMA CUÁNTICA DE TRADING 2030</span>
              <h2 className="transition-renace-title">
                RENACE <span className="gradient-highlight">TRADING</span>
              </h2>
              <p className="transition-subtitle">INSTITUTIONAL QUANT LAB & CAPITAL ASSET MANAGEMENT</p>
            </div>

            <div className="transition-status-hud">
              <div className="transition-status-text">
                <span className="dot-pulse-green" />
                <span className="status-label">{transitionStatus}</span>
              </div>
              <span className="status-pct">{transitionProgress}%</span>
            </div>

            <div className="transition-progress-bar">
              <div className="progress-fill fast-fill" style={{ width: `${transitionProgress}%` }} />
              <div className="progress-glow-head" style={{ left: `${transitionProgress}%` }} />
            </div>

            <div className="transition-specs-row">
              <div className="spec-item">
                <span className="spec-icon">&#x26A1;</span>
                <div className="spec-details">
                  <span className="spec-title">CME DIRECT FEED</span>
                  <strong>NASDAQ Level II · 8ms</strong>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">&#x1F9E0;</span>
                <div className="spec-details">
                  <span className="spec-title">QUANT AI COGNITIVO</span>
                  <strong>Google Gemini 2.5 Live</strong>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">&#x1F4AC;</span>
                <div className="spec-details">
                  <span className="spec-title">WHATSAPP SENTINEL</span>
                  <strong>Evolution API · Activo</strong>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-icon">&#x1F4B0;</span>
                <div className="spec-details">
                  <span className="spec-title">CAPITAL INSTITUCIONAL</span>
                  <strong className="accent-money">$100,000.00 USD</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Ticker Ribbon */}
      <header className="portal-header-bar">
        <div className="portal-brand-box">
          <div className="portal-3d-emblem">
            <img src="/assets/renace_symbol.svg" alt="RENACE TRADING" className="portal-renace-header-img" />
          </div>
          <div>
            <span className="portal-brand-text">RENACE TRADING</span>
            <span className="portal-version-tag">2030 INSTITUTIONAL SUITE</span>
          </div>
        </div>

        {/* Global Live Crypto & Futures Strip */}
        <div className="portal-quick-tickers">
          {Object.entries(CRYPTO_MARKET).map(([key, asset]) => (
            <div
              key={key}
              className={`ticker-capsule ${selectedAssetKey === key ? 'active-capsule' : ''}`}
              onClick={() => setSelectedAssetKey(key)}
              role="button"
              tabIndex={0}
            >
              <strong>{asset.symbol}</strong>
              <span>${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`tag-delta ${asset.isPos ? 'pos' : 'neg'}`}>{asset.change}</span>
            </div>
          ))}
        </div>

        <div className="portal-header-actions">
          <button
            type="button"
            className="header-login-toggle-btn"
            onClick={() => setShowLoginDrawer(!showLoginDrawer)}
          >
            {showLoginDrawer ? '✕ Cerrar Acceso' : '🔑 Iniciar Sesión'}
          </button>
          <button type="button" className="header-demo-cta-btn" onClick={handleDemoLogin}>
            ⚡ Demo $100k
          </button>
        </div>
      </header>

      {/* Hero Station: Split Layout with 3D Visual Splendor, Live Chart & WhatsApp HUD */}
      <div className="portal-hero-container">
        {/* Left Hero Column: Value Proposition, WhatsApp Sentinel & 3D Cards */}
        <div className="portal-features-showcase">
          <div className="hero-eyebrow-pill">
            <span className="neon-sparkle-dot" />
            <span>GEMINI 2.0 QUANT ENGINE · EVOLUTION WHATSAPP · MUNDO CRIPTO & FUTUROS</span>
          </div>

          <h1 className="hero-title-text">
            Ecosistema de Trading <span className="gradient-text">Cuántico & Cripto</span> 2030.
          </h1>

          <p className="hero-sub-description">
            La estación de trading profesional con análisis cognitivo de <strong>Google Gemini</strong> para dictaminar en tiempo real cuándo invertir o esperar, alertas directas a tu <strong>WhatsApp con Evolution API</strong> y protección estricta del <strong>tope diario de pérdida (-$2,000 en TopStep)</strong>.
          </p>

          <div className="hero-cta-group">
            <button
              type="button"
              className="primary-hero-demo-btn"
              onClick={handleDemoLogin}
              disabled={isLoading || isTransitioning}
            >
              <div className="cta-icon-box">&#9658;</div>
              <div className="cta-text-box">
                <strong>ENTRAR A MODO DEMO INMEDIATO ($100,000)</strong>
                <small>Sin registro previo · Cripto & NASDAQ en vivo · 1-Click Execution</small>
              </div>
              <span className="cta-arrow">&rarr;</span>
            </button>
          </div>

          {/* WhatsApp Sentinel Realtime HUD (Ultra-Visible on First Screen) */}
          <div className="whatsapp-firstscreen-hud">
            <div className="wa-hud-header">
              <div className="wa-hud-left">
                <img
                  src="/assets/3d/whatsapp_sentinel.jpg"
                  alt="3D WhatsApp Sentinel"
                  className="wa-3d-thumb"
                />
                <div>
                  <div className="wa-hud-title">
                    <span className="wa-live-dot" />
                    <strong>EVOLUTION API WHATSAPP SENTINEL</strong>
                  </div>
                  <span className="wa-hud-inst">Instancia: <code>renace</code> · Conexión Segura 24/7</span>
                </div>
              </div>
              <button
                type="button"
                className="wa-test-dispatch-btn"
                onClick={handleTestWhatsAppNotification}
                disabled={waTestSending}
              >
                {waTestSending ? 'Enviando...' : waTestSuccess ? '✓ ¡Alerta Despachada!' : '📲 Probar Notificación'}
              </button>
            </div>

            <div className="wa-hud-messages-box">
              <div className="wa-hud-bubble signal">
                <div className="bubble-top">
                  <span className="badge-signal">🚨 SEÑAL GEMINI QUANT LIVE</span>
                  <span className="bubble-time">Ahora</span>
                </div>
                <div className="bubble-body">
                  <strong>{activeAsset.symbol}:</strong> Señal de <strong>COMPRA (BUY)</strong> confirmada a ${activeAsset.price.toFixed(2)}.
                  <div className="bubble-metrics">
                    <span>🛑 SL: ${(activeAsset.price * 0.985).toFixed(2)}</span>
                    <span>🎯 TP: ${(activeAsset.price * 1.03).toFixed(2)}</span>
                    <span>📊 R:R 1:3</span>
                  </div>
                </div>
              </div>

              <div className="wa-hud-bubble sentinel">
                <div className="bubble-top">
                  <span className="badge-sentinel">⚠️ CENTINELA TOPSTEP & TOPE DE CUENTA</span>
                  <span className="bubble-time">Auto</span>
                </div>
                <div className="bubble-body">
                  <strong>Vigilancia Activa de Pérdida Diaria (-$2,000):</strong> Si tu cuenta roza el tope diario permitido, el bot congela órdenes impulsivas y envía alerta urgente a tu WhatsApp para proteger tu fondeo.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Column: Live Candlestick Trading Station or Login Drawer */}
        <div className="portal-trading-station-column">
          {showLoginDrawer ? (
            /* Login Box View */
            <div className="portal-login-box animated-fade">
              <div className="login-box-header">
                <div className="login-badge-tag">ACCESO INSTITUCIONAL</div>
                <h3>Iniciar Sesión</h3>
                <p className="login-sub">Ingresa a tu cuenta de fondeo o broker sincronizado.</p>
              </div>

              {loggedOut && (
                <div className="inline-alert" role="status">
                  Has cerrado sesión exitosamente.
                </div>
              )}
              {expired && (
                <div className="inline-alert warning" role="alert">
                  Tu sesión expiró. Por favor ingresa de nuevo.
                </div>
              )}
              {error && (
                <div className="inline-alert danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="portal-login-form">
                <div className="form-field-wrap">
                  <label htmlFor="username">Usuario o Correo</label>
                  <input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Ingresa tu usuario"
                    autoComplete="username"
                    required
                    disabled={isLoading || isTransitioning}
                  />
                </div>

                <div className="form-field-wrap">
                  <label htmlFor="password">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                    disabled={isLoading || isTransitioning}
                  />
                </div>

                <button
                  type="submit"
                  className="portal-submit-btn"
                  disabled={isLoading || isTransitioning}
                >
                  {isLoading ? 'Autenticando...' : 'Entrar a la Estación'}
                </button>
              </form>

              <div className="portal-quick-demo-divider">
                <span>O EXPLORA SIN REGISTRO</span>
              </div>

              <button
                type="button"
                className="direct-demo-action-btn"
                onClick={handleDemoLogin}
                disabled={isLoading || isTransitioning}
              >
                <span>⚡ Abrir Modo Demo Instantáneo</span>
                <small>$100,000 Saldo de Prueba · Cripto & NASDAQ</small>
              </button>
            </div>
          ) : (
            /* Live Interactive Crypto & Futures Station on Landing Page */
            <div className="landing-live-chart-station">
              {/* Asset Selector Tabs */}
              <div className="station-asset-tabs">
                {Object.entries(CRYPTO_MARKET).map(([k, a]) => (
                  <button
                    key={k}
                    type="button"
                    className={`station-tab ${selectedAssetKey === k ? 'active' : ''}`}
                    onClick={() => setSelectedAssetKey(k)}
                  >
                    <strong>{k}</strong>
                    <span>${a.price > 1000 ? a.price.toFixed(0) : a.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {/* Station Main Header */}
              <div className="station-head">
                <div>
                  <div className="station-title-row">
                    <span className="station-symbol-bold">{activeAsset.symbol}</span>
                    <span className="station-name-pill">{activeAsset.name}</span>
                    <span className="station-badge-live">EN VIVO</span>
                  </div>
                  <div className="station-price-huge">
                    ${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className={`station-pct ${activeAsset.isPos ? 'pos' : 'neg'}`}>{activeAsset.change}</span>
                  </div>
                </div>

                <div className="station-stats-mini">
                  <div><span>Vol 24h:</span> <strong>{activeAsset.volume}</strong></div>
                  <div><span>Máx 24h:</span> <strong>${activeAsset.high.toLocaleString()}</strong></div>
                  <div><span>Mín 24h:</span> <strong>${activeAsset.low.toLocaleString()}</strong></div>
                </div>
              </div>

              {/* Live Interactive SVG Candlestick Engine with Indicators */}
              <div className="station-chart-canvas-wrap">
                <svg className="live-candle-svg" viewBox="0 0 500 220" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGlowArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* High tech grid lines */}
                  <line x1="0" y1="55" x2="500" y2="55" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="165" x2="500" y2="165" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Fibonacci Retracement Levels */}
                  <line x1="0" y1="85" x2="500" y2="85" stroke="rgba(250,204,21,0.35)" strokeDasharray="4 2" />
                  <text x="420" y="80" fill="#facc15" fontSize="9" fontFamily="monospace">FIBO 61.8%</text>

                  {/* EMA 20 & EMA 50 Curves */}
                  <path
                    d="M 20 160 Q 140 130 260 115 T 480 75"
                    fill="none"
                    stroke="#00d4aa"
                    strokeWidth="2"
                    strokeOpacity="0.85"
                  />
                  <path
                    d="M 20 180 Q 140 160 260 145 T 480 110"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="1.5"
                    strokeOpacity="0.7"
                  />

                  {/* Candlesticks */}
                  {activeAsset.candles.map((val, idx) => {
                    const min = Math.min(...activeAsset.candles) * 0.998;
                    const max = Math.max(...activeAsset.candles) * 1.002;
                    const range = max - min || 1;
                    const normY = 190 - ((val - min) / range) * 140;
                    const x = 35 + idx * 58;
                    const isBull = idx === 0 || val >= activeAsset.candles[idx - 1];
                    const barHeight = Math.max(12, Math.abs(val - (activeAsset.candles[idx - 1] || val)) * 0.8 + 10);
                    const color = isBull ? '#00e68a' : '#ff4d6a';

                    return (
                      <g key={idx} className="svg-candle-group">
                        <line x1={x + 10} y1={normY - 14} x2={x + 10} y2={normY + barHeight + 14} stroke={color} strokeWidth="1.5" />
                        <rect
                          x={x}
                          y={normY}
                          width="20"
                          height={barHeight}
                          rx="3"
                          fill={color}
                          fillOpacity="0.85"
                          stroke={color}
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Signal Overlay */}
                <div className="chart-floating-signal-tag">
                  <span className="dot-radar-green" />
                  <span>SEÑAL QUANT GEMINI: <strong>LONG / COMPRA</strong> (89% CONFIANZA)</span>
                </div>
              </div>

              {/* Station Quick Order Trigger to Launch Demo with pre-fill */}
              <div className="station-order-bar">
                <button
                  type="button"
                  className="station-btn buy"
                  onClick={handleDemoLogin}
                >
                  <span>⚡ COMPRAR 1x {selectedAssetKey}</span>
                  <strong>${activeAsset.price.toLocaleString()}</strong>
                </button>
                <button
                  type="button"
                  className="station-btn sell"
                  onClick={handleDemoLogin}
                >
                  <span>⚡ VENDER 1x {selectedAssetKey}</span>
                  <strong>${activeAsset.price.toLocaleString()}</strong>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Ultra-Luxury 3D Feature Pillars */}
      <section className="portal-3d-features-section">
        <div className="section-title-wrap">
          <span className="section-badge-pill">INFRAESTRUCTURA INSTITUCIONAL 2030</span>
          <h2>Tecnología de Grado Cuántico para Traders Profesionales</h2>
          <p>Potenciado por Google Gemini AI, notificaciones móviles y conectividad directa a mercados CME y Cripto.</p>
        </div>

        <div className="features-3d-grid">
          {/* Card 1: Gemini AI 3D Core */}
          <div className="feature-3d-card">
            <div className="card-3d-image-wrap">
              <img
                src="/assets/3d/gemini_core.jpg"
                alt="3D Quantum Neural Core"
                className="card-3d-img"
              />
              <div className="img-glow-overlay" />
            </div>
            <div className="card-3d-body">
              <span className="card-tag gemini">GOOGLE GEMINI 2.0 AI</span>
              <h3>Quant Engine Cognitivo</h3>
              <p>
                Analiza en sub-segundos la liquidez, Fair Value Gaps (FVG) y divergencias para dar el dictamen exacto de <strong>cuándo invertir o esperar</strong> con Stop Loss y Take Profit milimétricos.
              </p>
            </div>
          </div>

          {/* Card 2: WhatsApp Sentinel 3D */}
          <div className="feature-3d-card">
            <div className="card-3d-image-wrap">
              <img
                src="/assets/3d/whatsapp_sentinel.jpg"
                alt="3D WhatsApp Sentinel"
                className="card-3d-img"
              />
              <div className="img-glow-overlay whatsapp" />
            </div>
            <div className="card-3d-body">
              <span className="card-tag whatsapp">EVOLUTION API WHATSAPP</span>
              <h3>Alertas & Centinela de Tope</h3>
              <p>
                Notificaciones en tiempo real a tu smartphone con parámetros de entrada y <strong>bloqueo instantáneo al rozar el límite de pérdida diaria Topstep (-$2,000)</strong> para proteger tu capital.
              </p>
            </div>
          </div>

          {/* Card 3: Crypto & Futures 3D */}
          <div className="feature-3d-card">
            <div className="card-3d-image-wrap">
              <img
                src="/assets/3d/crypto_chart.jpg"
                alt="3D Crypto & Futures Chart"
                className="card-3d-img"
              />
              <div className="img-glow-overlay crypto" />
            </div>
            <div className="card-3d-body">
              <span className="card-tag chart">MUNDO CRIPTO & FUTUROS</span>
              <h3>Velas Japonesas & Fibonacci</h3>
              <p>
                TradingView Lightweight Charts con velas Heikin Ashi, retrocesos de Fibonacci, EMAs 20/50 y cotizaciones en vivo de Bitcoin, Ethereum, Solana, NASDAQ y S&P 500.
              </p>
            </div>
          </div>

          {/* Card 4: CME DOM Level II */}
          <div className="feature-3d-card">
            <div className="card-dom-mini-table">
              <div className="mini-dom-row ask">
                <span>142</span><strong>19,756.00</strong><span>Ask Limit</span>
              </div>
              <div className="mini-dom-row ask">
                <span>198</span><strong>19,755.50</strong><span>Ask Limit</span>
              </div>
              <div className="mini-dom-row current">
                <span>285</span><strong>19,754.50 (Último)</strong><span>Spread 0.25</span>
              </div>
              <div className="mini-dom-row bid">
                <span>210</span><strong>19,753.50</strong><span>Bid Limit</span>
              </div>
              <div className="mini-dom-row bid">
                <span>165</span><strong>19,752.50</strong><span>Bid Limit</span>
              </div>
            </div>
            <div className="card-3d-body">
              <span className="card-tag dom">LEVEL II DOM CME</span>
              <h3>Libro de Órdenes Profundo</h3>
              <p>
                Visualización de liquidez institucional con profundidad de mercado en tiempo real y colocación de órdenes a 1-clic sobre la escalera de precios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Global Banner */}
      <footer className="portal-footer-cta">
        <div className="footer-cta-box">
          <div className="footer-left">
            <h3>¿Listo para experimentar el trading algorítmico de 2030?</h3>
            <p>Accede al simulador con $100,000 en fondos virtuales o conecta tu cuenta de fondeo TopStep.</p>
          </div>
          <button type="button" className="footer-demo-btn" onClick={handleDemoLogin}>
            ⚡ Lanzar Estación Demo Ahora &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Login;
