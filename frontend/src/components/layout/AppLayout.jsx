import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Drawer from '../common/Drawer';

/**
 * Authenticated application shell: fixed sidebar on desktop, slide-over
 * drawer navigation on mobile.
 */
export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">
        <Sidebar />
      </aside>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Navigation"
      >
        <Sidebar onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <div className="lg:pl-[260px]">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
