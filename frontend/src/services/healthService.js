import apiClient from './httpClient';
import { API_ROOT_URL } from './apiClient';

/**
 * Backend connectivity probe.
 *
 * `GET /health` is the only unauthenticated backend route that is safe to
 * call from the browser. It is used by the Settings page to show whether
 * the configured API base URL is reachable.
 */

export async function checkBackendHealth() {
  const { data } = await apiClient.get('/health', { baseURL: API_ROOT_URL });
  return data;
}
