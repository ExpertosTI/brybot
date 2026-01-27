import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Integrations from './pages/Integrations';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/integrations"
          element={
            <RequireAuth>
              <Integrations />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
