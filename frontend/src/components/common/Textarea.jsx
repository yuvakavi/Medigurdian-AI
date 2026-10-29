export default function Textarea({
  label,
  name,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  maxLength,
  className = '',
  ...rest
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-[13px] font-semibold text-ink-soft"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}

      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : 'false'}
        className={[
          'w-full resize-y rounded-lg border bg-panel px-3.5 py-2.5 text-sm text-ink',
          'placeholder:text-ink-faint',
          'transition-colors duration-150',
          'disabled:cursor-not-allowed disabled:bg-panel-sunken',
          error
            ? 'border-rose-300 focus:border-rose-500 dark:border-rose-800'
            : 'border-hairline focus:border-navy-500',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
