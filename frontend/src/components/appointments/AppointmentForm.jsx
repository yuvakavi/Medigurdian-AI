import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock, Info } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';
import {
  generateTimeSlots,
  isDoctorWorkingOn,
  todayInputValue,
} from '../../utils/slots';
import { formatTime } from '../../utils/format';

/**
 * Appointment booking form.
 *
 * The backend validates doctor availability, working days, working hours and
 * slot conflicts. This form mirrors those rules to give immediate feedback
 * but never treats a booking as confirmed until the API responds.
 */
export default function AppointmentForm({
  doctors = [],
  onSubmit,
  submitting,
  initialDoctorId,
}) {
  const [form, setForm] = useState({
    doctor_id: initialDoctorId || '',
    appointment_date: todayInputValue(),
    appointment_time: '',
    reason: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (initialDoctorId) {
      setForm((current) => ({ ...current, doctor_id: initialDoctorId }));
    }
  }, [initialDoctorId]);

  const selectedDoctor = useMemo(
    () =>
      doctors.find((doctor) => String(doctor.id) === String(form.doctor_id)) ||
      null,
    [doctors, form.doctor_id],
  );

  const slots = useMemo(
    () => generateTimeSlots(selectedDoctor?.availabilityWindow),
    [selectedDoctor],
  );

  const workingOnSelectedDay = isDoctorWorkingOn(
    selectedDoctor,
    form.appointment_date,
  );

  useEffect(() => {
    // Reset a slot that is no longer valid for the chosen doctor/day.
    if (slots.length && !slots.includes(form.appointment_time)) {
      setForm((current) => ({ ...current, appointment_time: '' }));
    }
  }, [slots, form.appointment_time]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  }

  function validate() {
    const nextErrors = {};

    if (!form.doctor_id) nextErrors.doctor_id = 'Select a doctor.';
    if (!form.appointment_date) {
      nextErrors.appointment_date = 'Choose an appointment date.';
    } else if (form.appointment_date < todayInputValue()) {
      nextErrors.appointment_date = 'Choose a date that is not in the past.';
    }

    if (!form.appointment_time) {
      nextErrors.appointment_time = 'Select a time slot.';
    }

    if (!form.reason.trim()) {
      nextErrors.reason = 'Tell the doctor the reason for your visit.';
    } else if (form.reason.trim().length < 5) {
      nextErrors.reason =
        'Please add a little more detail (at least 5 characters).';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    if (selectedDoctor && !workingOnSelectedDay) {
      setFormError(
        `Dr. ${
          selectedDoctor.fullName?.replace(/^dr\.?\s+/i, '') || 'this doctor'
        } is not available on the selected day. Please pick another date.`,
      );
      return;
    }

    try {
      await onSubmit({
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        appointment_time:
          form.appointment_time.length === 5
            ? `${form.appointment_time}:00`
            : form.appointment_time,
        reason: form.reason.trim(),
        notes: form.notes.trim() || null,
      });
    } catch (error) {
      setFormError(error?.message || 'Unable to book the appointment.');
    }
  }

  const doctorOptions = doctors
    .filter((doctor) => doctor.isAvailable !== false)
    .map((doctor) => ({
      value: doctor.id,
      label: `${doctor.fullName || 'Doctor'} — ${
        doctor.specialization || doctor.department || 'General'
      }`,
    }));

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Select
        label="Doctor"
        name="doctor_id"
        value={form.doctor_id}
        onChange={(event) => update('doctor_id', event.target.value)}
        options={doctorOptions}
        placeholder="Select a doctor"
        error={errors.doctor_id}
        required
      />

      {selectedDoctor && (
        <div className="rounded-xl border border-hairline bg-panel-muted px-4 py-3">
          <p className="flex items-start gap-2 text-[13px] text-ink-soft">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint"
              aria-hidden="true"
            />
            <span>
              {selectedDoctor.availableDays?.length > 0 && (
                <>
                  <span className="font-semibold text-ink">Working days: </span>
                  {selectedDoctor.availableDays.join(', ')}.{' '}
                </>
              )}
              {selectedDoctor.availableTime && (
                <>
                  <span className="font-semibold text-ink">Hours: </span>
                  {selectedDoctor.availableTime}.
                </>
              )}
              {!selectedDoctor.availableDays?.length &&
                !selectedDoctor.availableTime && (
                  'The doctor has not published a schedule. The backend will validate the slot.'
                )}
            </span>
          </p>
        </div>
      )}

      <Input
        label="Appointment date"
        name="appointment_date"
        type="date"
        min={todayInputValue()}
        value={form.appointment_date}
        onChange={(event) => update('appointment_date', event.target.value)}
        error={errors.appointment_date}
        required
        iconRight={<CalendarDays className="h-4 w-4" />}
      />

      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          Preferred time
          <span className="ml-0.5 text-rose-500">*</span>
        </span>

        {slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = form.appointment_time.startsWith(slot);

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => update('appointment_time', slot)}
                  className={[
                    'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[13px] font-medium transition',
                    selected
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : 'border-hairline bg-panel text-ink-soft hover:border-navy-300 hover:bg-panel-muted',
                  ].join(' ')}
                  aria-pressed={selected}
                >
                  {selected && (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        ) : (
          <Input
            name="appointment_time"
            type="time"
            value={form.appointment_time}
            onChange={(event) => update('appointment_time', event.target.value)}
            required
            iconRight={<Clock className="h-4 w-4" />}
          />
        )}

        {slots.length > 0 && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
            These times are generated from the doctor&apos;s published working
            hours. Your appointment is confirmed only after the server accepts
            the booking.
          </p>
        )}

        {errors.appointment_time && (
          <p className="mt-1.5 text-xs font-medium text-rose-600">
            {errors.appointment_time}
          </p>
        )}

        {!workingOnSelectedDay && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            The selected doctor does not appear to work on this day. The
            backend will reject the booking if the day is not valid.
          </p>
        )}
      </div>

      <Textarea
        label="Reason for visit"
        name="reason"
        rows={3}
        placeholder="Briefly describe your symptoms or what you would like to discuss."
        value={form.reason}
        onChange={(event) => update('reason', event.target.value)}
        error={errors.reason}
        required
        maxLength={400}
      />

      <Textarea
        label="Notes for the doctor (optional)"
        name="notes"
        rows={2}
        placeholder="Any additional information the doctor should know."
        value={form.notes}
        onChange={(event) => update('notes', event.target.value)}
      />

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {formError}
        </div>
      )}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? 'Booking…' : 'Confirm appointment'}
      </Button>
    </form>
  );
}
