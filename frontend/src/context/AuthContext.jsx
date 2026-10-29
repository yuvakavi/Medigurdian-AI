import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
  fetchCurrentUser,
} from '../services/authService';
import { fetchPatientProfile } from '../services/patientService';
import { getAccessToken, clearSession } from '../services/apiClient';
import { onUnauthorized } from '../services/httpClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [profileError, setProfileError] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  /* -------------------------------------------------------------
     Restore an existing session on first load.
     The stored access token is verified against `GET /api/auth/me`.
     ------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) setStatus('anonymous');
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();

        if (!cancelled) {
          setUser({
            user_id: currentUser.user_id,
            email: currentUser.email,
          });
          setStatus('authenticated');
        }
      } catch {
        clearSession();
        if (!cancelled) setStatus('anonymous');
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------------
     A 401 from any request means the session is no longer valid.
     ------------------------------------------------------------- */
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileMissing(false);
        setStatus('anonymous');
      }),
    [],
  );

  /* -------------------------------------------------------------
     Load the patient profile for the authenticated session.
     ------------------------------------------------------------- */
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);

    try {
      const data = await fetchPatientProfile();
      setProfile(data);
      setProfileError(null);
      setProfileMissing(false);
      return data;
    } catch (err) {
      setProfile(null);
      setProfileMissing(err?.status === 404);
      setProfileError(err?.message || 'Unable to load your patient profile.');
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setProfileLoading(false);
      return undefined;
    }

    let cancelled = false;
    setProfileLoading(true);

    fetchPatientProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setProfileError(null);
          setProfileMissing(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null);
          setProfileMissing(err?.status === 404);
          setProfileError(
            err?.message || 'Unable to load your patient profile.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);
    setUser({ user_id: data.user_id, email: data.email });
    setProfile(null);
    setProfileError(null);
    setProfileMissing(false);
    setStatus('authenticated');
    return data;
  }, []);

  const signup = useCallback(async (credentials) => {
    const data = await signupRequest(credentials);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setProfile(null);
    setProfileError(null);
    setProfileMissing(false);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      profileError,
      profileMissing,
      profileLoading,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      signup,
      logout,
      refreshProfile: loadProfile,
    }),
    [
      user,
      profile,
      profileError,
      profileMissing,
      profileLoading,
      status,
      login,
      signup,
      logout,
      loadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
