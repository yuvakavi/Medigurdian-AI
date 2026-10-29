import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/format';

/**
 * Full doctor detail view. Fields appear only when the backend returned
 * them for this specific doctor.
 */
export default function DoctorDetailModal({ doctor, open, onClose, onBook }) {
  if (!doctor) return null;

  const unavailable = doctor.isAvailable === false;
  const displayName = doctor.fullName
    ? `Dr. ${doctor.fullName.replace(/^dr\.?\s+/i, '')}`
    : 'Doctor';

  const rows = [
    { label: 'Specialisation', value: doctor.specialization },
    { label: 'Department', value: doctor.department },
    { label: 'Qualification', value: doctor.qualification },
    {
      label: 'Experience',
      value:
        doctor.experienceYears !== undefined
          ? `${doctor.experienceYears} years`
          : undefined,
    },
    {
      label: 'Consultation fee',
      value:
        doctor.consultationFee !== undefined
          ? formatCurrency(doctor.consultationFee)
          : undefined,
    },
    {
      label: 'Rating',
      value:
        doctor.rating !== undefined ? `${doctor.rating} / 5` : undefined,
    },
    { label: 'Hospital', value: doctor.hospital },
    { label: 'Contact', value: doctor.phone || doctor.email },
  ].filter((row) => row.value);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={displayName}
      description={
        doctor.specialization || doctor.department || 'Healthcare specialist'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            disabled={unavailable}
            onClick={() => {
              onClose();
              onBook?.(doctor);
            }}
          >
            {unavailable ? 'Doctor unavailable' : 'Book appointment'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {doctor.isAvailable === undefined ? (
            <Badge tone="neutral">Availability not published</Badge>
          ) : (
            <Badge tone={unavailable ? 'rose' : 'emerald'} dot>
              {unavailable ? 'Currently unavailable' : 'Accepting appointments'}
            </Badge>
          )}

          {doctor.rating !== undefined && (
            <Badge tone="navy">{doctor.rating} / 5 rating</Badge>
          )}
        </div>

        {doctor.bio && (
          <p className="text-sm leading-relaxed text-ink-soft">{doctor.bio}</p>
        )}

        {rows.length > 0 && (
          <dl className="grid gap-x-8 gap-y-3 rounded-xl bg-panel-muted px-4 py-4 sm:grid-cols-2">
            {rows.map((row) => (
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
        )}

        {(doctor.availableDays?.length > 0 || doctor.availableTime) && (
          <div className="rounded-xl border border-hairline p-4">
            <h3 className="text-sm font-bold text-ink">Availability</h3>

            {doctor.availableDays?.length > 0 && (
              <div className="mt-3">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  Working days
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {doctor.availableDays.map((day) => (
                    <Badge key={day} tone="teal">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {doctor.availableTime && (
              <div className="mt-3">
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  Working hours
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {doctor.availableTime}
                </p>
              </div>
            )}
          </div>
        )}

        {rows.length === 0 && !doctor.bio && (
          <p className="text-sm text-ink-muted">
            The backend has not published any additional details for this
            doctor.
          </p>
        )}
      </div>
    </Modal>
  );
}
