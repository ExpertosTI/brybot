import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

type Integration = {
  id: number;
  display_name: string;
  provider: string;
  status: string;
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
  has_credentials: boolean;
};

type FormState = {
  display_name: string;
  provider: string;
  status: string;
  environment: string;
  accountId: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  refreshToken: string;
};

const PROVIDERS = [
  { value: 'TOPSTEPX', label: 'TopStepX' },
  { value: 'TRADOVATE', label: 'Tradovate' },
  { value: 'NINJATRADER', label: 'NinjaTrader' },
  { value: 'TRADINGVIEW', label: 'TradingView' },
  { value: 'IBKR', label: 'Interactive Brokers' },
  { value: 'OTHER', label: 'Other' }
];

const emptyForm: FormState = {
  display_name: '',
  provider: 'TOPSTEPX',
  status: 'active',
  environment: '',
  accountId: '',
  baseUrl: '',
  apiKey: '',
  apiSecret: '',
  refreshToken: ''
};

function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const navigate = useNavigate();

  const loadIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      setIntegrations(res.data ?? []);
    } catch (err) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { status?: number } }).response;
        if (response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/', { replace: true, state: { expired: true } });
          return;
        }
      }
      console.error('Failed to load integrations', err);
      setError('Unable to load integrations.');
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const startCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setHasStoredCredentials(false);
    setError(null);
  };

  const startEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setHasStoredCredentials(integration.has_credentials);
    setForm({
      display_name: integration.display_name,
      provider: integration.provider,
      status: integration.status,
      environment: integration.metadata?.environment ?? '',
      accountId: integration.metadata?.accountId ?? '',
      baseUrl: integration.metadata?.baseUrl ?? '',
      apiKey: '',
      apiSecret: '',
      refreshToken: ''
    });
  };

  const buildMetadata = () => {
    const metadata: Record<string, string> = {};
    if (form.environment) metadata.environment = form.environment;
    if (form.accountId) metadata.accountId = form.accountId;
    if (form.baseUrl) metadata.baseUrl = form.baseUrl;
    return metadata;
  };

  const buildCredentials = () => {
    const credentials: Record<string, string> = {};
    if (form.apiKey) credentials.apiKey = form.apiKey;
    if (form.apiSecret) credentials.apiSecret = form.apiSecret;
    if (form.refreshToken) credentials.refreshToken = form.refreshToken;
    return Object.keys(credentials).length ? credentials : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const payload = {
      display_name: form.display_name,
      provider: form.provider,
      status: form.status,
      metadata: buildMetadata(),
      credentials: buildCredentials()
    };

    try {
      if (editingId) {
        const updatePayload = { ...payload };
        if (!updatePayload.credentials) {
          delete updatePayload.credentials;
        }
        await api.put(`/integrations/${editingId}`, updatePayload);
      } else {
        await api.post('/integrations', payload);
      }
      await loadIntegrations();
      startCreate();
    } catch (err) {
      console.error('Failed to save integration', err);
      setError('Could not save integration. Check the form and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (integrationId: number) => {
    setError(null);
    try {
      await api.delete(`/integrations/${integrationId}`);
      await loadIntegrations();
      if (editingId === integrationId) {
        startCreate();
      }
    } catch (err) {
      console.error('Failed to delete integration', err);
      setError('Could not delete integration.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/', { replace: true, state: { loggedOut: true } });
  };

  const integrationsEmpty = useMemo(() => integrations.length === 0, [integrations]);

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div>
            <p className="eyebrow">TopStep MVP Bot</p>
            <div className="app-title">Integrations</div>
          </div>
          <span className="pill subtle">setup</span>
        </div>
        <div className="topbar-center">
          <Link to="/dashboard" className="badge link">
            Back to dashboard
          </Link>
        </div>
        <div className="topbar-right">
          <div className="topbar-actions">
            <button type="button" className="ghost compact" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="layout integrations-layout">
        <aside className="panel card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Providers</p>
              <h2>{editingId ? 'Edit integration' : 'Add integration'}</h2>
            </div>
            <button type="button" className="ghost compact" onClick={startCreate}>
              New
            </button>
          </div>
          {error && (
            <div className="inline-alert danger" role="alert">
              {error}
            </div>
          )}
          <form className="integration-form" onSubmit={handleSubmit}>
            <label htmlFor="display_name">Display name</label>
            <input
              id="display_name"
              value={form.display_name}
              onChange={e => setForm({ ...form, display_name: e.target.value })}
              placeholder="TopStepX - Main"
              required
            />

            <label htmlFor="provider">Provider</label>
            <select
              id="provider"
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
              disabled={Boolean(editingId)}
            >
              {PROVIDERS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="error">Error</option>
            </select>

            <div className="form-divider">Metadata</div>
            <label htmlFor="environment">Environment</label>
            <input
              id="environment"
              value={form.environment}
              onChange={e => setForm({ ...form, environment: e.target.value })}
              placeholder="sandbox / live"
            />
            <label htmlFor="accountId">Account ID</label>
            <input
              id="accountId"
              value={form.accountId}
              onChange={e => setForm({ ...form, accountId: e.target.value })}
              placeholder="A-123"
            />
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              value={form.baseUrl}
              onChange={e => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.provider.com"
            />

            <div className="form-divider">Credentials</div>
            {hasStoredCredentials && !editingId && (
              <p className="muted tiny">Credentials are stored securely.</p>
            )}
            {hasStoredCredentials && editingId && (
              <p className="muted tiny">Credentials are stored. Enter new values to rotate.</p>
            )}
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={form.apiKey}
              onChange={e => setForm({ ...form, apiKey: e.target.value })}
              placeholder="••••••••"
            />
            <label htmlFor="apiSecret">API Secret</label>
            <input
              id="apiSecret"
              type="password"
              value={form.apiSecret}
              onChange={e => setForm({ ...form, apiSecret: e.target.value })}
              placeholder="••••••••"
            />
            <label htmlFor="refreshToken">Refresh Token</label>
            <input
              id="refreshToken"
              type="password"
              value={form.refreshToken}
              onChange={e => setForm({ ...form, refreshToken: e.target.value })}
              placeholder="••••••••"
            />

            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? 'Saving…' : editingId ? 'Update integration' : 'Save integration'}
            </button>
          </form>
        </aside>

        <section className="card integrations-list">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Linked platforms</p>
              <h2>Integrations</h2>
            </div>
            <span className="pill">{integrations.length}</span>
          </div>

          {integrationsEmpty ? (
            <div className="empty-state">
              <h3>No integrations yet</h3>
              <p className="muted">
                Add your first trading platform to enable live signals and automated trade
                execution.
              </p>
              <button type="button" className="primary" onClick={startCreate}>
                Add integration
              </button>
            </div>
          ) : (
            <div className="integration-cards">
              {integrations.map(integration => (
                <div key={integration.id} className="integration-card">
                  <div>
                    <h3>{integration.display_name}</h3>
                    <p className="muted tiny">
                      {integration.provider} · {integration.status}
                    </p>
                    <div className="meta-row">
                      <span>Environment:</span>
                      <strong>{integration.metadata?.environment ?? '—'}</strong>
                    </div>
                    <div className="meta-row">
                      <span>Account:</span>
                      <strong>{integration.metadata?.accountId ?? '—'}</strong>
                    </div>
                  </div>
                  <div className="integration-actions">
                    <button type="button" className="ghost compact" onClick={() => startEdit(integration)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost compact danger"
                      onClick={() => handleDelete(integration.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Integrations;
