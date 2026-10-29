import apiClient from './httpClient';
import { API_ROOT_URL } from './apiClient';

/**
 * Reads the generated OpenAPI document to discover which backend routes are
 * actually mounted.
 *
 * The repository contains report, symptom and admin route modules that are
 * not registered in `app/api/router.py`. Rather than assuming those routes
 * exist, the frontend inspects the live schema and shows the honest state of
 * the API. If the backend later registers them, the UI enables itself
 * automatically.
 */

let cache = null;

export async function fetchApiCapabilities({ force = false } = {}) {
  if (cache && !force) return cache;

  const { data } = await apiClient.get('/openapi.json', { baseURL: API_ROOT_URL });

  const paths = data?.paths || {};
  const methods = new Map();

  Object.entries(paths).forEach(([path, operations]) => {
    Object.keys(operations).forEach((method) => {
      methods.set(`${method.toUpperCase()} ${path}`, true);
    });
  });

  cache = {
    paths,
    methods,
    has(method, path) {
      return methods.has(`${method.toUpperCase()} ${path}`);
    },
    list() {
      return Array.from(methods.keys()).sort();
    },
  };

  return cache;
}

export function clearCapabilityCache() {
  cache = null;
}
