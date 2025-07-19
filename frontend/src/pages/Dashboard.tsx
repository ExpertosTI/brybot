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
      <button onClick={() => axios.post('http://localhost:8000/run-bot')}>Run Bot</button>
    </div>
  );
}

export default Dashboard;
