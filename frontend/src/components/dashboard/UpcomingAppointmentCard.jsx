import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Stethoscope } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatDateLong, formatTime, relativeDayLabel } from '../../utils/format';

/**
 * Shows the patient's next scheduled appointment using real API data.
 */
export default function UpcomingAppointmentCard({ appointment, doctor }) {
  if (!appointment) {
    return (
      <Card>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
          Next appointment
        </p>
        <h2 className="mt-1.5 text-base font-bold text-ink">Nothing scheduled</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          You have no upcoming appointments. Book a consultation with one of
          our available doctors.
        </p>
        <Link
          to="/doctors"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy-700 transition hover:text-navy-900 dark:text-teal-300"
        >
          Find a doctor
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Card>
    );
  }

  const relative = relativeDayLabel(appointment.appointment_date);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
            Next appointment
          </p>
          <h2 className="mt-1.5 break-words text-base font-bold text-ink">
            {doctor?.fullName || 'Doctor consultation'}
          </h2>
        </div>
        <StatusBadge status={appointment.status} className="shrink-0" />
      </div>

      <dl className="mt-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Date
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {formatDateLong(appointment.appointment_date)}
              {relative && (
                <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  {relative}
                </span>
              )}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Time
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {formatTime(appointment.appointment_time)}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Reason
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {appointment.reason || 'General consultation'}
            </dd>
          </div>
        </div>
      </dl>

      <Link
        to="/appointments"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy-700 transition hover:text-navy-900 dark:text-teal-300"
      >
        Manage appointments
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Card>
  );
}
