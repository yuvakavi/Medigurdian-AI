const TONE_STYLES = {
  neutral: 'bg-panel-sunken text-ink-soft ring-1 ring-inset ring-hairline',
  navy: 'bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-100 dark:bg-navy-950/50 dark:text-navy-200 dark:ring-navy-800',
  teal: 'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-100 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-900',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900',
  amber:
    'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
  violet:
    'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
};

/**
 * Small pill used for metadata and counts.
 */
export default function Badge({
  children,
  tone = 'neutral',
  className = '',
  dot = false,
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        TONE_STYLES[tone] || TONE_STYLES.neutral,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
