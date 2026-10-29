import { Link } from 'react-router-dom';
import { CalendarPlus, CreditCard, MessageCircle, Stethoscope } from 'lucide-react';
import Card from '../common/Card';

/**
 * Primary actions surfaced on the dashboard.
 */
export default function QuickActions() {
  const actions = [
    {
      to: '/assistant',
      label: 'Ask the AI Assistant',
      description: 'Understand reports, medicines and symptoms',
      icon: MessageCircle,
      tone: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-200',
    },
    {
      to: '/doctors',
      label: 'Find a Doctor',
      description: 'Browse specialists and availability',
      icon: Stethoscope,
      tone: 'bg-navy-50 text-navy-700 dark:bg-navy-950/60 dark:text-navy-200',
    },
    {
      to: '/appointments?book=1',
      label: 'Book an Appointment',
      description: 'Reserve a consultation slot',
      icon: CalendarPlus,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
      to: '/billing',
      label: 'View Billing',
      description: 'Review invoices and payment status',
      icon: CreditCard,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
  ];

  return (
    <Card>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">
        Quick actions
      </p>
      <h2 className="mt-1.5 text-base font-bold text-ink">Take care of your health</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex items-start gap-3 rounded-xl border border-hairline bg-panel-muted/60 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-200 hover:bg-panel hover:shadow-card dark:hover:border-navy-700"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${action.tone}`}
            >
              <action.icon className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>

            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-ink">
                {action.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
