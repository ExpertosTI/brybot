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
      console.error('Login failed:', err);
      setError('Login failed. Please check your username and password.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Username" />
      <input value={form.password} type="password" onChange={e => setForm({...form, password: e.target.value})} placeholder="Password" />
      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
