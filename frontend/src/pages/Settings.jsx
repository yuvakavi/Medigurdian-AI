import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await logout();
      toast.success('You have been signed out.');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your preferences and account."
        icon={<SlidersHorizontal className="h-5 w-5" />}
        breadcrumb={[{ label: 'Dashboard', to: '/' }, { label: 'Settings' }]}
      />

      <div className="mx-auto max-w-3xl space-y-5">
        {/* Appearance */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <Palette
              className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
              aria-hidden="true"
            />
            Appearance
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Choose how Medigurdian AI looks on this device. Your preference is
            saved for next time.
          </p>

          <div
            className="mt-5 grid gap-3 sm:grid-cols-2"
            role="group"
            aria-label="Theme"
          >
            <ThemeOption
              active={theme === 'light'}
              icon={Sun}
              title="Light mode"
              description="Bright surfaces for daytime use"
              onClick={() => setTheme('light')}
            />
            <ThemeOption
              active={theme === 'dark'}
              icon={Moon}
              title="Dark mode"
              description="Dimmed surfaces for low light"
              onClick={() => setTheme('dark')}
            />
          </div>
        </Card>

        {/* Account */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <UserRound
              className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
              aria-hidden="true"
            />
            Account
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            The email address linked to your patient account.
          </p>

          <div
            className="mt-5 flex flex-col gap-3 rounded-xl border border-hairline bg-panel-muted px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            aria-live="polite"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel text-ink-muted ring-1 ring-inset ring-hairline">
                <Mail className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-muted">
                  Email address
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {user?.email || 'Account email unavailable'}
                </p>
              </div>
            </div>
            <Badge tone="violet" className="w-fit shrink-0">
              Patient account
            </Badge>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <LockKeyhole
              className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
              aria-hidden="true"
            />
            Security
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Password and sign-in security for your account.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-hairline bg-panel-muted px-4 py-3.5">
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-lavender-600 dark:text-lavender-300"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                Password changes aren&apos;t available here yet
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Contact your care team or hospital administrator if you need to
                update your sign-in details. Medigurdian AI never displays or
                stores your password.
              </p>
            </div>
          </div>
        </Card>

        {/* Session */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <LogOut
              className="h-4 w-4 text-lavender-600 dark:text-lavender-300"
              aria-hidden="true"
            />
            Session
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Signing out ends this session on this device and returns you to the
            sign-in page.
          </p>

          <Button
            type="button"
            variant="danger-outline"
            size="md"
            loading={signingOut}
            onClick={handleSignOut}
            iconLeft={
              signingOut ? undefined : (
                <LogOut className="h-4 w-4" aria-hidden="true" />
              )
            }
            className="mt-5 w-full sm:w-auto"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function ThemeOption({ active, icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex items-start justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender-500',
        active
          ? 'border-lavender-400 bg-lavender-50 dark:border-lavender-600 dark:bg-lavender-950/50'
          : 'border-hairline bg-panel hover:border-lavender-300 hover:bg-panel-muted',
      ].join(' ')}
    >
      <span className="flex items-start gap-3">
        <span
          className={[
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            active
              ? 'bg-lavender-600 text-white'
              : 'bg-panel-sunken text-ink-muted',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
            {description}
          </span>
        </span>
      </span>

      {active && (
        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lavender-600 text-white">
          <Check className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">Selected</span>
        </span>
      )}
    </button>
  );
}
