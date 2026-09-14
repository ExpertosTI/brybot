import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface MarketPulse {
  id: string;
  type: 'info' | 'signal' | 'regime';
  title: string;
  symbol?: string;
  detail: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  time: string;
  confidence?: number;
}

export const ScreenPulseNotifier: React.FC = () => {
  const [activePulse, setActivePulse] = useState<MarketPulse | null>(null);
  const [minimized, setMinimized] = useState<boolean>(false);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(false);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());

  // Check Web Notification permissions
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsGranted(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationsGranted(perm === 'granted');
        if (perm === 'granted') {
          // Send a subtle test notification
          new Notification('RENACE Lab', {
            body: 'Notificaciones en pantalla activadas en modo leve.',
            icon: '/assets/renace_symbol.svg',
          });
        }
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    }
  };

  const triggerLightPulse = useCallback((pulse: MarketPulse) => {
    setActivePulse(pulse);
    setMinimized(false);

    // Light subtle haptic vibration on mobile
    if (hapticsEnabled && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 35, 25]);
      } catch (e) {
        // Ignore if unsupported
      }
    }

    // If app is in background or minimized and notifications granted, send OS notification
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`RENACE: ${pulse.title}`, {
          body: pulse.detail,
          icon: '/assets/renace_symbol.svg',
          tag: 'renace-pulse',
        });
      } catch (e) {
        console.warn('Could not fire native notification:', e);
      }
    }

    // Auto-dismiss after 6 seconds to stay non-intrusive
    const timer = setTimeout(() => {
      setActivePulse((current) => (current?.id === pulse.id ? null : current));
    }, 6000);

    return () => clearTimeout(timer);
  }, [hapticsEnabled]);

  // Periodic polling for only high-value market shifts (every 60s)
  useEffect(() => {
    const fetchLatestPulse = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/analysis/market-sentiment', { headers, timeout: 5000 });
        const data = res.data;

        if (data && data.intermarket_regime) {
          const vix = data.vix?.price || 15.0;
          const regime = data.intermarket_regime;
          const nowHour = new Date().getHours();

          // Only trigger on actual state change or critical regimes
          if (vix > 22.0) {
            triggerLightPulse({
              id: `vix-${Date.now()}`,
              type: 'regime',
              title: 'Régimen de Alta Volatilidad',
              detail: `VIX en ${vix.toFixed(1)} pts. Priorizar stops amplios y contratos micro.`,
              bias: 'BEARISH',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
          }
        }
      } catch (e) {
        // Fail silently to keep interface calm
      }
    };

    const interval = setInterval(fetchLatestPulse, 60000);
    return () => clearInterval(interval);
  }, [triggerLightPulse]);

  const getBiasColor = (bias: string) => {
    if (bias === 'BULLISH') return '#10b981';
    if (bias === 'BEARISH') return '#ef4444';
    return '#3b82f6';
  };

  return (
    <div style={{ position: 'fixed', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 99999, pointerEvents: 'none' }}>
      {/* If an active pulse notification is present */}
      {activePulse && !minimized ? (
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(13, 19, 31, 0.94)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${getBiasColor(activePulse.bias)}55`,
            borderRadius: '16px',
            padding: '10px 18px',
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 15px ${getBiasColor(activePulse.bias)}22`,
            maxWidth: '92vw',
            width: '460px',
            color: '#f3f4f6',
            fontFamily: "'Inter', sans-serif",
            animation: 'pulseSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          }}
          onClick={() => setMinimized(true)}
        >
          {/* Animated pulse circle */}
          <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: getBiasColor(activePulse.bias),
                animation: 'radarPulse 2s infinite',
                opacity: 0.7,
              }}
            />
            <span
              style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: getBiasColor(activePulse.bias),
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.3px', color: '#fff' }}>
                {activePulse.title}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{activePulse.time}</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#d1d5db', lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activePulse.detail}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setActivePulse(null);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            title="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ) : (
        /* Minimalist ambient status pill (Always subtle on screen) */
        <div
          style={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(10, 15, 26, 0.75)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            padding: '5px 14px',
            color: '#9ca3af',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
          onClick={() => {
            if (!notificationsGranted) {
              requestNotificationPermission();
            } else {
              triggerLightPulse({
                id: `demo-${Date.now()}`,
                type: 'info',
                title: 'RENACE Pulso Silencioso',
                detail: 'Monitoreo activo. Notificaciones leves configuradas en pantalla.',
                bias: 'NEUTRAL',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981',
              display: 'inline-block',
            }}
          />
          <span>RENACE Pulse</span>
          {!notificationsGranted && (
            <span style={{ color: '#38bdf8', textDecoration: 'underline', marginLeft: '4px' }}>
              Activar Notificaciones
            </span>
          )}
        </div>
      )}

      <style>{`
        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes pulseSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
