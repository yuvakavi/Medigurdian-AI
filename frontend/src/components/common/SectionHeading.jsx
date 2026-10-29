/**
 * Section heading used inside cards.
 */
export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-1 text-base font-bold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
