import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  MessageCircle,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorState from '../components/common/ErrorState';
import { SkeletonCard } from '../components/common/Skeleton';
import UpcomingAppointmentCard from '../components/dashboard/UpcomingAppointmentCard';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';
import BillingSummary from '../components/dashboard/BillingSummary';
import { useAsync } from '../hooks/useAsync';
import { useDoctorDirectory } from '../hooks/useDoctorDirectory';
import { fetchMyAppointments } from '../services/appointmentService';
import { fetchBilling } from '../services/billingService';
import { fetchMyPrescriptions } from '../services/prescriptionService';
import { useAuth } from '../context/AuthContext';
import { formatDate, isFuture } from '../utils/format';

export default function Dashboard() {
  const {
    profile,
    profileError,
    profileMissing,
    profileLoading,
    refreshProfile,
    user,
  } = useAuth();
  const { getDoctor } = useDoctorDirectory();
  const navigate = useNavigate();

  const appointments = useAsync(
    () => (profile?.id ? fetchMyAppointments() : Promise.resolve([])),
    [profile?.id],
  );
  const billing = useAsync(
    () =>
      profile?.id
        ? fetchBilling()
        : Promise.resolve({ billing: [] }),
    [profile?.id],
  );
  const prescriptions = useAsync(
    () => (profile?.id ? fetchMyPrescriptions() : Promise.resolve([])),
    [profile?.id],
  );

  const invoices = billing.data?.billing || [];
  const needsProfile = !profile && profileMissing;
  const profileFailed = !profile && !profileMissing && Boolean(profileError);

  const upcoming = useMemo(
    () =>
      (appointments.data || [])
        .filter((appointment) => appointment.status === 'scheduled')
        .filter((appointment) =>
          isFuture(appointment.appointment_date, appointment.appointment_time),
        )
        .sort(sortByAppointmentDate),
    [appointments.data],
  );

  const past = useMemo(
    () =>
      (appointments.data || [])
        .filter((appointment) => !upcoming.includes(appointment))
        .sort((a, b) => sortByAppointmentDate(b, a)),
    [appointments.data, upcoming],
  );

  const nextAppointment = upcoming[0] || null;

  const activePrescriptions = useMemo(
    () =>
      (prescriptions.data || []).filter(
        (prescription) =>
          String(prescription.status || '').toLowerCase() === 'active',
      ),
    [prescriptions.data],
  );

  const pendingInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        ['pending', 'unpaid', 'due'].includes(
          String(invoice.payment_status || '').toLowerCase(),
        ),
      ),
    [invoices],
  );

  const displayName = profile?.full_name || user?.email || 'there';
  const firstName = displayName.includes('@')
    ? displayName.split('@')[0]
    : displayName.split(' ')[0];

  const loading =
    profileLoading ||
    appointments.loading ||
    billing.loading ||
    prescriptions.loading;

  const failed =
    !needsProfile &&
    !profileFailed &&
    ((appointments.error && !appointments.data) ||
      (billing.error && !billing.data) ||
      (prescriptions.error && !prescriptions.data));

  return (
    <div className="animate-fade-in">
      {/* Welcome */}
      <section className="surface-wash mb-6 overflow-hidden rounded-2xl border border-hairline p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lavender-600 dark:text-lavender-300">
              {formatDate(new Date(), {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>

            <h1 className="mt-2 text-[25px] font-extrabold leading-tight text-ink sm:text-[31px]">
              {greeting()}, {firstName}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              {needsProfile
                ? 'Your account is signed in. Add your patient details to unlock appointments, prescriptions and billing.'
                : 'A calm overview of your upcoming care, prescriptions and invoices — all sourced from your own records.'}
            </p>

            {!needsProfile && !loading && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-ink-muted">
                <SummaryChip
                  icon={CalendarDays}
                  label={
                    upcoming.length === 1
                      ? '1 upcoming visit'
                      : `${upcoming.length} upcoming visits`
                  }
                />
                <SummaryChip
                  icon={ClipboardList}
                  label={
                    activePrescriptions.length === 1
                      ? '1 active prescription'
                      : `${activePrescriptions.length} active prescriptions`
                  }
                />
                <SummaryChip
                  icon={CreditCard}
                  label={
                    pendingInvoices.length === 1
                      ? '1 invoice awaiting payment'
                      : `${pendingInvoices.length} invoices awaiting payment`
                  }
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              variant="outline"
              iconLeft={<MessageCircle className="h-4 w-4" />}
              onClick={() => navigate('/assistant')}
            >
              Ask the assistant
            </Button>
            <Button
              iconLeft={<CalendarPlus className="h-4 w-4" />}
              onClick={() => navigate('/appointments?book=1')}
            >
              Book appointment
            </Button>
          </div>
        </div>
      </section>

      {needsProfile ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0 space-y-5">
            <Card className="border-lavender-200 bg-lavender-50/60">
              <div className="flex items-start gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-panel text-lavender-700 shadow-sm">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">
                    Complete your patient profile
                  </h2>
                  <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-muted">
                    We could not find a patient record for this account yet. Add
                    your name and basic details once; appointments, billing and
                    prescriptions will then be linked to you.
                  </p>
                  <Link
                    to="/profile"
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lavender-700 transition hover:text-lavender-900 dark:text-lavender-300"
                  >
                    Add patient details
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Card>

            <QuickActions />
          </div>

          <div className="min-w-0 space-y-5">
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-600 dark:text-lavender-300">
                AI health companion
              </p>
              <h2 className="mt-1.5 text-base font-bold text-ink">
                Ask Medigurdian AI
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Ask general health questions now. Once your patient profile and
                records exist, the assistant can also refer to your own care
                information through secured backend tools.
              </p>
              <Link
                to="/assistant"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lavender-700 transition hover:text-lavender-900 dark:text-lavender-300"
              >
                Start a conversation
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Card>

            <Card>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-600 dark:text-lavender-300">
                Next step
              </p>
              <h2 className="mt-1.5 text-base font-bold text-ink">
                Find the right doctor
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Browse the specialists currently published by the hospital. You
                can book as soon as your patient profile is complete.
              </p>
              <Link
                to="/doctors"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lavender-700 transition hover:text-lavender-900 dark:text-lavender-300"
              >
                Open the directory
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Card>

            <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-panel px-4 py-3.5">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-lavender-500"
                aria-hidden="true"
              />
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                Nothing is inferred or pre-filled. Every clinical detail shown
                in this portal comes from the backend record for your account.
              </p>
            </div>
          </div>
        </div>
      ) : profileFailed ? (
        <ErrorState
          title="We could not load your profile"
          message="Your patient profile could not be retrieved from the server, so your care summary is unavailable. Please try again."
          onRetry={refreshProfile}
        />
      ) : failed ? (
        <ErrorState
          title="We could not load your dashboard"
          message="Some care information could not be retrieved from the server. Please try again in a moment."
          onRetry={() => {
            appointments.reload();
            billing.reload();
            prescriptions.reload();
          }}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0 space-y-5">
            {loading ? (
              <SkeletonCard />
            ) : (
              <UpcomingAppointmentCard
                appointment={nextAppointment}
                doctor={getDoctor(nextAppointment?.doctor_id)}
              />
            )}

            <QuickActions />

            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-600 dark:text-lavender-300">
                    AI health companion
                  </p>
                  <h2 className="mt-1.5 text-base font-bold text-ink">
                    Ask Medigurdian AI
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
                    Ask about your appointments, prescriptions, invoices or
                    general health information. The assistant answers using your
                    own records where relevant.
                  </p>
                </div>

                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lavender-100 text-lavender-700 dark:bg-lavender-900/50 dark:text-lavender-200">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>

              <Link
                to="/assistant"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-lavender-700 transition hover:text-lavender-900 dark:text-lavender-300"
              >
                Start a conversation
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Card>
          </div>

          <div className="min-w-0 space-y-5">
            <BillingSummary invoices={invoices} loading={billing.loading} />

            {loading ? (
              <SkeletonCard />
            ) : (
              <RecentActivity
                appointments={[...upcoming, ...past]}
                invoices={invoices}
                getDoctor={getDoctor}
              />
            )}

            <Link
              to="/doctors"
              className="group flex items-start gap-3 rounded-xl border border-hairline bg-panel px-4 py-3.5 shadow-card transition hover:border-lavender-300 hover:shadow-card-hover"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lavender-50 text-lavender-700 dark:bg-lavender-900/50 dark:text-lavender-200">
                <Stethoscope className="h-[17px] w-[17px]" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">
                  Looking for another opinion?
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted">
                  Browse the doctor directory and compare specialisations.
                </span>
              </span>
              <ArrowRight
                className="ml-auto mt-1 h-4 w-4 shrink-0 text-ink-faint transition group-hover:text-lavender-600"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SummaryChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-lavender-500" aria-hidden="true" />
      {label}
    </span>
  );
}

function sortByAppointmentDate(a, b) {
  const left = `${a.appointment_date}T${String(
    a.appointment_time || '',
  ).slice(0, 5)}`;
  const right = `${b.appointment_date}T${String(
    b.appointment_time || '',
  ).slice(0, 5)}`;

  if (left === right) return 0;
  return left < right ? -1 : 1;
}
