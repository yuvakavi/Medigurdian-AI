import apiClient from './httpClient';
import { setTokens, clearSession } from './apiClient';

/**
 * Authentication service.
 *
 * The backend delegates identity management to Supabase Auth through
 * FastAPI routes (app/api/auth.py). The frontend therefore talks to
 * FastAPI — never directly to Supabase — and stores the returned
 * bearer token for subsequent authenticated requests.
 */

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });

  setTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  });

  return data;
}

export async function signup({ email, password }) {
  const { data } = await apiClient.post('/auth/signup', { email, password });

  // Supabase only returns a session when email confirmation is disabled.
  // When it is enabled the user must confirm before signing in.
  if (data.access_token) {
    setTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    });
  }

  return data;
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    /* The local session is cleared regardless of the server response. */
  } finally {
    clearSession();
  }
}
