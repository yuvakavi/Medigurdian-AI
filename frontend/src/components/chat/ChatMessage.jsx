import { Bot, User } from 'lucide-react';

/**
 * A single chat bubble. Assistant messages are rendered as plain text with
 * preserved line breaks so clinical guidance stays readable.
 */
export default function ChatMessage({ role, content, toolName, pending }) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          isUser
            ? 'bg-navy-900 text-white'
            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>

      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? 'rounded-tr-sm bg-navy-900 text-white'
            : 'rounded-tl-sm border border-hairline bg-panel text-ink'
        }`}
      >
        {pending ? (
          <span
            className="flex items-center gap-1.5 py-1"
            aria-label="Assistant is typing"
          >
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
          </span>
        ) : (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        )}

        {!isUser && !pending && toolName && (
          <p className="mt-2 border-t border-hairline pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Source: {toolName.replace(/_/g, ' ')}
          </p>
        )}
      </div>
    </div>
  );
}
