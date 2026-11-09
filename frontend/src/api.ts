import type { BatteryStatus, MonitorStatus, TableData, ViewSummary } from './types';

async function request<T>(url: string, signal?: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    signal,
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
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

export async function getBattery(signal?: AbortSignal): Promise<BatteryStatus | null> {
  const response = await fetch('/api/battery', {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Could not load battery status (${response.status})`);
  }

  return (await response.json()) as BatteryStatus;
}

export function getMonitorStatus(signal?: AbortSignal): Promise<MonitorStatus> {
  return request<MonitorStatus>('/api/monitor', signal);
}

export function setMonitorInterval(value: 'stream' | '2h'): Promise<MonitorStatus> {
  return request<MonitorStatus>(
    `/api/monitor/interval?value=${encodeURIComponent(value)}`,
    undefined,
    { method: 'POST' },
  );
}
