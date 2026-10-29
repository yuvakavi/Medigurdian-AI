import axios from 'axios';
import {
  API_BASE_URL,
  ApiError,
  clearSession,
  extractErrorMessage,
  getAccessToken,
} from './apiClient';

/**
 * Shared Axios instance.
 *
 * - Base URL comes from VITE_API_BASE_URL.
 * - The Supabase access token returned by the backend is attached as a
 *   Bearer token on every request.
 * - A 401 response clears the local session and notifies the app so the
 *   user is returned to the login screen instead of hitting repeated
 *   unauthorized calls.
 */

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

/* =========================================================
   UNAUTHORISED EVENT
   ========================================================= */

const UNAUTHORIZED_EVENT = 'medigurdian:unauthorized';

export function onUnauthorized(listener) {
  window.addEventListener(UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, listener);
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    const message = extractErrorMessage(
      error?.response?.data,
      error?.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : 'Unable to reach the Medigurdian AI server. Please check that the backend is running.',
    );

    return Promise.reject(
      new ApiError(message, status, error?.response?.data),
    );
  },
);

export default apiClient;
