import React, { useState, useEffect } from 'react';
import { api } from '../../api';

interface MarketStructureCardProps {
  symbol: string;
  resolution: string;
}

export const MarketStructureCard: React.FC<MarketStructureCardProps> = ({ symbol, resolution }) => {
  const [data, setData] = useState<{
    divergences: any[];
    liquidity_sweeps: any[];
    fair_value_gaps: any[];
    supply_demand_zones: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStructure = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 3600 * 24 * 3; // 3 days
      const res = await api.post('/analysis/market-analysis', {
        symbol,
        resolution,
        start,
        end: now,
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to compute market structure.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, [symbol, resolution]);

  return (
    <div className="panel-card market-structure-card">
      <div className="panel-header">
        <div className="header-left">
          <span className="panel-eyebrow">ICT / SMC TELEMETRY</span>
          <h3>Market Structure Analysis</h3>
        </div>
        <button
          type="button"
          className="refresh-structure-btn"
          onClick={fetchStructure}
          disabled={loading}
        >
          {loading ? 'Scanning...' : 'Scan Matrix'}
        </button>
      </div>

      {error && <div className="inline-alert danger">{error}</div>}

      <div className="structure-metrics-grid">
        <div className="struct-metric-box">
          <span className="struct-label">LIQUIDITY SWEEPS</span>
          <span className="struct-num text-cyan">
            {data?.liquidity_sweeps?.length ?? 0}
          </span>
          <span className="struct-sub">High & Low Purges</span>
        </div>

        <div className="struct-metric-box">
          <span className="struct-label">FAIR VALUE GAPS</span>
          <span className="struct-num text-purple">
            {data?.fair_value_gaps?.length ?? 0}
          </span>
          <span className="struct-sub">Imbalances / Inefficiencies</span>
        </div>

        <div className="struct-metric-box">
          <span className="struct-label">SUPPLY / DEMAND</span>
          <span className="struct-num text-emerald">
            {data?.supply_demand_zones?.length ?? 0}
          </span>
          <span className="struct-sub">Institutional Order Blocks</span>
        </div>

        <div className="struct-metric-box">
          <span className="struct-label">RSI DIVERGENCES</span>
          <span className="struct-num text-amber">
            {data?.divergences?.length ?? 0}
          </span>
          <span className="struct-sub">Momentum Exhaustion</span>
        </div>
      </div>

      {data && (
        <div className="structure-summary-footer">
          <span className="pulse-dot-green" />
          <span>
            Telemetry synchronized for <strong>{symbol}</strong> on <strong>{resolution === 'D' ? '1D' : `${resolution}m`}</strong> timeframe.
          </span>
        </div>
      )}
    </div>
  );
};
