import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface User {
  username: string;
  // Add other properties as needed based on the API response
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
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
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {user?.username}</p>
      <button onClick={() => {
        axios.get('http://localhost:8000/scheduler/run-bot', {
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
