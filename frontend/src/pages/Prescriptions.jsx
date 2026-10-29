import { useMemo, useState } from 'react';
import { ClipboardList, Pill, Search, Stethoscope } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import MedicalDisclaimer from '../components/common/MedicalDisclaimer';
import { SkeletonCard } from '../components/common/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { useDoctorDirectory } from '../hooks/useDoctorDirectory';
import { fetchMedicines } from '../services/medicineService';
import { fetchMyPrescriptions } from '../services/prescriptionService';
import { formatDate } from '../utils/format';

export default function Prescriptions() {
  const prescriptions = useAsync(() => fetchMyPrescriptions(), []);
  const medicines = useAsync(() => fetchMedicines(), []);
  const { getDoctor } = useDoctorDirectory();

  const [query, setQuery] = useState('');

  const records = prescriptions.data || [];

  const medicineById = useMemo(() => {
    const map = new Map();
    (medicines.data || []).forEach((medicine) => {
      map.set(String(medicine.id), medicine);
    });
    return map;
  }, [medicines.data]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return records;

    return records.filter((prescription) => {
      const medicine = medicineById.get(String(prescription.medicine_id));

      return [
        medicine?.medicine_name,
        medicine?.generic_name,
        prescription.dosage,
        prescription.instructions,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [records, query, medicineById]);

  const activeCount = records.filter(
    (prescription) =>
      String(prescription.status || '').toLowerCase() === 'active',
  ).length;

  if (prescriptions.error && !prescriptions.data) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Prescriptions"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <ErrorState
          title="Unable to load your prescriptions"
          message={prescriptions.error}
          onRetry={prescriptions.reload}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Prescriptions"
        description="Medicines prescribed to you by your treating clinicians."
        icon={<ClipboardList className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Prescriptions' }]}
      />

      <MedicalDisclaimer
        title="Follow the prescription"
        message="Take medicines exactly as prescribed by your clinician. Do not start, stop or change a dose without speaking to your doctor or pharmacist."
        className="mb-5"
      />

      {records.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-hairline bg-panel p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by medicine or dosage"
              aria-label="Search prescriptions"
              className="w-full rounded-lg border border-hairline bg-panel py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none"
            />
          </div>

          <p className="text-[12.5px] text-ink-muted">
            {activeCount} active · {records.length} total
          </p>
        </div>
      )}

      {prescriptions.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No prescriptions yet"
          description="Prescriptions issued by your clinicians will appear here once they are recorded against your account."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No prescriptions match your search"
          description="Try a different medicine name or dosage."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((prescription) => {
            const medicine = medicineById.get(String(prescription.medicine_id));
            const doctor = getDoctor(prescription.doctor_id);

            return (
              <Card key={prescription.id} hover className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Pill className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>

                  <StatusBadge status={prescription.status} />
                </div>

                <h3 className="mt-4 text-[15px] font-bold text-ink">
                  {medicine?.medicine_name || 'Prescribed medicine'}
                </h3>

                {medicine?.generic_name && (
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">
                    {medicine.generic_name}
                    {medicine.strength ? ` · ${medicine.strength}` : ''}
                  </p>
                )}

                <dl className="mt-4 space-y-1.5 border-t border-hairline pt-4 text-[12.5px]">
                  {prescription.dosage && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-ink-muted">Dosage</dt>
                      <dd className="text-right font-medium text-ink">
                        {prescription.dosage}
                      </dd>
                    </div>
                  )}
                  {prescription.frequency && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-ink-muted">Frequency</dt>
                      <dd className="text-right font-medium text-ink">
                        {prescription.frequency}
                      </dd>
                    </div>
                  )}
                  {prescription.duration && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-ink-muted">Duration</dt>
                      <dd className="text-right font-medium text-ink">
                        {prescription.duration}
                      </dd>
                    </div>
                  )}
                  {prescription.start_date && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-ink-muted">Start date</dt>
                      <dd className="text-right font-medium text-ink">
                        {formatDate(prescription.start_date)}
                      </dd>
                    </div>
                  )}
                  {prescription.end_date && (
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-ink-muted">End date</dt>
                      <dd className="text-right font-medium text-ink">
                        {formatDate(prescription.end_date)}
                      </dd>
                    </div>
                  )}
                </dl>

                {prescription.instructions && (
                  <p className="mt-3 rounded-lg bg-panel-muted px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                    {prescription.instructions}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {doctor?.fullName && (
                    <Badge tone="navy">
                      <Stethoscope className="h-3 w-3" aria-hidden="true" />
                      Dr. {doctor.fullName.replace(/^dr\.?\s+/i, '')}
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
