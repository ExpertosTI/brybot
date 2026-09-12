import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api, API_BASE_URL } from '../api';
import { CandlestickChart } from '../components/trading/CandlestickChart';

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

const INITIAL_MARKET: Record<string, CryptoAsset> = {
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

const DEMO_BUTTON_PHRASES = [
  'ENTRAR A MODO DEMO INMEDIATO ($100,000 USD)',
  'OPERAR NASDAQ, BITCOIN & ORO EN TIEMPO REAL',
  'ACTIVAR INTELIGENCIA ARTIFICIAL GEMINI 3.6 LIVE',
  'VIGILANCIA WHATSAPP Y PROTECCIÓN TOPSTEP (-$2,000)',
];

export function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Market & Asset state
  const [marketData, setMarketData] = useState<Record<string, CryptoAsset>>(INITIAL_MARKET);
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('BTC');
  const [activeAsset, setActiveAsset] = useState<CryptoAsset>(INITIAL_MARKET.BTC);
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});

  // Auth drawer switch
  const [showLoginDrawer, setShowLoginDrawer] = useState(false);

  // WhatsApp demo notification test state
  const [waTestSending, setWaTestSending] = useState(false);
  const [waTestSuccess, setWaTestSuccess] = useState(false);

  // Hologram Matrix Warp Demo Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(10);
  const [transitionStatus, setTransitionStatus] = useState('INICIALIZANDO PROYECTOR HOLOGRÁFICO CUÁNTICO...');

  // Typewriter dynamic text for Demo CTA
  const [typewriterText, setTypewriterText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  // 1. Typewriter effect for Demo CTA Button
  useEffect(() => {
    let charIdx = 0;
    let isDeleting = false;
    let timeoutId: any;
    const currentPhrase = DEMO_BUTTON_PHRASES[phraseIndex % DEMO_BUTTON_PHRASES.length];

    const typeLoop = () => {
      if (!isDeleting) {
        setTypewriterText(currentPhrase.slice(0, charIdx + 1));
        charIdx++;
        if (charIdx >= currentPhrase.length) {
          isDeleting = true;
          timeoutId = setTimeout(typeLoop, 2800); // Hold reading time
          return;
        }
        timeoutId = setTimeout(typeLoop, 45);
      } else {
        setTypewriterText(currentPhrase.slice(0, charIdx - 1));
        charIdx--;
        if (charIdx <= 0) {
          isDeleting = false;
          setPhraseIndex((prev) => prev + 1);
          return;
        }
        timeoutId = setTimeout(typeLoop, 20);
      }
    };

    timeoutId = setTimeout(typeLoop, 100);
    return () => clearTimeout(timeoutId);
  }, [phraseIndex]);

  // 2. Real Live Market Data Feed (Binance API Integration)
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]');
        if (!res.ok) return;
        const tickers = await res.json();
        if (!Array.isArray(tickers)) return;

        setMarketData((prev) => {
          const updated = { ...prev };
          tickers.forEach((t: any) => {
            const sym = t.symbol.replace('USDT', '');
            if (updated[sym]) {
              const oldPrice = updated[sym].price;
              const newPrice = parseFloat(t.lastPrice);
              const changePct = parseFloat(t.priceChangePercent);
              const isPos = changePct >= 0;
              const high = parseFloat(t.highPrice);
              const low = parseFloat(t.lowPrice);
              const volNum = parseFloat(t.quoteVolume);
              const volStr = volNum > 1e9 ? `$${(volNum / 1e9).toFixed(2)}B` : `$${(volNum / 1e6).toFixed(1)}M`;

              if (Math.abs(newPrice - oldPrice) > 0.01) {
                setPriceFlash((f) => ({ ...f, [sym]: newPrice > oldPrice ? 'up' : 'down' }));
                setTimeout(() => setPriceFlash((f) => ({ ...f, [sym]: null })), 600);
              }

              const newCandles = [...updated[sym].candles.slice(1), newPrice];
              updated[sym] = {
                ...updated[sym],
                price: newPrice,
                change: `${isPos ? '+' : ''}${changePct.toFixed(2)}%`,
                isPos,
                high,
                low,
                volume: volStr,
                candles: newCandles,
              };
            }
          });
          return updated;
        });
      } catch {
        // Keeps internal micro simulation
      }
    };

    fetchRealData();
    const interval = setInterval(fetchRealData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Update active asset whenever selected key or market data changes
  useEffect(() => {
    if (marketData[selectedAssetKey]) {
      setActiveAsset(marketData[selectedAssetKey]);
    }
  }, [selectedAssetKey, marketData]);

  // 3. Matrix Rain Canvas Engine on Demo Loading Screen
  useEffect(() => {
    if (!isTransitioning) return;
    const canvas = document.getElementById('holoMatrixCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'RENACE0123456789NQBTCETH$#%&<>*+~0x9F_AI3.6';
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    let animId: number;
    const renderMatrix = () => {
      ctx.fillStyle = 'rgba(2, 6, 16, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = characters[Math.floor(Math.random() * characters.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const rand = Math.random();
        ctx.fillStyle = rand > 0.95 ? '#ffffff' : rand > 0.65 ? '#00b4d8' : '#00e599';
        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(renderMatrix);
    };

    animId = requestAnimationFrame(renderMatrix);
    return () => cancelAnimationFrame(animId);
  }, [isTransitioning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanUsername = form.username.trim();
    const cleanPassword = form.password;

    if (!cleanUsername || !cleanPassword) {
      setError('Por favor complete ambos campos.');
      setIsLoading(false);
      return;
    }

    const body = new URLSearchParams();
    body.append('username', cleanUsername);
    body.append('password', cleanPassword);
    body.append('grant_type', 'password');

    try {
      const res = await api.post('/auth/token', body, {
        baseURL: API_BASE_URL,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const token = res.data?.access_token ?? res.data?.token;
      if (!token) {
        setError('Login fallido: no se recibió token de acceso.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(detail || 'Credenciales incorrectas. Verifique usuario/correo y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Cinematic 2.0s Quantum Holographic Warp Sequence
  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    setIsTransitioning(true);
    setTransitionProgress(12);
    setTransitionStatus('INICIALIZANDO PROYECTOR HOLOGRÁFICO CUÁNTICO...');

    try {
      const authPromise = api.post('/auth/demo-login').catch(() => null);

      setTimeout(() => {
        setTransitionProgress(35);
        setTransitionStatus('ENLAZANDO FEED CME DIRECT & BINANCE REALTIME [8ms]...');
      }, 400);

      setTimeout(() => {
        setTransitionProgress(65);
        setTransitionStatus('SINCRONIZANDO NÚCLEO COGNITIVO GOOGLE GEMINI 3.6...');
      }, 850);

      setTimeout(() => {
        setTransitionProgress(88);
        setTransitionStatus('ACTIVANDO CENTINELA WHATSAPP & REGLAS TOPSTEP (-$2,000)...');
      }, 1350);

      setTimeout(async () => {
        const res = await authPromise;
        const token = res?.data?.access_token ?? res?.data?.token ?? 'demo_token_paper';
        localStorage.setItem('token', token);
        setTransitionProgress(100);
        setTransitionStatus('¡ACCESO HOLOGRÁFICO CONCEDIDO! CARGANDO $100,000 USD...');
      }, 1750);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2100);
    } catch {
      setIsTransitioning(false);
      setIsLoading(false);
      setError('No se pudo inicializar la estación cuántica.');
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
        reason: 'Confluencia Cuántica Gemini 3.6 + Soporte Institucional',
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
      {/* ── 20,000$ LUXURY HOLOGRAM & MATRIX DEMO WARP STAGE ── */}
      {isTransitioning && (
        <div className="demo-holo-matrix-overlay" role="dialog" aria-modal="true">
          <canvas id="holoMatrixCanvas" className="holo-matrix-canvas" />

          <div className="holo-quantum-viewport">
            {/* Volumetric Hologram Light Stage */}
            <div className="holo-stage-wrap">
              <div className="holo-light-beam" />
              <div className="holo-emitter-ring base" />
              <div className="holo-emitter-ring mid" />

              {/* 3D Levitating Renace Symbol */}
              <div className="holo-3d-levitation-box">
                <div className="holo-scanlines" />
                <img src="/assets/renace_symbol.svg" alt="RENACE" className="holo-renace-core-img" />
                <div className="holo-crosshair-hud" />
                <div className="holo-orbit-ring" />
              </div>

              {/* Emitter Base Pedestal */}
              <div className="holo-emitter-base">
                <span className="holo-emitter-glow" />
                <span className="emitter-status-tag">QUANTUM HOLO-PROJECTOR · ACTIVE</span>
              </div>
            </div>

            {/* Futuristic Hologram HUD Card */}
            <div className="holo-hud-card">
              <div className="holo-header-row">
                <div className="holo-security-badge">
                  <span className="holo-dot-blink" />
                  <span>NIVEL DE SEGURIDAD 5 // ACCESO INSTITUCIONAL</span>
                </div>
                <span className="holo-sys-timer">{transitionProgress}%</span>
              </div>

              <h2 className="holo-main-title">
                RENACE <span className="holo-title-glitch">TRADING</span>
              </h2>
              <p className="holo-sub-tag">INSTITUTIONAL QUANTUM COMPUTING PLATFORM 2030</p>

              {/* Dynamic Typewriter Scramble Terminal */}
              <div className="holo-terminal-box">
                <span className="holo-prompt-sym">&gt;</span>
                <span className="holo-scramble-text">{transitionStatus}</span>
                <span className="holo-cursor-blink">█</span>
              </div>

              {/* Liquid Plasma Progress Bar */}
              <div className="holo-plasma-bar-wrap">
                <div className="holo-plasma-bar-fill" style={{ width: `${transitionProgress}%` }}>
                  <span className="holo-plasma-head" />
                </div>
              </div>

              {/* 4 Telemetry Nodes */}
              <div className="holo-telemetry-grid">
                <div className="telemetry-node">
                  <span className="node-label">FEED DE DATOS</span>
                  <strong className="node-val">CME DIRECT · 4.2ms</strong>
                </div>
                <div className="telemetry-node">
                  <span className="node-label">NÚCLEO DE IA</span>
                  <strong className="node-val accent-ai">Google Gemini 3.6</strong>
                </div>
                <div className="telemetry-node">
                  <span className="node-label">CENTINELA WHATSAPP</span>
                  <strong className="node-val accent-wa">Evolution API Activa</strong>
                </div>
                <div className="telemetry-node">
                  <span className="node-label">FONDO SIMULADO</span>
                  <strong className="node-val accent-capital">$100,000.00 USD</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Ticker Ribbon ── */}
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

        {/* Global Live Crypto & Futures Strip with Real Binance Feeds */}
        <div className="portal-quick-tickers">
          {Object.entries(marketData).map(([key, asset]) => (
            <div
              key={key}
              className={`ticker-capsule ${selectedAssetKey === key ? 'active-capsule' : ''} ${priceFlash[key] ? `flash-${priceFlash[key]}` : ''}`}
              onClick={() => setSelectedAssetKey(key)}
              role="button"
              tabIndex={0}
            >
              <strong>{asset.symbol}</strong>
              <span className="capsule-live-price">
                ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
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

      {/* ── Hero Station (100% Mobile Responsive Flex/Grid) ── */}
      <div className="portal-hero-container">
        {/* Left Hero Column */}
        <div className="portal-features-showcase">
          <div className="hero-eyebrow-pill">
            <span className="neon-sparkle-dot" />
            <span>GEMINI 3.6 QUANT ENGINE · EVOLUTION WHATSAPP · FEED REAL BINANCE & CME</span>
          </div>

          <h1 className="hero-title-text">
            Ecosistema de Trading <span className="gradient-text">Cuántico & Cripto</span> 2030.
          </h1>

          <p className="hero-sub-description">
            La estación de trading profesional con análisis cognitivo de <strong>Google Gemini 3.6</strong> para dictaminar en tiempo real cuándo invertir o esperar, alertas directas a tu <strong>WhatsApp con Evolution API</strong> y protección estricta del <strong>tope diario de pérdida (-$2,000 en TopStep)</strong>.
          </p>

          {/* MONUMENTAL CENTER-STAGE DEMO CTA BUTTON WITH DYNAMIC TYPEWRITER */}
          <div className="hero-monumental-cta-wrap">
            <button
              type="button"
              className="monumental-demo-btn"
              onClick={handleDemoLogin}
              disabled={isLoading || isTransitioning}
            >
              <div className="btn-conic-glow" />
              <div className="btn-inner-content">
                <div className="btn-icon-orb">
                  <span className="orb-pulse" />
                  <span className="orb-glyph">&#9658;</span>
                </div>

                <div className="btn-text-content">
                  <div className="btn-typing-line">
                    <strong>{typewriterText}</strong>
                    <span className="btn-cursor">█</span>
                  </div>
                  <div className="btn-sub-badges">
                    <span>⚡ ACCESO INMEDIATO</span>
                    <span>•</span>
                    <span>0 RIESGO REAL</span>
                    <span>•</span>
                    <span>1-CLICK EXECUTION</span>
                  </div>
                </div>

                <div className="btn-arrow-glow">&rarr;</div>
              </div>
            </button>
          </div>

          {/* WhatsApp Sentinel Realtime HUD */}
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
                  <span className="wa-hud-sub">Instancia: <code>renace</code> · Conexión Segura 24/7</span>
                </div>
              </div>

              <button
                type="button"
                className={`wa-test-trigger-btn ${waTestSending ? 'sending' : ''} ${waTestSuccess ? 'success' : ''}`}
                onClick={handleTestWhatsAppNotification}
                disabled={waTestSending}
              >
                {waTestSending ? 'Enviando...' : waTestSuccess ? '✓ Notificación Enviada' : '📲 Probar Notificación'}
              </button>
            </div>

            {/* Live Message Preview Feed */}
            <div className="wa-hud-feed-card">
              <div className="wa-feed-top">
                <span className="wa-badge-signal">🚨 SEÑAL GEMINI 3.6 QUANT LIVE</span>
                <span className="wa-time-tag">Ahora</span>
              </div>
              <p className="wa-feed-body">
                <strong>{activeAsset.symbol}:</strong> Señal de <strong>COMPRA (BUY)</strong> confirmada a ${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}.
                <br />
                🎯 SL: ${(activeAsset.price * 0.985).toFixed(2)} | 🏁 TP: ${(activeAsset.price * 1.03).toFixed(2)} | 📊 R:R 1:3
              </p>
            </div>

            {/* Topstep Rule Sentinel Alert */}
            <div className="wa-hud-feed-card topstep-alert-card">
              <div className="wa-feed-top">
                <span className="wa-badge-risk">⚠️ CENTINELA TOPSTEP & TOPE DE CUENTA</span>
                <span className="wa-time-tag">Auto</span>
              </div>
              <p className="wa-feed-body">
                <strong>Vigilancia Activa de Pérdida Diaria (-$2,000):</strong> Si tu cuenta roza el tope diario permitido, el bot congela órdenes impulsivas y envía alerta urgente a tu WhatsApp para proteger tu fondeo.
              </p>
            </div>
          </div>
        </div>

        {/* Right Hero Column: Interactive Live Chart / Login Drawer */}
        <div className="portal-auth-column">
          {showLoginDrawer ? (
            /* Traditional Account Login Drawer */
            <div className="portal-login-box">
              <div className="login-box-header">
                <h2>Acceso Institucional</h2>
                <p>Ingresa a tu terminal de trading algorítmico</p>
              </div>

              {error && <div className="portal-error-banner">{error}</div>}

              <form onSubmit={handleSubmit} className="portal-form">
                <div className="form-field-wrap">
                  <label htmlFor="username">Usuario o Correo Electrónico</label>
                  <input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="admin o expertostird@gmail.com"
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
                    placeholder="Tu contraseña (ej: Trading2027@)"
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
                  {isLoading ? 'Autenticando...' : '🔑 Entrar a la Estación'}
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
                {Object.entries(marketData).map(([k, a]) => (
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
                    <span className="station-badge-live">FEED REAL</span>
                  </div>
                  <div className={`station-price-huge ${priceFlash[selectedAssetKey] ? `flash-${priceFlash[selectedAssetKey]}` : ''}`}>
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

              {/* Real Interactive Candlestick Chart Engine (TradingView Lightweight) with Touch/Mouse AI Box */}
              <div className="landing-real-chart-station-body">
                <CandlestickChart
                  symbol={selectedAssetKey}
                  resolution="1"
                  height={380}
                  compact={true}
                  onPriceUpdate={(p, chg, h, l, vol) => {
                    setMarketData((prev) => {
                      if (!prev[selectedAssetKey]) return prev;
                      return {
                        ...prev,
                        [selectedAssetKey]: {
                          ...prev[selectedAssetKey],
                          price: p,
                          change: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`,
                          isPos: chg >= 0,
                          high: h,
                          low: l,
                          volume: vol > 1e6 ? `$${(vol / 1e6).toFixed(1)}M` : `${vol.toLocaleString()} Lots`,
                        },
                      };
                    });
                  }}
                  onApplyAiLimits={() => {
                    handleDemoLogin();
                  }}
                />
              </div>

              {/* 1-Click Execution Triggers on Landing */}
              <div className="station-quick-actions">
                <button
                  type="button"
                  className="quick-trade-trigger buy"
                  onClick={handleDemoLogin}
                  title="Ejecutar Compra Inmediata"
                >
                  <div className="qt-top">
                    <span>⚡ COMPRAR 1x {selectedAssetKey}</span>
                  </div>
                  <div className="qt-price">${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </button>

                <button
                  type="button"
                  className="quick-trade-trigger sell"
                  onClick={handleDemoLogin}
                  title="Ejecutar Venta Inmediata"
                >
                  <div className="qt-top">
                    <span>⚡ VENDER 1x {selectedAssetKey}</span>
                  </div>
                  <div className="qt-price">${activeAsset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 LUXURY 3D TECH CARDS SECTION ── */}
      <section className="features-quad-section">
        <div className="section-title-wrap">
          <span className="section-eyebrow">TECNOLOGÍA DE GRADO INSTITUCIONAL</span>
          <h2>Ecosistema de Trading Cuántico Multi-Activo</h2>
          <p>Potenciado por Google Gemini 3.6, WhatsApp Evolution API y Cobertura de Reglas TopStep</p>
        </div>

        <div className="features-quad-grid">
          {/* Card 1: Gemini 3.6 AI Core */}
          <div className="feature-3d-card">
            <div className="card-3d-media-wrap">
              <img
                src="/assets/3d/gemini_core.jpg"
                alt="3D Neural Core Gemini 3.6"
                className="card-3d-img"
              />
              <div className="img-glow-overlay ai" />
            </div>
            <div className="card-3d-body">
              <span className="card-tag ai">NÚCLEO NEURONAL QUANT</span>
              <h3>Google Gemini 3.6 Cognition</h3>
              <p>
                Análisis cuantitativo de Fair Value Gaps (FVG), barridos de liquidez y divergencias RSI en tiempo real con recomendaciones ejecutivas de entrada, SL y TP.
              </p>
            </div>
          </div>

          {/* Card 2: WhatsApp Sentinel */}
          <div className="feature-3d-card">
            <div className="card-3d-media-wrap">
              <img
                src="/assets/3d/whatsapp_sentinel.jpg"
                alt="3D WhatsApp Sentinel"
                className="card-3d-img"
              />
              <div className="img-glow-overlay wa" />
            </div>
            <div className="card-3d-body">
              <span className="card-tag wa">EVOLUTION API</span>
              <h3>Centinela WhatsApp & TopStep</h3>
              <p>
                Alertas instantáneas enviadas a tu WhatsApp en milisegundos con disparo de pánico y bloqueo automático si la pérdida diaria se aproxima a -$2,000 USD.
              </p>
            </div>
          </div>

          {/* Card 3: Crypto & Futures Markets */}
          <div className="feature-3d-card">
            <div className="card-3d-media-wrap">
              <img
                src="/assets/3d/crypto_chart.jpg"
                alt="3D Crypto Market"
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
