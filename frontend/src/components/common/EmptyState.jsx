/**
 * Empty state shown when a list has no records.
 */
export default function EmptyState({
  icon: Icon,
  title = 'Nothing here yet',
  description,
  action,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-panel-muted/60 text-center',
        compact ? 'gap-2 px-5 py-8' : 'gap-3 px-6 py-14',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-panel-sunken text-ink-faint">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && (
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
