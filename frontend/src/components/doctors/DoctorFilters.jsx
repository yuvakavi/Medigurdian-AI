import { Search, SlidersHorizontal, X } from 'lucide-react';
import Select from '../common/Select';

/**
 * Search and filter controls for the doctor directory.
 */
export default function DoctorFilters({
  query,
  onQueryChange,
  specialization,
  onSpecializationChange,
  specializations = [],
  onlyAvailable = false,
  onOnlyAvailableChange,
  resultCount,
  totalCount,
}) {
  const hasFilters = Boolean(query || specialization || onlyAvailable);

  function reset() {
    onQueryChange('');
    onSpecializationChange('');
    onOnlyAvailableChange(false);
  }

  return (
    <div className="rounded-2xl border border-hairline bg-panel p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name, specialisation or department"
            aria-label="Search doctors"
            className="w-full rounded-lg border border-hairline bg-panel py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select
            name="specialization"
            value={specialization}
            onChange={(event) => onSpecializationChange(event.target.value)}
            options={specializations.map((value) => ({ value, label: value }))}
            placeholder="All specialisations"
            className="sm:w-56"
            aria-label="Filter by specialisation"
          />

          <label className="flex h-10 select-none items-center gap-2.5 rounded-lg border border-hairline bg-panel px-3.5 text-[13px] font-medium text-ink-soft">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(event) => onOnlyAvailableChange(event.target.checked)}
              className="h-4 w-4 rounded border-hairline text-navy-900 focus:ring-navy-500"
            />
            Available only
          </label>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Showing {resultCount} of {totalCount} doctors
        </p>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-semibold text-navy-700 transition hover:bg-panel-sunken dark:text-teal-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
