import { CalendarDays, Clock, Stethoscope } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/format';

/**
 * Doctor summary card. Every attribute is rendered only when the backend
 * supplied it — missing columns are simply not shown.
 */
export default function DoctorCard({ doctor, onView, onBook }) {
  const unavailable = doctor.isAvailable === false;

  return (
    <Card hover className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200">
          <Stethoscope className="h-5 w-5" aria-hidden="true" />
        </span>

        {doctor.isAvailable === undefined ? (
          <Badge tone="neutral">Availability not published</Badge>
        ) : (
          <Badge tone={unavailable ? 'rose' : 'emerald'} dot>
            {unavailable ? 'Unavailable' : 'Available'}
          </Badge>
        )}
      </div>

      <h3 className="mt-4 text-[15px] font-bold text-ink">
        {doctor.fullName
          ? `Dr. ${doctor.fullName.replace(/^dr\.?\s+/i, '')}`
          : 'Doctor'}
      </h3>

      <p className="mt-1 text-[13px] font-medium text-teal-700 dark:text-teal-300">
        {doctor.specialization || doctor.department || 'Healthcare specialist'}
      </p>

      {doctor.department && doctor.specialization && (
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          {doctor.department}
        </p>
      )}

      <dl className="mt-4 space-y-2 border-t border-hairline pt-4">
        {doctor.qualification && (
          <div className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-muted">Qualification</dt>
            <dd className="text-right font-medium text-ink">
              {doctor.qualification}
            </dd>
          </div>
        )}

        {doctor.experienceYears !== undefined && (
          <div className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-muted">Experience</dt>
            <dd className="text-right font-medium text-ink">
              {doctor.experienceYears} years
            </dd>
          </div>
        )}

        {doctor.consultationFee !== undefined && (
          <div className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-muted">Consultation fee</dt>
            <dd className="text-right font-semibold text-ink">
              {formatCurrency(doctor.consultationFee)}
            </dd>
          </div>
        )}

        {doctor.rating !== undefined && (
          <div className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-muted">Rating</dt>
            <dd className="text-right font-medium text-ink">
              {doctor.rating} / 5
            </dd>
          </div>
        )}

        {doctor.hospital && (
          <div className="flex items-start justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-muted">Hospital</dt>
            <dd className="text-right font-medium text-ink">
              {doctor.hospital}
            </dd>
          </div>
        )}
      </dl>

      {(doctor.availableDays?.length || doctor.availableTime) && (
        <div className="mt-4 space-y-2 rounded-lg bg-panel-muted px-3.5 py-3">
          {doctor.availableDays?.length > 0 && (
            <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
              <CalendarDays
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint"
                aria-hidden="true"
              />
              <span>{doctor.availableDays.join(', ')}</span>
            </p>
          )}

          {doctor.availableTime && (
            <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
              <Clock
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint"
                aria-hidden="true"
              />
              <span>{doctor.availableTime}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onView?.(doctor)}
        >
          View details
        </Button>

        <Button
          size="sm"
          className="flex-1"
          disabled={unavailable}
          onClick={() => onBook?.(doctor)}
        >
          Book
        </Button>
      </div>
    </Card>
  );
}
