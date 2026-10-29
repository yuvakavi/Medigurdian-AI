import apiClient from './httpClient';

/**
 * Appointment service.
 *
 * Backend routes (app/api/appointments.py):
 *   POST   /api/appointments          -> AppointmentCreate -> AppointmentResponse
 *   GET    /api/appointments/me       -> AppointmentResponse[]
 *   DELETE /api/appointments/{id}     -> { message, appointment_id }
 *
 * The backend currently exposes no reschedule route. Rescheduling is
 * available through the AI assistant (MCP `reschedule_appointment` tool),
 * which the appointment screen links to.
 */

export async function fetchMyAppointments() {
  const { data } = await apiClient.get('/appointments/me');
  return Array.isArray(data) ? data : [];
}

export async function createAppointment(payload) {
  const { data } = await apiClient.post('/appointments', payload);
  return data;
}

export async function cancelAppointment(appointmentId) {
  const { data } = await apiClient.delete(`/appointments/${appointmentId}`);
  return data;
}
