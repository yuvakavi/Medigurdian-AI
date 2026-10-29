import { useCallback, useEffect, useState } from 'react';
import { fetchApiCapabilities } from '../services/capabilitiesService';

/**
 * Loads the backend capability map.
 *
 * @param {Array<string>} endpoints list of "METHOD /path" strings to check
 */
export function useApiCapabilities(endpoints = []) {
  const [capabilities, setCapabilities] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const key = endpoints.join('|');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchApiCapabilities();
      setCapabilities(result);
    } catch (err) {
      setError(err?.message || 'Unable to inspect the backend API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, key]);

  const isAvailable = useCallback(
    (endpoint) => {
      if (!capabilities) return false;
      return capabilities.has(...endpoint.split(' '));
    },
    [capabilities],
  );

  return { capabilities, error, loading, reload: load, isAvailable };
}

export default useApiCapabilities;
