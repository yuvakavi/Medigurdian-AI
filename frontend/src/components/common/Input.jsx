/**
 * Text input with label, hint and validation message.
 */
export default function Input({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  autoComplete,
  className = '',
  inputClassName = '',
  iconRight,
  ...rest
}) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

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

      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={[
            'w-full rounded-lg border bg-panel px-3.5 py-2.5 text-sm text-ink',
            'placeholder:text-ink-faint',
            'transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:bg-panel-sunken disabled:text-ink-faint',
            error
              ? 'border-rose-300 focus:border-rose-500 dark:border-rose-800'
              : 'border-hairline focus:border-navy-500',
            iconRight ? 'pr-11' : '',
            inputClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />

        {iconRight && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-faint">
            {iconRight}
          </div>
        )}
      </div>

      {error ? (
        <p
          id={`${name}-error`}
          className="mt-1.5 text-xs font-medium text-rose-600"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="mt-1.5 text-xs text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
