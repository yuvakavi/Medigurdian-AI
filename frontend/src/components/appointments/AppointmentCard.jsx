import { CalendarDays, Clock, MapPin, Stethoscope } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { formatDateLong, formatTime, relativeDayLabel } from '../../utils/format';

/**
 * Appointment summary card used in the upcoming and past lists.
 */
export default function AppointmentCard({
  appointment,
  doctor,
  onCancel,
  onReschedule,
  cancelling = false,
}) {
  const relative = relativeDayLabel(appointment.appointment_date);
  const canModify = String(appointment.status || '').toLowerCase() === 'scheduled';

  return (
    <Card hover className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-ink">
              {doctor?.fullName
                ? `Dr. ${doctor.fullName.replace(/^dr\.?\s+/i, '')}`
                : 'Doctor consultation'}
            </h3>
            {doctor?.specialization && (
              <p className="mt-0.5 truncate text-[12.5px] font-medium text-teal-700 dark:text-teal-300">
                {doctor.specialization}
              </p>
            )}
          </div>
        </div>

        <StatusBadge status={appointment.status} className="shrink-0" />
      </div>

      <dl className="mt-4 space-y-2.5 border-t border-hairline pt-4">
        <div className="flex items-center gap-2.5 text-[13px]">
          <CalendarDays
            className="h-4 w-4 shrink-0 text-ink-faint"
            aria-hidden="true"
          />
          <span className="text-ink-soft">
            {formatDateLong(appointment.appointment_date)}
          </span>
          {relative && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              {relative}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[13px]">
          <Clock
            className="h-4 w-4 shrink-0 text-ink-faint"
            aria-hidden="true"
          />
          <span className="text-ink-soft">
            {formatTime(appointment.appointment_time)}
          </span>
        </div>

        <div className="flex items-start gap-2.5 text-[13px]">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint"
            aria-hidden="true"
          />
          <span className="text-ink-soft">
            {appointment.reason || 'General consultation'}
          </span>
        </div>
      </dl>

      {appointment.notes && (
        <p className="mt-3 rounded-lg bg-panel-muted px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink-soft">Notes: </span>
          {appointment.notes}
        </p>
      )}

      {canModify && (onCancel || onReschedule) && (
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {onReschedule && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReschedule(appointment)}
            >
              Reschedule
            </Button>
          )}
          {onCancel && (
            <Button
              variant="danger-outline"
              size="sm"
              loading={cancelling}
              onClick={() => onCancel(appointment)}
            >
              Cancel appointment
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
