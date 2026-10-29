import apiClient from './httpClient';

/**
 * Emergency assistance service.
 *
 * Backend routes (app/api/emergency.py):
 *   GET    /api/emergency/me              -> EmergencyRecordResponse[]
 *   POST   /api/emergency                 -> EmergencyRecordCreate
 *   PUT    /api/emergency/{id}/status?status= -> { message, emergency_id, status }
 *   DELETE /api/emergency/{id}            -> { message, emergency_id }
 */

export const EMERGENCY_STATUSES = ['open', 'in_progress', 'resolved', 'cancelled'];

export async function fetchEmergencyRecords() {
  const { data } = await apiClient.get('/emergency/me');
  return Array.isArray(data) ? data : [];
}

export async function createEmergencyRecord(payload) {
  const { data } = await apiClient.post('/emergency', payload);
  return data;
}

export async function updateEmergencyStatus(emergencyId, status) {
  const { data } = await apiClient.put(`/emergency/${emergencyId}/status`, null, {
    params: { status },
  });
  return data;
}

export async function deleteEmergencyRecord(emergencyId) {
  const { data } = await apiClient.delete(`/emergency/${emergencyId}`);
  return data;
}
