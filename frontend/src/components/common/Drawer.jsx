import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Slide-over panel used for the mobile navigation drawer.
 */
export default function Drawer({ open, onClose, title, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }

    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-navy-950/50 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-panel shadow-pop transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-4">
          <span className="font-display text-sm font-bold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-panel-sunken hover:text-ink"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-slim flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
