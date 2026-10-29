import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

/**
 * Brand mark used in the sidebar, the top bar and the auth screens.
 *
 * `tone="light"` is for placement on the deep lavender auth panel;
 * `tone="dark"` is for white/pale surfaces.
 */
export default function Logo({ compact = false, tone = 'dark', to = '/' }) {
  const isLightTone = tone === 'light';

  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2.5"
      aria-label="Medigurdian AI home"
    >
      <span
        className={[
          'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
          isLightTone
            ? 'bg-white/15 text-white ring-1 ring-inset ring-white/25'
            : 'bg-lavender-600 text-white',
        ].join(' ')}
      >
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>

      {!compact && (
        <span
          className={`font-display text-[15px] font-extrabold tracking-tight ${
            isLightTone ? 'text-white' : 'text-ink'
          }`}
        >
          Medigurdian{' '}
          <span
            className={
              isLightTone
                ? 'text-lavender-200'
                : 'text-lavender-700 dark:text-lavender-300'
            }
          >
            AI
          </span>
        </span>
      )}
    </Link>
  );
}
