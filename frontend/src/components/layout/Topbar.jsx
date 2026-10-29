import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';
import { NAV_ITEMS } from './Sidebar';

/**
 * Sticky application header: mobile menu toggle, current page context and
 * the patient account menu.
 */
export default function Topbar({ onOpenMenu }) {
  const { profile, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName = profile?.full_name || user?.email || 'Patient';

  const current =
    NAV_ITEMS.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to),
    ) || NAV_ITEMS[0];

  useEffect(() => {
    function onClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-panel/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="-ml-1 rounded-lg p-2 text-ink-soft transition hover:bg-lavender-50 hover:text-lavender-700 lg:hidden dark:hover:bg-lavender-900/30"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-lavender-600 sm:block dark:text-lavender-300">
              Patient portal
            </p>
            <p className="truncate text-sm font-bold text-ink sm:text-[15px]">
              {current.label}
            </p>
          </div>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5 rounded-full border border-hairline bg-panel py-1 pl-1 pr-2.5 transition hover:border-lavender-300 hover:bg-lavender-50/60 dark:hover:bg-lavender-900/25"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lavender-600 text-[12px] font-bold text-white">
              {initials(displayName)}
            </span>
            <span className="hidden max-w-[9rem] truncate text-[13px] font-semibold text-ink sm:block">
              {displayName}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-ink-faint transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 animate-scale-in overflow-hidden rounded-xl border border-hairline bg-panel shadow-pop"
            >
              <div className="border-b border-hairline px-4 py-3">
                <p className="truncate text-sm font-semibold text-ink">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {user?.email || 'Signed in'}
                </p>
              </div>

              <div className="p-1.5">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition hover:bg-lavender-50 hover:text-ink dark:hover:bg-lavender-900/30"
                >
                  <UserRound className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  My Profile
                </Link>

                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition hover:bg-lavender-50 hover:text-ink dark:hover:bg-lavender-900/30"
                >
                  <Settings className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                  Settings
                </Link>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
