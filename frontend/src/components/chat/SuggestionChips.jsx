/**
 * Suggested question chips shown under the conversation.
 */
export default function SuggestionChips({
  suggestions = [],
  onSelect,
  disabled,
}) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-1 pt-1 sm:px-4">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-hairline bg-panel px-3 py-1.5 text-[12.5px] font-medium text-ink-soft transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-teal-950/50 dark:hover:text-teal-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
