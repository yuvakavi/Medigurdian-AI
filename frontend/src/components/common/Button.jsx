const BASE_VARIANTS = {
  primary:
    'bg-lavender-600 text-white hover:bg-lavender-700 active:bg-lavender-800 disabled:bg-lavender-600/40',
  secondary:
    'bg-lavender-100 text-lavender-800 hover:bg-lavender-200 active:bg-lavender-300 disabled:bg-lavender-100/60 dark:bg-lavender-950/60 dark:text-lavender-200 dark:hover:bg-lavender-900/60',
  accent:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-600/40',
  outline:
    'border border-hairline bg-panel text-ink hover:border-lavender-300 hover:bg-panel-muted disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-panel-sunken disabled:opacity-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-600/40',
  'danger-outline':
    'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40',
};

const SIZE_VARIANTS = {
  xs: 'h-8 gap-1.5 px-2.5 text-xs',
  sm: 'h-9 gap-1.5 px-3 text-[13px]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2.5 px-6 text-[15px]',
};

/**
 * Button component with consistent sizing, hover and disabled states.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  iconLeft,
  iconRight,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex select-none items-center justify-center rounded-lg font-semibold',
        'transition-all duration-150 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender-500',
        'disabled:cursor-not-allowed',
        BASE_VARIANTS[variant] || BASE_VARIANTS.primary,
        SIZE_VARIANTS[size] || SIZE_VARIANTS.md,
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
