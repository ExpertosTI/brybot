import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface TopBarProps {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  user?: { username: string } | null;
  onOpenWhatsAppSettings?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  symbol,
  currentPrice,
  priceChange,
  user,
  onOpenWhatsAppSettings,
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { state: { loggedOut: true } });
  };

  return (
    <header className="app-topbar">
      <div className="topbar-brand-section">
        <div className="brand-logo-mark">
          <img src="/assets/renace_symbol.svg" alt="RENACE TRADING" className="topbar-renace-logo-img" />
        </div>
        <div className="brand-titles">
          <span className="brand-lab-name">RENACE TRADING</span>
          <span className="brand-sub-badge">INSTITUTIONAL QUANT LAB 2030</span>
        </div>
      </div>

      <div className="topbar-center-ticker">
        <div className="ticker-pill">
          <span className="live-dot-glow" />
          <span className="ticker-sym">{symbol}</span>
          <span className="ticker-val">
            ${currentPrice > 0 ? currentPrice.toFixed(2) : '19,750.00'}
          </span>
          <span className={`ticker-delta ${priceChange >= 0 ? 'pos' : 'neg'}`}>
            {priceChange >= 0 ? '▲ +' : '▼ '}{priceChange}%
          </span>
        </div>
        <div className="latency-badge">
          <span className="latency-dot" />
          <span>REALTIME FEED · 8ms</span>
        </div>
      </div>

      <div className="topbar-user-section">
        {onOpenWhatsAppSettings && (
          <button
            type="button"
            className="topbar-action-icon-btn whatsapp-btn"
            onClick={onOpenWhatsAppSettings}
            title="Ajustes de WhatsApp & Notificaciones"
          >
            <span className="wa-icon">📲</span>
            <span className="wa-text">WhatsApp Alertas</span>
          </button>
        )}
        <div className="user-profile-badge">
          <span className="user-role-tag">{user?.username && user.username !== 'demo_trader' ? 'ADMIN' : 'DEMO'}</span>
          <span className="user-name-text">{user?.username || 'demo_trader'}</span>
        </div>

        {user?.username && user.username !== 'demo_trader' ? (
          <>
            <Link to="/integrations" className="nav-link-btn">
              Broker API
            </Link>
            <button type="button" className="logout-action-btn" onClick={handleLogout}>
              Salir
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link-btn" style={{ background: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.4)' }}>
            🔑 Iniciar Sesión
          </Link>
        )}
      </div>
    </header>
  );
};
