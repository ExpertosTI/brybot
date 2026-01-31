import { api } from '../api';

export type Contract = {
  id?: string | number;
  symbol?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

const normalizeContracts = (data: unknown): Contract[] => {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { contracts?: unknown }).contracts)
      ? ((data as { contracts: unknown[] }).contracts ?? [])
      : [];

  return raw.map(item => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { symbol: String(item), name: String(item) };
    }
    if (item && typeof item === 'object') {
      return item as Contract;
    }
    return {};
  });
};

export async function fetchContracts(integrationId?: number): Promise<{
  items: Contract[];
  source?: string;
  error?: string;
}> {
  const params = integrationId ? { integration_id: integrationId } : undefined;
  const res = await api.get('/contracts', { params });
  const data = res.data;

  return {
    items: normalizeContracts(data),
    source: data && typeof data === 'object' ? (data as { source?: string }).source : undefined,
    error: data && typeof data === 'object' ? (data as { error?: string }).error : undefined,
  };
}
