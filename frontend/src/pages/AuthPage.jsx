import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Logo from '../components/layout/Logo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePassword } from '../utils/validators';

/**
 * Shared sign-in / sign-up screen.
 *
 * The authentication behaviour is unchanged: Supabase sessions are created
 * through the FastAPI auth routes and stored by the existing auth service.
 */
export default function AuthPage({ mode = 'login' }) {
  const isLogin = mode === 'login';

  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setForm({ email: '', password: '', confirmPassword: '' });
    setErrors({});
    setFormError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  }

  function validate() {
    const nextErrors = {};

    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);

    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;

    if (!isLogin) {
      if (!form.confirmPassword) {
        nextErrors.confirmPassword = 'Please confirm your password.';
      } else if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setSubmitting(true);

    try {
      if (isLogin) {
        await login({ email: form.email.trim(), password: form.password });
        toast.success('Welcome back to Medigurdian AI.');
        navigate('/', { replace: true });
      } else {
        const result = await signup({
          email: form.email.trim(),
          password: form.password,
        });

        if (result.access_token) {
          await login({ email: form.email.trim(), password: form.password });
          toast.success('Account created. Welcome to Medigurdian AI.');
          navigate('/', { replace: true });
        } else {
          toast.info(
            'Account created. Please confirm your email, then sign in.',
          );
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      setFormError(
        error?.message || 'Unable to complete the request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lavender-50 px-4 py-10 sm:px-6 dark:bg-canvas">
      <main className="w-full max-w-[420px]">
        <div className="rounded-2xl border border-lavender-200 bg-panel p-6 shadow-card sm:p-8 dark:border-lavender-900">
          <div className="flex flex-col items-center text-center">
            <Logo />
            <p className="mt-3 text-[11.5px] font-semibold tracking-[0.08em] text-lavender-600 dark:text-lavender-300">
              Healthcare, made simpler.
            </p>
          </div>

          <div className="mt-7">
            <h1 className="text-[26px] font-extrabold leading-tight text-ink">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {isLogin
                ? 'Sign in to continue to your health dashboard.'
                : 'Create an account to manage your care in one place.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={updateField}
              error={errors.email}
              required
              iconRight={<Mail className="h-4 w-4" />}
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'}
              value={form.password}
              onChange={updateField}
              error={errors.password}
              hint={
                isLogin
                  ? undefined
                  : 'Use at least 8 characters with a letter and a number.'
              }
              required
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="rounded-md p-1 transition hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            {!isLogin && (
              <Input
                label="Confirm password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={updateField}
                error={errors.confirmPassword}
                required
                iconRight={
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                    className="rounded-md p-1 transition hover:text-ink"
                    aria-label={
                      showConfirmPassword
                        ? 'Hide password confirmation'
                        : 'Show password confirmation'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />
            )}

            {formError && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={submitting}>
              {submitting
                ? isLogin
                  ? 'Signing in…'
                  : 'Creating account…'
                : isLogin
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-ink-muted">
            {isLogin
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <Link
              to={isLogin ? '/register' : '/login'}
              className="font-semibold text-lavender-700 underline-offset-4 transition hover:text-lavender-900 hover:underline dark:text-lavender-300 dark:hover:text-lavender-200"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </Link>
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-[380px] text-center text-[11.5px] leading-relaxed text-ink-faint">
          Medigurdian AI provides health information and support. It does not
          replace professional medical advice, diagnosis, or emergency care.
        </p>
      </main>
    </div>
  );
}
