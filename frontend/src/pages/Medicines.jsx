import { useMemo, useState } from 'react';
import { Pill, Search, TriangleAlert } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import MedicalDisclaimer from '../components/common/MedicalDisclaimer';
import Modal from '../components/common/Modal';
import { SkeletonCard } from '../components/common/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { fetchMedicines } from '../services/medicineService';

/**
 * Medicine information catalogue.
 *
 * Every fact shown here comes from `GET /api/medicines`. The backend does
 * not expose a recommendation or interaction-checking endpoint, so none is
 * offered.
 */
export default function Medicines() {
  const medicines = useAsync(() => fetchMedicines(), []);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const list = medicines.data || [];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return list;

    return list.filter((medicine) =>
      [
        medicine.medicine_name,
        medicine.generic_name,
        medicine.brand_name,
        medicine.medicine_type,
        medicine.uses,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [list, query]);

  if (medicines.error && !medicines.data) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Medicines" icon={<Pill className="h-5 w-5" />} />
        <ErrorState
          title="Unable to load the medicine catalogue"
          message={medicines.error}
          onRetry={medicines.reload}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Medicines"
        description="Reference information for the medicines registered on the platform."
        icon={<Pill className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Medicines' }]}
      />

      <MedicalDisclaimer
        title="Reference only"
        message="The information below is a catalogue reference, not a recommendation. Take medicines only as prescribed by a qualified doctor and consult a pharmacist before combining medicines."
        className="mb-5"
      />

      <div className="mb-5 rounded-2xl border border-hairline bg-panel p-4 shadow-card">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by medicine name, generic name or brand"
            aria-label="Search medicines"
            className="w-full rounded-lg border border-hairline bg-panel py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
          />
        </div>

        <p className="mt-2.5 text-[12.5px] text-ink-muted">
          Showing {filtered.length} of {list.length} medicines
        </p>
      </div>

      {medicines.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medicines published"
          description="The medicine catalogue is currently empty on the backend."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No medicines match your search"
          description="Try a different medicine or generic name."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((medicine) => (
            <Card key={medicine.id} hover className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  <Pill className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>

                {medicine.medicine_type && (
                  <Badge tone="teal">{medicine.medicine_type}</Badge>
                )}
              </div>

              <h3 className="mt-4 text-[15px] font-bold text-ink">
                {medicine.medicine_name}
              </h3>

              {medicine.generic_name && (
                <p className="mt-0.5 text-[12.5px] text-ink-muted">
                  {medicine.generic_name}
                  {medicine.brand_name ? ` · ${medicine.brand_name}` : ''}
                </p>
              )}

              <dl className="mt-4 space-y-1.5 border-t border-hairline pt-4 text-[12.5px]">
                {medicine.dosage && (
                  <MetaRow label="Dosage" value={medicine.dosage} />
                )}
                {medicine.strength && (
                  <MetaRow label="Strength" value={medicine.strength} />
                )}
                {medicine.route && (
                  <MetaRow label="Route" value={medicine.route} />
                )}
                {medicine.frequency && (
                  <MetaRow label="Frequency" value={medicine.frequency} />
                )}
                {medicine.duration && (
                  <MetaRow label="Duration" value={medicine.duration} />
                )}
              </dl>

              {medicine.uses && (
                <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">
                  {medicine.uses}
                </p>
              )}

              <button
                type="button"
                onClick={() => setSelected(medicine)}
                className="mt-auto pt-4 text-left text-[13px] font-semibold text-navy-700 transition hover:text-navy-900 dark:text-teal-300"
              >
                View full details →
              </button>
            </Card>
          ))}
        </div>
      )}

      <MedicineDetailModal
        medicine={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function MedicineDetailModal({ medicine, open, onClose }) {
  if (!medicine) return null;

  const warnings = [
    { label: 'Warnings', value: medicine.warnings },
    { label: 'Side effects', value: medicine.side_effects },
    { label: 'Contraindications', value: medicine.contraindications },
  ].filter((item) => item.value);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={medicine.medicine_name}
      description={
        [medicine.generic_name, medicine.brand_name].filter(Boolean).join(' · ')
      }
      size="lg"
    >
      <div className="space-y-5">
        <dl className="grid gap-x-8 gap-y-3 rounded-xl bg-panel-muted px-4 py-4 sm:grid-cols-2">
          {[
            { label: 'Type', value: medicine.medicine_type },
            { label: 'Dosage', value: medicine.dosage },
            { label: 'Strength', value: medicine.strength },
            { label: 'Route', value: medicine.route },
            { label: 'Frequency', value: medicine.frequency },
            { label: 'Duration', value: medicine.duration },
          ]
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label}>
                <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {row.value}
                </dd>
              </div>
            ))}
        </dl>

        {medicine.uses && (
          <Section title="What it is used for">
            <p className="text-sm leading-relaxed text-ink-soft">
              {medicine.uses}
            </p>
          </Section>
        )}

        {medicine.instructions && (
          <Section title="Instructions">
            <p className="text-sm leading-relaxed text-ink-soft">
              {medicine.instructions}
            </p>
          </Section>
        )}

        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              Safety information
            </h3>

            <dl className="mt-3 space-y-3">
              {warnings.map((item) => (
                <div key={item.label}>
                  <dt className="text-[11.5px] font-bold uppercase tracking-wide text-amber-800/80 dark:text-amber-300/80">
                    {item.label}
                  </dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <MedicalDisclaimer tone="neutral" />
      </div>
    </Modal>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
