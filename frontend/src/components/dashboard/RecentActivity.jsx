import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ReceiptText } from 'lucide-react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';

/**
 * Recent activity feed composed from real appointment and invoice records.
 * Nothing is generated — the list only contains rows returned by the API.
 */
export default function RecentActivity({
  appointments = [],
  invoices = [],
  getDoctor,
}) {
  const items = [
    ...appointments.map((appointment) => ({
      id: `appointment-${appointment.id}`,
      title: doctorName(getDoctor, appointment.doctor_id),
      subtitle:
        appointment.reason ||
        (appointment.status === 'completed'
          ? 'Completed consultation'
          : 'Scheduled consultation'),
      meta: `${formatDate(appointment.appointment_date)} · ${formatTime(
        appointment.appointment_time,
      )}`,
      timestamp: appointmentTime(appointment),
      status: appointment.status,
      icon: CalendarDays,
      iconTone: 'bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200',
    })),
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      title: invoice.description || invoice.invoice_number || 'Invoice',
      subtitle: invoice.invoice_number
        ? `Invoice ${invoice.invoice_number}`
        : 'Billing record',
      meta: `${formatDate(
        invoice.billing_date || invoice.created_at,
      )} · ${formatCurrency(invoice.amount)}`,
      timestamp: invoiceTime(invoice),
      status: invoice.payment_status,
      icon: ReceiptText,
      iconTone:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    })),
  ]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 6);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
            Recent activity
          </p>
          <h2 className="mt-1.5 text-base font-bold text-ink">Latest updates</h2>
        </div>

        <Link
          to="/appointments"
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy-700 transition hover:text-navy-900 dark:text-teal-300"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-hairline bg-panel-muted/60 px-4 py-6 text-center text-sm text-ink-muted">
          No activity yet. Your appointments and invoices will appear here.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-hairline">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${item.iconTone}`}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  {item.title}
                </p>
                <p className="truncate text-[12px] text-ink-muted">
                  {item.subtitle}
                </p>
              </div>

              <div className="hidden shrink-0 text-right sm:block">
                <p className="text-[12px] font-medium text-ink-soft">
                  {item.meta}
                </p>
              </div>

              <StatusBadge status={item.status} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function doctorName(getDoctor, doctorId) {
  const doctor = getDoctor ? getDoctor(doctorId) : null;
  return doctor?.fullName || 'Doctor consultation';
}

function appointmentTime(appointment) {
  const value = new Date(
    `${appointment.appointment_date}T${String(
      appointment.appointment_time || '',
    ).slice(0, 5)}`,
  );
  return Number.isNaN(value.getTime()) ? 0 : value.getTime();
}

function invoiceTime(invoice) {
  const value = new Date(invoice.billing_date || invoice.created_at);
  return Number.isNaN(value.getTime()) ? 0 : value.getTime();
}
