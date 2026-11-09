import type { TableData, ViewSummary } from './types';

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getViews(signal?: AbortSignal): Promise<ViewSummary[]> {
  return request<ViewSummary[]>('/api/views', signal);
}

export function getView(name: string, signal?: AbortSignal): Promise<TableData> {
  return request<TableData>(`/api/views/${encodeURIComponent(name)}?limit=5000`, signal);
}
