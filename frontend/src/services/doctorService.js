import apiClient from './httpClient';

/**
 * Doctor service.
 *
 * Backend routes (app/api/doctors.py):
 *   GET /api/doctors        -> array of doctor rows
 *   GET /api/doctors/{id}   -> a single doctor row
 *
 * The endpoint returns the Supabase rows verbatim (`select("*")`), so the
 * field mapping is handled by `normalizeDoctor` in utils/normalize.js, which
 * tolerates missing columns instead of assuming a fixed shape.
 */

export async function fetchDoctors() {
  const { data } = await apiClient.get('/doctors');
  return Array.isArray(data) ? data : [];
}

export async function fetchDoctor(doctorId) {
  const { data } = await apiClient.get(`/doctors/${doctorId}`);
  return data;
}
