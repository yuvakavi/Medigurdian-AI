import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDoctors } from '../services/doctorService';
import { normalizeDoctor } from '../utils/normalize';

/**
 * Loads the doctor directory once and exposes a lookup map so pages that
 * only have a `doctor_id` (for example appointments or prescriptions) can
 * still show the clinician's real name.
 */
export function useDoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchDoctors();
      setDoctors(rows.map(normalizeDoctor).filter(Boolean));
    } catch (err) {
      setError(err?.message || 'Unable to load doctors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => {
    const map = new Map();
    doctors.forEach((doctor) => {
      if (doctor.id) map.set(String(doctor.id), doctor);
    });
    return map;
  }, [doctors]);

  const getDoctor = useCallback(
    (doctorId) => (doctorId ? byId.get(String(doctorId)) || null : null),
    [byId],
  );

  return { doctors, byId, getDoctor, loading, error, reload: load };
}

export default useDoctorDirectory;
