import { parseAvailabilityWindow } from './normalize';

/**
 * Generates 30-minute consultation slots for a given date from a doctor's
 * published working hours.
 *
 * The backend remains the authority on availability — this only helps the
 * patient pick a sensible time. Slots are always re-validated server side.
 */
export function generateTimeSlots(availabilityWindow, intervalMinutes = 30) {
  if (!availabilityWindow) return [];

  const { start, end } = availabilityWindow;
  if (!start || !end) return [];

  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    endMinutes <= startMinutes
  ) {
    return [];
  }

  const slots = [];

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += intervalMinutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;

    slots.push(`${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`);
  }

  return slots;
}

/** True when the given weekday name appears in the doctor's working days. */
export function isDoctorWorkingOn(doctor, dateValue) {
  if (!doctor?.availableDays?.length || !dateValue) return true;

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return true;

  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  return doctor.availableDays.some(
    (day) => String(day).trim().toLowerCase() === weekday.toLowerCase(),
  );
}

/** Returns the ISO date string for a Date, in local time. */
export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** Returns today's date as an ISO date string. */
export function todayInputValue() {
  return toDateInputValue(new Date());
}

function toMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!match) return NaN;

  return Number(match[1]) * 60 + Number(match[2]);
}

export { parseAvailabilityWindow };
