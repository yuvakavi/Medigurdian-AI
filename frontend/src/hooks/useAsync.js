import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic async data hook with loading / error / data states and a
 * `reload` function used by every "Try again" button in the app.
 *
 * @param {Function} loader  async function returning the data
 * @param {Array}    deps    re-runs the loader whenever these change
 */
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const loaderRef = useRef(loader);

  loaderRef.current = loader;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loaderRef.current();
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: run, setData };
}

/**
 * Debounces a rapidly changing value (search inputs).
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default useAsync;
