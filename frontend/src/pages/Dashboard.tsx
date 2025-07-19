import { useEffect, useState } from 'react';
import axios from 'axios';

interface User {
  username: string;
  // Add other properties as needed based on the API response
}

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    axios.get('http://localhost:8000/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => setUser(res.data));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {user?.username}</p>
      <button onClick={() => {
        axios.post('http://localhost:8000/run-bot', {}, {
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
