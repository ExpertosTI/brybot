import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Build proper x-www-form-urlencoded body
    const body = new URLSearchParams();
    body.append('username', form.username);
    body.append('password', form.password);
    // Some servers like to see this explicitly (safe to include)
    body.append('grant_type', 'password');
    // If you use scopes, you can include:
    // body.append('scope', '');

    try {
      const res = await axios.post(
        'http://localhost:8000/auth/token',
        body,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          // If your API sets/reads cookies, also add:
          // withCredentials: true,
        }
      );

      const token = res.data?.access_token ?? res.data?.token; // fallback if your field is named differently
      if (!token) {
        console.error('Unexpected token response:', res.data);
        setError('Login failed: unexpected server response.');
        return;
      }

      localStorage.setItem('token', token);
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        console.error('Login failed:', { status, data, message: err.message });
      } else {
        console.error('Login failed:', err);
      }
      setError('Login failed. Please check your username and password.');
    }
  };

  return (
    <div className="container login-container">
      <div className="card">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
              aria-describedby={error ? "error-message" : undefined}
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Password"
              aria-describedby={error ? "error-message" : undefined}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div id="error-message" role="alert" aria-live="assertive" style={{ color: 'red' }}>
              {error}
            </div>
          )}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
