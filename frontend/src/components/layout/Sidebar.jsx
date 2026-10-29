import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Pill,
  Settings,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

/**
 * Patient-facing navigation. Administrative features are intentionally
 * excluded — this portal is scoped to the logged-in patient.
 */
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/assistant', label: 'AI Health Assistant', icon: MessageCircle },
    ],
  },
  {
    label: 'Your care',
    items: [
      { to: '/doctors', label: 'Find Doctors', icon: Stethoscope },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays },
      { to: '/reports', label: 'Medical Reports', icon: FileText },
      { to: '/medicines', label: 'Medicines', icon: Pill },
      { to: '/prescriptions', label: 'Prescriptions', icon: ClipboardList },
      { to: '/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Support',
    items: [
      { to: '/emergency', label: 'Emergency Help', icon: AlertTriangle },
      { to: '/profile', label: 'My Profile', icon: UserRound },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export default function Sidebar({ onNavigate }) {
  const { profile, user, logout } = useAuth();

  const displayName = profile?.full_name || user?.email || 'Patient';
  const secondary = profile?.id
    ? `Patient ID ${String(profile.id).slice(0, 8).toUpperCase()}`
    : 'Patient account';

  async function handleLogout() {
    await logout();
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col border-r border-hairline bg-panel">
      <div className="px-5 pb-5 pt-6">
        <Logo tone="dark" />
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Patient portal
        </p>
      </div>

      <nav
        className="scrollbar-slim flex-1 overflow-y-auto px-3 pb-4"
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              {group.label}
            </p>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        [
                          'group relative flex items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-[13px] transition-colors duration-150',
                          isActive
                            ? 'bg-lavender-100 font-semibold text-lavender-900 dark:bg-lavender-900/45 dark:text-white'
                            : 'font-medium text-ink-muted hover:bg-lavender-50 hover:text-ink dark:hover:bg-lavender-900/25',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={[
                              'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity',
                              isActive ? 'bg-lavender-500 opacity-100' : 'opacity-0',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                          <Icon
                            className={[
                              'h-[18px] w-[18px] shrink-0 transition-colors',
                              isActive
                                ? 'text-lavender-700 dark:text-lavender-200'
                                : 'text-ink-faint group-hover:text-lavender-600',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lavender-100 text-[12px] font-bold text-lavender-700 dark:bg-lavender-900/50 dark:text-lavender-200">
            {initials(displayName)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-ink-faint">{secondary}</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-ink-faint transition hover:bg-lavender-50 hover:text-lavender-700 dark:hover:bg-lavender-900/40 dark:hover:text-lavender-200"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
