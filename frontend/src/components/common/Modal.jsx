import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog used for confirmations and detail views.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
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

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-lavender-950/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden',
          'rounded-t-2xl border border-hairline bg-panel shadow-pop',
          'animate-slide-up sm:rounded-2xl',
          sizeClasses[size] || sizeClasses.md,
        ].join(' ')}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
            <div>
              {title && (
                <h2 className="text-base font-bold text-ink">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-faint transition hover:bg-panel-sunken hover:text-ink"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-panel-muted px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
