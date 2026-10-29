import apiClient from './httpClient';

/**
 * Medicine service.
 *
 * Backend routes (app/api/medicines.py):
 *   GET /api/medicines        -> MedicineResponse[]
 *   GET /api/medicines/{id}   -> MedicineResponse
 *
 * MedicineResponse fields: id, medicine_name, generic_name, brand_name,
 * medicine_type, dosage, strength, route, frequency, duration, uses,
 * side_effects, warnings, contraindications, instructions, is_active.
 */

export async function fetchMedicines() {
  const { data } = await apiClient.get('/medicines');
  return Array.isArray(data) ? data : [];
}

export async function fetchMedicine(medicineId) {
  const { data } = await apiClient.get(`/medicines/${medicineId}`);
  return data;
}
