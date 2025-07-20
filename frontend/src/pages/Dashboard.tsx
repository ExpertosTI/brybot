import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  username: string;
  // Add other properties as needed based on the API response
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [contracts, setContracts] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:8000/auth/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => setUser(res.data))
      .catch(err => {
        if (err.response && err.response.status === 401) {
          alert('Session expired. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          console.error('An error occurred:', err);
          alert('An error occurred while fetching user data.');
        }
      });

    axios.get('http://localhost:8000/contracts')
      .then(res => {
        setContracts(res.data.contracts);
        if (res.data.contracts.length > 0) {
          setSelectedSymbol(res.data.contracts[0]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch contracts:', err);
        alert('Could not load contracts list.');
      });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {user?.username}</p>
      <div>
        <label htmlFor="contract-select">Contract:</label>
        <select
          id="contract-select"
          value={selectedSymbol}
          onChange={e => setSelectedSymbol(e.target.value)}
        >
          {contracts.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <button onClick={() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        const url = `http://localhost:8000/scheduler/run-bot?symbol=${encodeURIComponent(selectedSymbol)}`;
        const es = new EventSource(url);
        eventSourceRef.current = es;
        setLogs([]);
        es.onmessage = (e) => {
          setLogs(prev => [...prev, e.data]);
        };
        es.onerror = (err) => {
          console.error('EventSource failed:', err);
          es.close();
        };
      }}>Run Bot</button>
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {logs.join('\n')}
      </pre>
    </div>
  );
}

export default Dashboard;
