import { ChevronDown } from 'lucide-react';

/**
 * Native select styled to match the design system.
 */
export default function Select({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  hint,
  error,
  required = false,
  disabled = false,
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

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          className={[
            'w-full appearance-none rounded-lg border bg-panel px-3.5 py-2.5 pr-10 text-sm text-ink',
            'transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:bg-panel-sunken disabled:text-ink-faint',
            error
              ? 'border-rose-300 focus:border-rose-500 dark:border-rose-800'
              : 'border-hairline focus:border-navy-500',
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  );
}
