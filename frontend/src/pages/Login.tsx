import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/token', new URLSearchParams(form));
      localStorage.setItem('token', res.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        console.error('Login failed:', `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error('Login failed:', err);
      }
      setError('Login failed. Please check your username and password.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          placeholder="Username"
          aria-describedby={error ? "error-message" : undefined}
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
        />
      </div>
      {error && (
        <div id="error-message" role="alert" aria-live="assertive" style={{ color: 'red' }}>
          {error}
        </div>
      )}
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
