import apiClient from './httpClient';

/**
 * Prescription service.
 *
 * Backend routes (app/api/prescriptions.py):
 *   GET    /api/prescriptions/me    -> PrescriptionResponse[]
 *   POST   /api/prescriptions        -> PrescriptionCreate -> PrescriptionResponse
 *   DELETE /api/prescriptions/{id}   -> { message, prescription_id }
 *
 * Prescriptions are issued by clinicians. The UI lists the signed-in
 * patient's prescriptions.
 */

export async function fetchMyPrescriptions() {
  const { data } = await apiClient.get('/prescriptions/me');
  return Array.isArray(data) ? data : [];
}

export async function cancelPrescription(prescriptionId) {
  const { data } = await apiClient.delete(`/prescriptions/${prescriptionId}`);
  return data;
}
