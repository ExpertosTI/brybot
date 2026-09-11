import React from 'react';

export interface ActivityEvent {
  id: string;
  time: string;
  type: 'info' | 'trade' | 'alert' | 'structure';
  message: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  onClear?: () => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ events, onClear }) => {
  return (
    <div className="panel-card activity-feed-panel">
      <div className="panel-header">
        <div className="header-left">
          <span className="panel-eyebrow">TELEMETRY & SIGNALS</span>
          <h3>Live Engine Event Stream</h3>
        </div>
        {onClear && (
          <button type="button" className="clear-feed-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      <div className="activity-scroll-area">
        {events.length === 0 ? (
          <div className="empty-feed">Awaiting engine telemetry...</div>
        ) : (
          events.slice(-25).reverse().map((ev) => (
            <div key={ev.id} className={`activity-log-line ${ev.type}`}>
              <span className="log-timestamp">{ev.time}</span>
              <span className={`log-badge ${ev.type}`}>{ev.type.toUpperCase()}</span>
              <span className="log-message">{ev.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
