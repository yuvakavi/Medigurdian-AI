import apiClient from './httpClient';

/**
 * Patient service.
 *
 * Backend routes (app/api/patients.py):
 *   GET  /api/patients/me      -> PatientResponse
 *   POST /api/patients/profile -> PatientProfileCreate -> PatientResponse
 *
 * There is currently NO patient update route, so the profile screen is
 * read-only in this build.
 */

export async function fetchPatientProfile() {
  const { data } = await apiClient.get('/patients/me');
  return data;
}

/**
 * Creates the patient record for a freshly authenticated user.
 * The backend rejects this with 409 when a profile already exists.
 */
export async function createPatientProfile(payload) {
  const { data } = await apiClient.post('/patients/profile', payload);
  return data;
}

export function hasPatientProfile(profile) {
  return Boolean(profile && profile.id);
}
