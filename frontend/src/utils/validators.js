/**
 * Client-side validation helpers.
 *
 * These improve the user experience only — the backend remains the source
 * of truth and re-validates every request.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[+]?[\d\s()-]{6,20}$/;

export function validateEmail(value) {
  const email = String(value || '').trim();

  if (!email) return 'Email address is required.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';

  return null;
}

export function validatePassword(value) {
  const password = String(value || '');

  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter.';
  if (!/\d/.test(password)) return 'Password must contain a number.';

  return null;
}

export function validateRequired(value, label = 'This field') {
  if (!String(value || '').trim()) return `${label} is required.`;
  return null;
}

export function validateFullName(value) {
  const name = String(value || '').trim();

  if (!name) return 'Full name is required.';
  if (name.length < 2) return 'Full name must be at least 2 characters.';

  return null;
}

export function validatePhone(value) {
  if (!value) return null;
  if (!PHONE_PATTERN.test(String(value).trim())) {
    return 'Enter a valid phone number.';
  }
  return null;
}

export function validateDateOfBirth(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date of birth.';
  if (date > new Date()) return 'Date of birth cannot be in the future.';

  return null;
}

/** Returns the first error message found in the error map. */
export function firstError(errors) {
  if (!errors) return null;
  const key = Object.keys(errors).find((name) => errors[name]);
  return key ? errors[key] : null;
}
