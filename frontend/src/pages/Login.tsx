import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axios from 'axios';
import { api, API_BASE_URL } from '../api';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
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
    try {
      const res = await api.post('/auth/demo-login');
      const token = res.data?.access_token ?? res.data?.token;
      if (!token) {
        setError('Demo login failed: unexpected server response.');
        return;
      }
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Demo login failed', err);
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      setError(detail || 'Demo mode is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-shell">
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
            <p className="muted">A professional trading workspace with market structure, RSI strategies and real-time execution.</p>
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
        <button type="button" className="demo-cta" onClick={handleDemoLogin} disabled={isLoading}>
          <span>
            <strong>{isLoading ? 'Opening workspace...' : 'Enter demo workspace'}</strong>
            <small>Virtual balance / synthetic market / no live orders</small>
          </span>
          <span className="demo-arrow" aria-hidden="true">-&gt;</span>
        </button>
        <div className="login-divider"><span>or sign in with an account</span></div>
        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="Username"
            autoComplete="username"
            required
            disabled={isLoading}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Password"
            autoComplete="current-password"
            required
            disabled={isLoading}
          />
          <button type="submit" className="primary" disabled={isLoading}>
            {isLoading ? 'Logging in…' : 'Login'}
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
