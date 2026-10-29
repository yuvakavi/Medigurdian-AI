/**
 * Loading spinner with an optional label.
 */
export default function Spinner({ className = '', label }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-lavender-200 border-t-lavender-600 dark:border-lavender-900 dark:border-t-lavender-300"
        aria-hidden="true"
      />
      {label && <span className="text-sm text-ink-muted">{label}</span>}
      <span className="sr-only">Loading</span>
    </span>
  );
}
