import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Info, Sparkles } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { SkeletonCard } from '../components/common/Skeleton';
import AppointmentCard from '../components/appointments/AppointmentCard';
import AppointmentForm from '../components/appointments/AppointmentForm';
import { useAsync } from '../hooks/useAsync';
import { useDoctorDirectory } from '../hooks/useDoctorDirectory';
import {
  cancelAppointment,
  createAppointment,
  fetchMyAppointments,
} from '../services/appointmentService';
import { useToast } from '../context/ToastContext';
import { formatDateLong, formatTime, isFuture } from '../utils/format';

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const { doctors, getDoctor } = useDoctorDirectory();
  const appointments = useAsync(() => fetchMyAppointments(), []);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const bookParam = searchParams.get('book');
  const doctorParam = searchParams.get('doctor');

  useEffect(() => {
    if (bookParam === '1') {
      setBookingOpen(true);
      setBookingDoctorId(doctorParam || '');
    }
  }, [bookParam, doctorParam]);

  const records = appointments.data || [];

  const upcoming = useMemo(
    () =>
      records
        .filter((appointment) => appointment.status === 'scheduled')
        .filter((appointment) =>
          isFuture(appointment.appointment_date, appointment.appointment_time),
        )
        .sort(sortByDate),
    [records],
  );

  const past = useMemo(
    () =>
      records
        .filter((appointment) => !upcoming.includes(appointment))
        .sort((a, b) => sortByDate(b, a)),
    [records, upcoming],
  );

  function openBooking(doctorId) {
    setBookingDoctorId(doctorId || '');
    setBookingOpen(true);

    if (searchParams.get('book') || searchParams.get('doctor')) {
      searchParams.delete('book');
      searchParams.delete('doctor');
      setSearchParams(searchParams, { replace: true });
    }
  }

  function closeBooking() {
    setBookingOpen(false);
    setBookingDoctorId('');
  }

  async function handleBook(payload) {
    setSubmitting(true);

    try {
      const created = await createAppointment(payload);

      toast.success(
        `Appointment confirmed for ${formatDateLong(
          created.appointment_date,
        )} at ${formatTime(created.appointment_time)}.`,
      );

      closeBooking();
      appointments.reload();
    } catch (error) {
      toast.error(error?.message || 'Unable to book the appointment.');
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;

    setCancelling(true);

    try {
      await cancelAppointment(cancelTarget.id);
      toast.success('Your appointment has been cancelled.');
      setCancelTarget(null);
      appointments.reload();
    } catch (error) {
      toast.error(error?.message || 'Unable to cancel the appointment.');
    } finally {
      setCancelling(false);
    }
  }

  /**
   * The REST API exposes no reschedule route. The Medigurdian AI assistant
   * can reschedule through the backend's MCP reschedule tool, so the patient
   * is handed a ready-made request.
   */
  function handleReschedule(appointment) {
    const doctor = getDoctor(appointment.doctor_id);
    const doctorLabel = doctor?.fullName
      ? `with Dr. ${doctor.fullName.replace(/^dr\.?\s+/i, '')}`
      : 'with my doctor';

    const question = `Reschedule my appointment ${doctorLabel} currently booked on ${formatDateLong(
      appointment.appointment_date,
    )} at ${formatTime(appointment.appointment_time)} to a new date and time.`;

    navigate(`/assistant?q=${encodeURIComponent(question)}`);
  }

  if (appointments.error && !appointments.data) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Appointments"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <ErrorState
          title="Unable to load your appointments"
          message={appointments.error}
          onRetry={appointments.reload}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Appointments"
        description="Review your consultations, book new ones and manage what is scheduled."
        icon={<CalendarDays className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Appointments' }]}
        action={
          <Button
            iconLeft={<CalendarPlus className="h-4 w-4" />}
            onClick={() => openBooking('')}
          >
            Book appointment
          </Button>
        }
      />

      {appointments.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments yet"
          description="When you book a consultation it will appear here with the doctor's details, date, time and status."
          action={
            <Button className="mt-2" onClick={() => openBooking('')}>
              Book your first appointment
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-ink">
                Upcoming appointments
              </h2>
              <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[12px] font-semibold text-navy-700 dark:bg-navy-950/60 dark:text-navy-200">
                {upcoming.length}
              </span>
            </div>

            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-hairline bg-panel-muted/60 px-5 py-8 text-center">
                <p className="text-sm font-medium text-ink">
                  Nothing scheduled ahead
                </p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  You have no upcoming consultations.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    doctor={getDoctor(appointment.doctor_id)}
                    onCancel={setCancelTarget}
                    onReschedule={handleReschedule}
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-bold text-ink">
                  Past &amp; closed
                </h2>
                <span className="rounded-full bg-panel-sunken px-2.5 py-1 text-[12px] font-semibold text-ink-soft">
                  {past.length}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {past.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    doctor={getDoctor(appointment.doctor_id)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-panel px-4 py-3.5">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint"
              aria-hidden="true"
            />
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              <span className="font-semibold text-ink-soft">Rescheduling: </span>
              the backend does not expose a direct reschedule action yet, so the
              assistant handles it through the secured medical tools. Selecting{' '}
              <span className="font-semibold text-ink-soft">Reschedule</span>{' '}
              opens the AI Assistant with a ready-made request.
            </p>
          </div>
        </div>
      )}

      {/* Booking modal */}
      <Modal
        open={bookingOpen}
        onClose={closeBooking}
        title="Book an appointment"
        description="Choose a doctor, a date and a time. The backend confirms availability before booking."
        size="lg"
      >
        {doctors.length === 0 ? (
          <p className="text-sm text-ink-muted">Loading the doctor directory…</p>
        ) : (
          <AppointmentForm
            doctors={doctors}
            initialDoctorId={bookingDoctorId}
            onSubmit={handleBook}
            submitting={submitting}
          />
        )}
      </Modal>

      {/* Cancellation confirmation */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this appointment?"
        description={
          cancelTarget
            ? `${formatDateLong(cancelTarget.appointment_date)} at ${formatTime(
                cancelTarget.appointment_time,
              )}${cancelTarget.reason ? ` — ${cancelTarget.reason}` : ''}`
            : ''
        }
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep appointment
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Yes, cancel it
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 px-3.5 py-3 dark:bg-amber-950/30">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <p className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200">
            Cancelling frees the slot for another patient and cannot be undone
            from this screen.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function sortByDate(a, b) {
  const left = `${a.appointment_date}T${String(
    a.appointment_time || '',
  ).slice(0, 5)}`;
  const right = `${b.appointment_date}T${String(
    b.appointment_time || '',
  ).slice(0, 5)}`;

  if (left === right) return 0;
  return left < right ? -1 : 1;
}
