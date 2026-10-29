/**
 * Page-level header with an optional breadcrumb trail and action slot.
 */
export default function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  icon,
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-muted">
              {breadcrumb.map((crumb, index) => (
                <li
                  key={`${crumb.label}-${index}`}
                  className="flex items-center gap-1.5"
                >
                  {index > 0 && <span aria-hidden="true">/</span>}
                  {crumb.to ? (
                    <a
                      href={crumb.to}
                      className="rounded transition-colors hover:text-lavender-700 dark:hover:text-lavender-300"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-ink-soft">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lavender-100 text-lavender-700 dark:bg-lavender-950/60 dark:text-lavender-300">
              {icon}
            </span>
          )}
          <h1 className="text-[22px] font-bold leading-tight text-ink sm:text-[26px]">
            {title}
          </h1>
        </div>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}
