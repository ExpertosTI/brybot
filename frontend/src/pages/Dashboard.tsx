import { useEffect, useState } from 'react';
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
        axios.get('http://localhost:8000/scheduler/run-bot', {
          params: { symbol: selectedSymbol },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).then(() => {
          alert('Bot started successfully!');
        }).catch(err => {
          console.error('Error starting bot:', err);
          alert('Failed to start the bot. Please try again.');
        });
      }}>Run Bot</button>
    </div>
  );
}

export default Dashboard;
