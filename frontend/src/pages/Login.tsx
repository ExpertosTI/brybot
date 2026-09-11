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
    setTransitionStatus('Autenticando Trader en Modo Demo Paper...');

    try {
      const res = await api.post('/auth/demo-login').catch(() => null);
      const token = res?.data?.access_token ?? res?.data?.token ?? 'demo_token_paper';
      localStorage.setItem('token', token);

      setTimeout(() => {
        setTransitionProgress(40);
        setTransitionStatus('Conectando con Google Gemini 2.0 AI Quant Engine...');
      }, 300);

      setTimeout(() => {
        setTransitionProgress(65);
        setTransitionStatus('Sincronizando Instancia Evolution API para Alertas WhatsApp...');
      }, 650);

      setTimeout(() => {
        setTransitionProgress(85);
        setTransitionStatus('Asignando $100,000 en Margen Virtual & Datos NASDAQ CME...');
      }, 1000);

      setTimeout(() => {
        setTransitionProgress(100);
        setTransitionStatus('Lanzando Workspace Institucional 2030...');
      }, 1300);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1600);
    } catch {
      setIsTransitioning(false);
      setIsLoading(false);
      setError('No se pudo iniciar la sesión demo.');
    }
  };

  return (
    <div className="landing-portal-wrapper">
      {/* Fullscreen Cinematic Demo Entrance Modal */}
      {isTransitioning && (
        <div className="demo-transition-overlay">
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
              <div className="progress-fill" style={{ width: `${transitionProgress}%` }} />
            </div>

            <div className="transition-specs-row">
              <div className="spec-item">
                <span>INTELIGENCIA ARTIFICIAL</span>
                <strong>Google Gemini 2.0</strong>
              </div>
              <div className="spec-item">
                <span>ALERTAS DIRECTAS</span>
                <strong>Evolution API (WhatsApp)</strong>
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
            <strong>NASDAQ (NQ)</strong>
            <span>19,754.50</span>
            <span className="pos">+0.42%</span>
          </div>
          <div className="ticker-capsule">
            <strong>S&P 500 (ES)</strong>
            <span>5,524.25</span>
            <span className="pos">+0.31%</span>
          </div>
          <div className="ticker-capsule">
            <strong>BITCOIN (BTC)</strong>
            <span>$65,580</span>
            <span className="pos">+2.10%</span>
          </div>
        </div>

        <button type="button" className="header-demo-cta-btn" onClick={handleDemoLogin}>
          ⚡ Probar Demo Gratis
        </button>
      </header>

      {/* Main Landing Split View: Showcase on Left, Login on Right */}
      <div className="portal-hero-container">
        {/* Left Section: Feature Showcase */}
        <div className="portal-features-showcase">
          <div className="hero-eyebrow-pill">
            <span className="neon-gemini-sparkle">&#10022;</span>
            <span>GOOGLE GEMINI 2.0 QUANT + EVOLUTION API WHATSAPP + TOPSTEP SENTINEL</span>
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

          {/* 4 Feature Pillars Grid */}
          <div className="features-quad-grid">
            <div className="feature-quad-card">
              <div className="card-top-icon gemini-icon">&#10022;</div>
              <span className="feature-pill-badge gemini">GOOGLE GEMINI 2.0</span>
              <h4>Quant Engine Cognitivo</h4>
              <p>
                Evalúa en milisegundos Fair Value Gaps, barridos de liquidez y volumen para darte el veredicto exacto de <strong>cuándo invertir o esperar</strong> con Stop Loss y Take Profit calculados.
              </p>
            </div>

            <div className="feature-quad-card">
              <div className="card-top-icon whatsapp-icon">&#128241;</div>
              <span className="feature-pill-badge whatsapp">EVOLUTION API</span>
              <h4>Alertas WhatsApp en Vivo</h4>
              <p>
                Recibe notificaciones inmediatas en tu celular con los parámetros de entrada y advertencias automáticas cuando tu cuenta se acerque al <strong>tope diario de pérdida (TopStep)</strong>.
              </p>
            </div>

            <div className="feature-quad-card">
              <div className="card-top-icon chart-icon">&#128200;</div>
              <span className="feature-pill-badge chart">TOPSTEPX ENGINE</span>
              <h4>Velas & Herramientas</h4>
              <p>
                TradingView Lightweight Charts con velas japonesas, Heikin Ashi, área de neón, retrocesos de Fibonacci, líneas de tendencia e indicadores EMA 20/50 y volumen.
              </p>
            </div>

            <div className="feature-quad-card">
              <div className="card-top-icon dom-icon">&#129692;</div>
              <span className="feature-pill-badge dom">LEVEL II DOM</span>
              <h4>Libro de Órdenes CME</h4>
              <p>
                Visualización de liquidez en tiempo real con profundidad de mercado (Bids & Asks) y colocación de órdenes de compra/venta a 1-clic sobre la escalera de precios.
              </p>
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
