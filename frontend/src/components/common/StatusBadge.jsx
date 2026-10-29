const STATUS_TONES = {
  scheduled: 'sky',
  confirmed: 'emerald',
  completed: 'neutral',
  cancelled: 'rose',
  pending: 'amber',
  paid: 'emerald',
  unpaid: 'amber',
  partially_paid: 'amber',
  refunded: 'violet',
  failed: 'rose',
  active: 'emerald',
  expired: 'neutral',
  open: 'rose',
  in_progress: 'amber',
  resolved: 'emerald',
  available: 'emerald',
  unavailable: 'rose',
  uploaded: 'sky',
  processing: 'amber',
  processed: 'emerald',
  analyzed: 'emerald',
  error: 'rose',
};

const TONE_CLASSES = {
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900',
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900',
  violet:
    'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900',
  neutral: 'bg-panel-sunken text-ink-soft ring-hairline',
};

/**
 * Maps a backend status string onto a coloured status badge.
 */
export default function StatusBadge({ status, className = '' }) {
  const key = String(status || '').toLowerCase().trim();
  const tone = TONE_CLASSES[STATUS_TONES[key] || 'neutral'];

  const label = key
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
        'ring-1 ring-inset',
        tone,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-75"
        aria-hidden="true"
      />
      {label || 'Unknown'}
    </span>
  );
}
