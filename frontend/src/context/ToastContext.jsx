import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: AlertTriangle,
    ring: 'border-rose-200 bg-rose-50 text-rose-800',
    iconColor: 'text-rose-600',
  },
  info: {
    icon: Info,
    ring: 'border-lavender-200 bg-lavender-50 text-lavender-800 dark:border-lavender-800 dark:bg-lavender-950/70 dark:text-lavender-200',
    iconColor: 'text-lavender-600 dark:text-lavender-300',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 4500) => {
      if (!message) return null;

      counterRef.current += 1;
      const id = counterRef.current;

      setToasts((current) => [...current, { id, message, type }]);

      if (duration) {
        setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
          const Icon = style.icon;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 shadow-pop ${style.ring}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 opacity-60 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider.');
  }

  return context;
}
