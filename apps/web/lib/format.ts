/** Display formatting. Dates render in India Standard Time regardless of the viewer's zone. */

const TIME_ZONE = 'Asia/Kolkata';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
});

/** "29 Sept 2026" style date in IST. Accepts ISO timestamps or YYYY-MM-DD dates. */
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

/** Date and time in IST, e.g. "4 Aug 2026, 9:00 am IST". */
export function formatDateTime(value: string): string {
  return `${dateTimeFormatter.format(new Date(value))} IST`;
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "3 days ago". Falls back to the date beyond 30 days, and for future timestamps (clock skew). */
export function formatRelative(value: string, now: Date = new Date()): string {
  const diffSeconds = (new Date(value).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diffSeconds);
  if (diffSeconds > 60) return formatDate(value);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 30 * 86_400) return relative.format(Math.round(diffSeconds / 86_400), 'day');
  return formatDate(value);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/** Initials for avatars: "Priya Raman" → "PR". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Lower-case machine key from a display name: "Quote and Comparison" → "quote_and_comparison". */
export function toKey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return /^[a-z]/.test(key) ? key : `stage_${key}`;
}
