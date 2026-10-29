import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/common/Spinner';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Doctors from './pages/Doctors';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Medicines from './pages/Medicines';
import Prescriptions from './pages/Prescriptions';
import Billing from './pages/Billing';
import Emergency from './pages/Emergency';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

/**
 * Blocks a route until the session state is known and redirects
 * unauthenticated visitors to the login screen.
 */
function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Spinner label="Restoring your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/** Keeps signed-in users away from the auth screens. */
function RedirectIfAuthenticated({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Spinner label="Restoring your session…" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <AuthPage mode="login" />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <AuthPage mode="signup" />
          </RedirectIfAuthenticated>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/medicines" element={<Medicines />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
