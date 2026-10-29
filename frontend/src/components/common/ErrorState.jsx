import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Error state with a retry action for recoverable failures.
 */
export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className = '',
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/70 text-center',
        'dark:border-rose-900/50 dark:bg-rose-950/25',
        compact ? 'gap-2 px-5 py-6' : 'gap-3 px-6 py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>

      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {message && (
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-muted">
            {message}
          </p>
        )}
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
