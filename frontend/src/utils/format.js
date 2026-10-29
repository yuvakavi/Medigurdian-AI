/**
 * Formatting helpers shared across the application.
 *
 * All monetary values are rendered in Indian Rupees (INR) because the
 * project targets the Indian healthcare context.
 */

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const currencyCompactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return currencyFormatter.format(amount);
}

export function formatCurrencyCompact(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return currencyCompactFormatter.format(amount);
}

export function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-IN').format(number);
}

/* =========================================================
   DATES
   ========================================================= */

function toDate(value) {
  if (!value) return null;

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  // "2026-10-21" must not be shifted by the local timezone.
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value, options = {}) {
  const date = toDate(value);
  if (!date) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatDateLong(value) {
  const date = toDate(value);
  if (!date) return '—';

  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '—';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Converts a 24h "HH:MM:SS" / "HH:MM" string into a readable 12h time. */
export function formatTime(value) {
  if (!value) return '—';

  const match = /^(\d{1,2}):(\d{2})/.exec(String(value).trim());
  if (!match) return String(value);

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHour}:${minutes} ${suffix}`;
}

/** "Today" / "Tomorrow" / "In 3 days" style relative label. */
export function relativeDayLabel(value) {
  const date = toDate(value);
  if (!date) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return null;
}

export function isToday(value) {
  const date = toDate(value);
  if (!date) return false;

  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/** True when the date/time pair is strictly in the future. */
export function isFuture(dateValue, timeValue) {
  const date = toDate(dateValue);
  if (!date) return false;

  if (!timeValue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(String(timeValue).trim());
  if (!match) return date >= new Date();

  const candidate = new Date(date);
  candidate.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return candidate.getTime() > Date.now();
}

/* =========================================================
   TEXT
   ========================================================= */

export function initials(name) {
  if (!name) return 'P';

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function titleCase(value) {
  if (!value) return '';

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function truncate(text, length = 120) {
  if (!text) return '';
  const value = String(text);
  return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}

export function pluralize(count, singular, plural) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural || `${singular}s`}`;
}
