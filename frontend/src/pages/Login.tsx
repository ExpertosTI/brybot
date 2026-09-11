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
  const [transitionStatus, setTransitionStatus] = useState('Initializing RENACE Trading Lab...');

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
        setError('Login failed: unexpected server response.');
        setIsLoading(false);
        return;
      }
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login failed', err);
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(detail || 'Login failed. Please check your username and password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    setIsTransitioning(true);
    setTransitionProgress(20);
    setTransitionStatus('Authenticating Demo Paper Trader...');

    try {
      const res = await api.post('/auth/demo-login').catch(() => null);
      const token = res?.data?.access_token ?? res?.data?.token ?? 'demo_token_paper';
      localStorage.setItem('token', token);

      setTimeout(() => {
        setTransitionProgress(50);
        setTransitionStatus('Synchronizing CME NASDAQ 100 Ticks & Market Depth...');
      }, 350);

      setTimeout(() => {
        setTransitionProgress(80);
        setTransitionStatus('Allocating $100,000 Virtual Trading Margin...');
      }, 750);

      setTimeout(() => {
        setTransitionProgress(100);
        setTransitionStatus('Launching Institutional Workspace 2030...');
      }, 1150);

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1500);
    } catch (err) {
      setIsTransitioning(false);
      setIsLoading(false);
      setError('Failed to initiate demo session.');
    }
  };

  return (
    <div className="auth-shell">
      {/* Fullscreen Cinematic Demo Entrance Modal */}
      {isTransitioning && (
        <div className="demo-transition-overlay">
          <div className="transition-content-box">
            <div className="transition-logo-badge">
              <div className="pulse-ring" />
              <div className="neon-delta-mark">&Delta;</div>
            </div>

            <h2>RENACE TRADING LAB</h2>
            <p className="transition-subtitle">PREMIUM INSTITUTIONAL SUITE 2030</p>

            <div className="transition-status-text">
              <span className="dot-pulse-green" />
              <span>{transitionStatus}</span>
            </div>

            <div className="transition-progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${transitionProgress}%` }}
              />
            </div>

            <div className="transition-specs-row">
              <div className="spec-item">
                <span>ACTIVE INSTRUMENT</span>
                <strong>NQ (NASDAQ 100)</strong>
              </div>
              <div className="spec-item">
                <span>VIRTUAL BALANCE</span>
                <strong>$100,000.00</strong>
              </div>
              <div className="spec-item">
                <span>EXECUTION LATENCY</span>
                <strong>&lt; 5ms (Paper)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="login-panel">
        <div className="login-mark" aria-hidden="true">
          <span className="login-mark-line" />
          <span className="login-mark-line login-mark-line-short" />
          <span className="login-mark-dot" />
        </div>

        <div className="login-header">
          <div>
            <p className="eyebrow">RENACE TRADING LAB</p>
            <h1>Trade with a clearer signal.</h1>
            <p className="muted">
              A professional trading workspace with market structure, RSI strategies and real-time execution.
            </p>
          </div>
          <span className="login-live-dot">Live</span>
        </div>

        {loggedOut && (
          <div className="inline-alert" role="status" aria-live="polite">
            You have been logged out.
          </div>
        )}
        {expired && (
          <div className="inline-alert warning" role="alert" aria-live="polite">
            Your session expired. Please log in again.
          </div>
        )}
        {error && (
          <div className="inline-alert danger" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* High-Impact Demo Workspace Button */}
        <button
          type="button"
          className="demo-cta"
          onClick={handleDemoLogin}
          disabled={isLoading || isTransitioning}
        >
          <span>
            <strong>{isLoading ? 'Booting Workspace...' : 'Enter demo workspace'}</strong>
            <small>NASDAQ 100 / $100K Paper Margin / Realtime Telemetry</small>
          </span>
          <span className="demo-arrow" aria-hidden="true">&rarr;</span>
        </button>

        <div className="login-divider">
          <span>or sign in with credentials</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Username"
            autoComplete="username"
            required
            disabled={isLoading || isTransitioning}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            autoComplete="current-password"
            required
            disabled={isLoading || isTransitioning}
          />

          <button type="submit" className="primary" disabled={isLoading || isTransitioning}>
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="tiny muted login-api">Connected endpoint: {API_BASE_URL}</p>
        <p className="tiny muted">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
