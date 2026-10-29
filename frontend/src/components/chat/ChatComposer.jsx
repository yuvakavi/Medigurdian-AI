import { useState } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

/**
 * Chat composer. Enter sends the message, Shift+Enter inserts a newline.
 */
export default function ChatComposer({ onSend, disabled, loading }) {
  const [value, setValue] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    submit();
  }

  function submit() {
    const question = value.trim();
    if (!question || disabled || loading) return;

    onSend(question);
    setValue('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-hairline bg-panel p-3 sm:p-4"
    >
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
        placeholder="Ask about your appointments, medicines, reports or symptoms…"
        aria-label="Message Medigurdian AI"
        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-hairline bg-panel px-3.5 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-navy-500 focus:outline-none disabled:bg-panel-sunken"
      />

      <button
        type="submit"
        disabled={!value.trim() || loading || disabled}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition-all duration-150 hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-900/30"
        aria-label="Send message"
      >
        {loading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </button>
    </form>
  );
}
