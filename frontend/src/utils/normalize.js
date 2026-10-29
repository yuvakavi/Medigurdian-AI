/**
 * Normalisation helpers.
 *
 * The doctors endpoint returns raw Supabase rows (`select("*")`), so the
 * exact column set depends on the database schema. These helpers map a
 * range of plausible column names onto a stable UI shape and simply omit
 * values that the backend did not return — no field is ever invented.
 */

function pick(row, keys) {
  if (!row) return undefined;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function toBoolean(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return Boolean(value);
}

/** "Monday, Wednesday" | ["Monday"] -> ["Monday", "Wednesday"] */
function toArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        /* fall through to comma separated parsing */
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Parses an availability window such as "09:00-13:00" or
 * "09:00 AM - 1:00 PM" into a { start, end } pair of "HH:MM" strings.
 */
export function parseAvailabilityWindow(value) {
  if (!value) return null;

  if (typeof value === 'object') {
    const start = value.start ?? value.from ?? value.available_from;
    const end = value.end ?? value.to ?? value.available_to;
    if (start && end) {
      return { start: normaliseTime(start), end: normaliseTime(end) };
    }
    return null;
  }

  const text = String(value).replace(/[–—]/g, '-').trim();
  if (!text.includes('-')) return null;

  const parts = text.split('-').map((part) => part.trim());
  const start = normaliseTime(parts[0]);
  const end = normaliseTime(parts[1]);

  if (!start || !end) return null;
  return { start, end };
}

function normaliseTime(value) {
  if (!value) return null;

  const text = String(value).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2];

  const isPm = /pm/i.test(text);
  const isAm = /am/i.test(text);

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Maps a raw doctor row onto the fields the UI renders.
 * Every property is optional — only what the backend returned is set.
 */
export function normalizeDoctor(row) {
  if (!row) return null;

  const availableDays = toArray(
    pick(row, ['available_days', 'availableDays', 'working_days', 'days']),
  );

  const rawWindow = pick(row, ['available_time', 'availableTime', 'working_hours']);

  const fee = toNumber(
    pick(row, ['consultation_fee', 'consultationFee', 'fee', 'price']),
  );

  const experience = toNumber(
    pick(row, ['experience_years', 'experienceYears', 'years_of_experience']),
  );

  const rating = toNumber(pick(row, ['rating', 'average_rating', 'rating_value']));

  return {
    id: row.id,
    fullName: pick(row, ['full_name', 'fullName', 'name', 'doctor_name']),
    specialization: pick(row, ['specialization', 'speciality', 'specialty']),
    department: pick(row, ['department', 'department_name', 'unit']),
    qualification: pick(row, ['qualification', 'qualifications', 'degrees']),
    experienceYears: experience,
    consultationFee: fee,
    rating,
    bio: pick(row, ['bio', 'description', 'about', 'summary']),
    isAvailable: toBoolean(pick(row, ['is_available', 'isAvailable', 'available'])),
    availableDays,
    availableTime: rawWindow ? String(rawWindow) : undefined,
    availabilityWindow: parseAvailabilityWindow(rawWindow),
    email: pick(row, ['email']),
    phone: pick(row, ['phone', 'contact', 'contact_number']),
    hospital: pick(row, ['hospital', 'hospital_name', 'clinic', 'facility']),
    createdAt: pick(row, ['created_at', 'createdAt']),
  };
}

/** Builds the list of specialisations actually present in the payload. */
export function extractSpecializations(doctors) {
  const values = new Set();

  doctors.forEach((doctor) => {
    const value = doctor.specialization || doctor.department;
    if (value) values.add(value);
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
