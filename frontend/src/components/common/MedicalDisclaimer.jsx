import { ShieldAlert } from 'lucide-react';

/**
 * Medical disclaimer. Rendered on every screen that surfaces AI or
 * clinical information so the boundary of the tool is always visible.
 */
export default function MedicalDisclaimer({
  title = 'Medical disclaimer',
  message =
    'Medigurdian AI provides general health information and support only. It does not diagnose conditions, prescribe medication or replace professional medical advice. Always consult a qualified healthcare provider for diagnosis and treatment.',
  className = '',
  tone = 'default',
}) {
  const tones = {
    default:
      'border-amber-200 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200',
    danger:
      'border-rose-200 bg-rose-50/80 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200',
    neutral: 'border-hairline bg-panel-muted text-ink-muted',
  };

  return (
    <aside
      role="note"
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3',
        tones[tone] || tones.default,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-[13px] leading-relaxed">
        <span className="font-semibold">{title}. </span>
        {message}
      </p>
    </aside>
  );
}
