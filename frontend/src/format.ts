const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const axisFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

export function formatAxisTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : axisFormatter.format(date);
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return ISO_DATE_TIME.test(value) ? formatDateTime(value) : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
}

export function formatSecondsOld(value: string, now: number): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return '—';
  }

  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  return `${seconds}s old`;
}

export function formatElapsed(value: string, now: number): string {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return '—';
  }

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 1) {
    return 'now';
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
