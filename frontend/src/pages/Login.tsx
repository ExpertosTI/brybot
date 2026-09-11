import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api, API_BASE_URL } from '../api';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cinematic Demo Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(10);
  const [transitionStatus, setTransitionStatus] = useState('Inicializando RENACE Trading Lab 2030...');

  const navigate = useNavigate();
  const location = useLocation();

  const expired = (location.state as { expired?: boolean } | null)?.expired;
  const loggedOut = (location.state as { loggedOut?: boolean } | null)?.loggedOut;


  // Active feature preview tab on landing page
  const [activeTabPreview, setActiveTabPreview] = useState<'gemini' | 'whatsapp' | 'chart' | 'dom'>('gemini');

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
    setTransitionProgress(25);
    setTransitionStatus('Conectando con Motor Institucional...');

    try {
      const res = await api.post('/auth/demo-login').catch(() => null);
      const token = res?.data?.access_token ?? res?.data?.token ?? 'demo_token_paper';
      localStorage.setItem('token', token);

      setTimeout(() => {
        setTransitionProgress(75);
        setTransitionStatus('Sincronizando Gemini 2.0 & Evolution WhatsApp...');
      }, 150);

      setTimeout(() => {
        setTransitionProgress(100);
        setTransitionStatus('¡Conexión Cuántica Establecida!');
      }, 350);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 520);
    } catch {
      setIsTransitioning(false);
      setIsLoading(false);
      setError('No se pudo iniciar la sesión demo.');
    }
  };

  return (
    <div className="landing-portal-wrapper">
      {/* Fullscreen Cinematic Rapid Warp Entrance */}
      {isTransitioning && (
        <div className="demo-transition-overlay" role="dialog" aria-modal="true">
          <div className="transition-content-box">
            <div className="transition-logo-badge">
              <div className="pulse-ring" />
              <div className="neon-delta-mark">&Delta;</div>
            </div>

            <h2>RENACE TRADING LAB 2030</h2>
            <p className="transition-subtitle">GEMINI QUANT ENGINE & EVOLUTION API INTEGRATED</p>

            <div className="transition-status-text">
              <span className="dot-pulse-green" />
              <span>{transitionStatus}</span>
            </div>

            <div className="transition-progress-bar">
              <div className="progress-fill fast-fill" style={{ width: `${transitionProgress}%` }} />
            </div>

            <div className="transition-specs-row">
              <div className="spec-item">
                <span>INTELIGENCIA ARTIFICIAL</span>
                <strong>Google Gemini 2.0</strong>
              </div>
              <div className="spec-item">
                <span>ALERTAS DIRECTAS</span>
                <strong>Evolution WhatsApp</strong>
              </div>
              <div className="spec-item">
                <span>SALDO VIRTUAL</span>
                <strong>$100,000.00</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Ticker Ribbon */}
      <header className="portal-header-bar">
        <div className="portal-brand-box">
          <div className="portal-logo-square">
            <span>&Delta;</span>
          </div>
          <div>
            <span className="portal-brand-text">RENACE TRADING LAB</span>
            <span className="portal-version-tag">2030 INSTITUTIONAL EDITION</span>
          </div>
        </div>

        <div className="portal-quick-tickers">
          <div className="ticker-capsule">
            <strong>NASDAQ</strong>
            <span>19,754.50</span>
            <span className="pos">+0.42%</span>
          </div>
          <div className="ticker-capsule">
            <strong>S&P 500</strong>
            <span>5,524.25</span>
            <span className="pos">+0.31%</span>
          </div>
          <div className="ticker-capsule">
            <strong>BITCOIN</strong>
            <span>$65,580</span>
            <span className="pos">+2.10%</span>
          </div>
        </div>

        <button type="button" className="header-demo-cta-btn" onClick={handleDemoLogin}>
          ⚡ Demo Gratis
        </button>
      </header>

      {/* Main Landing Split View: Showcase on Left, Login on Right */}
      <div className="portal-hero-container">
        {/* Left Section: Feature Showcase */}
        <div className="portal-features-showcase">
          <div className="hero-eyebrow-pill">
            <span className="neon-gemini-sparkle">&#10022;</span>
            <span>GEMINI 2.0 QUANT + EVOLUTION API WHATSAPP + TOPSTEP SENTINEL</span>
          </div>

          <h1 className="hero-title-text">
            Trading Algorítmico <span className="gradient-text">Inteligente</span> de Nueva Generación.
          </h1>

          <p className="hero-sub-description">
            La estación de trading profesional con análisis cognitivo de <strong>Google Gemini</strong> para dictaminar cuándo invertir o esperar, notificaciones directas a tu <strong>WhatsApp mediante Evolution API</strong> (señales, Stop Loss y alerta de tope Topstep), libro de órdenes <strong>Level II DOM</strong> y gráficas de velas en tiempo real.
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
                <strong>ENTRAR A MODO DEMO ($100,000)</strong>
                <small>Sin registro previo · NASDAQ 100 en vivo · 1-Click Execution</small>
              </div>
              <span className="cta-arrow">&rarr;</span>
            </button>
          </div>

          {/* 4 Feature Pillars Grid with Interactive Selector */}
          <div className="features-quad-grid">
            <div
              className={`feature-quad-card ${activeTabPreview === 'gemini' ? 'active-quad' : ''}`}
              onClick={() => setActiveTabPreview('gemini')}
              role="button"
              tabIndex={0}
            >
              <div className="card-top-icon gemini-icon">&#10022;</div>
              <span className="feature-pill-badge gemini">GOOGLE GEMINI 2.0</span>
              <h4>Quant Engine Cognitivo</h4>
              <p>
                Evalúa en milisegundos Fair Value Gaps, barridos de liquidez y volumen para darte el veredicto exacto de <strong>cuándo invertir o esperar</strong>.
              </p>
            </div>

            <div
              className={`feature-quad-card ${activeTabPreview === 'whatsapp' ? 'active-quad' : ''}`}
              onClick={() => setActiveTabPreview('whatsapp')}
              role="button"
              tabIndex={0}
            >
              <div className="card-top-icon whatsapp-icon">&#128241;</div>
              <span className="feature-pill-badge whatsapp">EVOLUTION API</span>
              <h4>Alertas WhatsApp en Vivo</h4>
              <p>
                Recibe notificaciones inmediatas con entradas, SL/TP y aviso instantáneo cuando la cuenta roce el <strong>tope diario de pérdida (-$2,000)</strong>.
              </p>
            </div>

            <div
              className={`feature-quad-card ${activeTabPreview === 'chart' ? 'active-quad' : ''}`}
              onClick={() => setActiveTabPreview('chart')}
              role="button"
              tabIndex={0}
            >
              <div className="card-top-icon chart-icon">&#128200;</div>
              <span className="feature-pill-badge chart">TOPSTEPX ENGINE</span>
              <h4>Velas & Herramientas</h4>
              <p>
                TradingView Lightweight Charts con velas japonesas, Heikin Ashi, retrocesos de Fibonacci, líneas de tendencia e indicadores EMA 20/50.
              </p>
            </div>

            <div
              className={`feature-quad-card ${activeTabPreview === 'dom' ? 'active-quad' : ''}`}
              onClick={() => setActiveTabPreview('dom')}
              role="button"
              tabIndex={0}
            >
              <div className="card-top-icon dom-icon">&#129692;</div>
              <span className="feature-pill-badge dom">LEVEL II DOM</span>
              <h4>Libro de Órdenes CME</h4>
              <p>
                Visualización de liquidez en tiempo real con profundidad de mercado (Bids & Asks) y colocación de órdenes a 1-clic sobre la escalera.
              </p>
            </div>
          </div>

          {/* Interactive Live Feature Previewer */}
          <div className="interactive-feature-previewer">
            <div className="previewer-header">
              <span className="previewer-title">
                <span className="previewer-dot-pulse" />
                VISTA PREVIA EN VIVO 2030:
              </span>
              <div className="previewer-pills">
                <button
                  type="button"
                  className={`prev-pill ${activeTabPreview === 'gemini' ? 'active' : ''}`}
                  onClick={() => setActiveTabPreview('gemini')}
                >
                  🧠 Gemini 2.0
                </button>
                <button
                  type="button"
                  className={`prev-pill ${activeTabPreview === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => setActiveTabPreview('whatsapp')}
                >
                  📲 WhatsApp
                </button>
                <button
                  type="button"
                  className={`prev-pill ${activeTabPreview === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveTabPreview('chart')}
                >
                  📊 Gráficas
                </button>
                <button
                  type="button"
                  className={`prev-pill ${activeTabPreview === 'dom' ? 'active' : ''}`}
                  onClick={() => setActiveTabPreview('dom')}
                >
                  🪜 DOM Ladder
                </button>
              </div>
            </div>

            <div className="previewer-body">
              {activeTabPreview === 'gemini' && (
                <div className="preview-card-gemini">
                  <div className="sim-badge-row">
                    <span className="sim-badge buy">VEREDICTO: INVERTIR (COMPRA ALTA CONFIANZA)</span>
                    <span className="sim-conf">88% Confianza Quant</span>
                  </div>
                  <div className="sim-params-grid">
                    <div className="sim-param">
                      <span>ENTRADA NQ</span>
                      <strong>19,750.50</strong>
                    </div>
                    <div className="sim-param">
                      <span>STOP LOSS (SL)</span>
                      <strong className="neg">19,715.00</strong>
                    </div>
                    <div className="sim-param">
                      <span>TAKE PROFIT (TP)</span>
                      <strong className="pos">19,820.00</strong>
                    </div>
                    <div className="sim-param">
                      <span>RIESGO/BENEFICIO</span>
                      <strong className="accent">1 : 2.0</strong>
                    </div>
                  </div>
                  <p className="sim-reasoning">
                    <strong>Tesis Gemini 2.0:</strong> Barrido de liquidez asiática completado en 19,715.00. Confluencia con Fair Value Gap (FVG) alcista de 15m y ratio de absorción favorable en libro de órdenes CME.
                  </p>
                </div>
              )}

              {activeTabPreview === 'whatsapp' && (
                <div className="preview-card-whatsapp">
                  <div className="whatsapp-chat-bubble">
                    <div className="wa-bubble-header">
                      <span className="wa-sender">RENACE Sentinel · Evolution API</span>
                      <span className="wa-time">Ahora</span>
                    </div>
                    <div className="wa-bubble-body">
                      <p><strong>🚨 ALERTA QUANT GEMINI 2.0:</strong></p>
                      <p>NQ: Señal de <strong>COMPRA</strong> detectada en 19,750.50.</p>
                      <p>🛑 Stop Loss: 19,715.00 | 🎯 Take Profit: 19,820.00</p>
                      <p>⚡ <em>Enviado automáticamente a tu WhatsApp mediante la instancia 'renace'.</em></p>
                    </div>
                  </div>
                  <div className="whatsapp-chat-bubble warning-bubble">
                    <div className="wa-bubble-header">
                      <span className="wa-sender">TOPSTEP RISK SENTINEL</span>
                      <span className="wa-time">Automático</span>
                    </div>
                    <div className="wa-bubble-body">
                      <p><strong>⚠️ AVISO DE TOPE DIARIO (-$2,000):</strong></p>
                      <p>Tu cuenta se aproxima al límite de pérdida diaria permitida por Topstep. El bot bloquea operaciones impulsivas para proteger tu cuenta de fondeo.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTabPreview === 'chart' && (
                <div className="preview-card-chart">
                  <div className="chart-mock-header">
                    <span className="chart-sym">NQ1! · 1m · Velas Japonesas + EMA 20/50</span>
                    <span className="chart-live-val pos">19,754.50 ▲ +0.42%</span>
                  </div>
                  <div className="chart-mock-visual">
                    <div className="candle-bar bull" style={{ height: '55%' }} />
                    <div className="candle-bar bull" style={{ height: '70%' }} />
                    <div className="candle-bar bear" style={{ height: '40%' }} />
                    <div className="candle-bar bull" style={{ height: '85%' }} />
                    <div className="candle-bar bull" style={{ height: '95%' }} />
                    <div className="fibo-overlay-line" />
                    <span className="fibo-label">Fibonacci 61.8% Retracement</span>
                  </div>
                </div>
              )}

              {activeTabPreview === 'dom' && (
                <div className="preview-card-dom">
                  <div className="dom-mock-table">
                    <div className="dom-mock-row ask">
                      <span className="dom-cell-size">142</span>
                      <span className="dom-cell-price">19,755.50</span>
                      <span className="dom-cell-action">Ask Limit</span>
                    </div>
                    <div className="dom-mock-row current">
                      <span className="dom-cell-size">210</span>
                      <span className="dom-cell-price highlight">19,754.50 (Último)</span>
                      <span className="dom-cell-action">Spread 0.25</span>
                    </div>
                    <div className="dom-mock-row bid">
                      <span className="dom-cell-size">185</span>
                      <span className="dom-cell-price">19,753.50</span>
                      <span className="dom-cell-action">Bid Limit</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Sign In Box */}
        <div className="portal-login-box">
          <div className="login-box-header">
            <div className="login-badge-tag">ACCESO PROFESIONAL</div>
            <h3>Iniciar Sesión</h3>
            <p className="login-sub">Ingresa a tu cuenta de fondeo o broker sincronizado.</p>
          </div>

          {loggedOut && (
            <div className="inline-alert" role="status" aria-live="polite">
              Has cerrado sesión exitosamente.
            </div>
          )}
          {expired && (
            <div className="inline-alert warning" role="alert" aria-live="polite">
              Tu sesión expiró. Por favor ingresa de nuevo.
            </div>
          )}
          {error && (
            <div className="inline-alert danger" role="alert" aria-live="assertive">
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
              {isLoading ? 'Autenticando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="portal-quick-demo-divider">
            <span>O INGRESA DIRECTAMENTE</span>
          </div>

          <button
            type="button"
            className="direct-demo-action-btn"
            onClick={handleDemoLogin}
            disabled={isLoading || isTransitioning}
          >
            <span>⚡ Abrir Modo Demo Instantáneo</span>
            <small>$100,000 Saldo de Prueba · Sin Tarjeta</small>
          </button>

          <div className="portal-login-footer">
            <span className="endpoint-tag">Servidor: {API_BASE_URL}</span>
            <Link to="/register" className="register-link-text">
              ¿No tienes cuenta? Crear una cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
