/**
 * Compact metric tile used on the dashboard.
 */
export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'navy',
  loading = false,
}) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  };

  return (
    <div className="rounded-2xl border border-hairline bg-panel p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
            {label}
          </p>

          {loading ? (
            <div className="mt-2.5 h-7 w-20 animate-pulse rounded-md bg-panel-sunken" />
          ) : (
            <p className="mt-1.5 truncate font-display text-[26px] font-extrabold leading-none text-ink">
              {value}
            </p>
          )}

          {hint && !loading && (
            <p className="mt-2 truncate text-[12.5px] text-ink-muted">{hint}</p>
          )}
        </div>

        {Icon && (
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
              tones[tone] || tones.navy
            }`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
