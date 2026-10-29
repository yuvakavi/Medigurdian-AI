import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bot, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import MedicalDisclaimer from '../components/common/MedicalDisclaimer';
import Button from '../components/common/Button';
import ChatMessage from '../components/chat/ChatMessage';
import ChatComposer from '../components/chat/ChatComposer';
import SuggestionChips from '../components/chat/SuggestionChips';
import { askAssistant } from '../services/chatService';

const SUGGESTIONS = [
  'What is hemoglobin?',
  'Show my upcoming appointments',
  'What is a complete blood count?',
  'Show my billing',
  'What should I do about a mild fever?',
];

const INITIAL_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm Medigurdian AI. I can help you understand your appointments, billing, doctors and general health information. What would you like to know?",
};

export default function Assistant() {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState('');
  const prefillHandled = useRef(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  /**
   * A question can be handed over through the `?q=` query parameter, for
   * example from the appointment reschedule action.
   */
  useEffect(() => {
    const question = searchParams.get('q');

    if (!question || prefillHandled.current) return;

    prefillHandled.current = true;
    searchParams.delete('q');
    setSearchParams(searchParams, { replace: true });

    send(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(question) {
    const trimmed = String(question || '').trim();
    if (!trimmed || loading) return;

    setError('');
    setFailedQuestion('');
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: trimmed },
    ]);
    setLoading(true);

    try {
      const result = await askAssistant(trimmed);

      const answer =
        result?.response ||
        (result?.success === false ? result?.message : null) ||
        'I could not generate an answer for that question. Please try rephrasing it.';

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          toolName: result?.tool_name,
        },
      ]);
    } catch (err) {
      const message =
        err?.message || 'Unable to reach the assistant. Please try again.';
      setError(message);
      setFailedQuestion(trimmed);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([INITIAL_MESSAGE]);
    setError('');
    setFailedQuestion('');
  }

  function handleRetry() {
    if (failedQuestion) send(failedQuestion);
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your healthcare. The assistant uses your own records where relevant and is powered by retrieval-augmented generation."
        icon={<Bot className="h-5 w-5" />}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            iconLeft={<Trash2 className="h-3.5 w-3.5" />}
          >
            Clear conversation
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <Card
          padded={false}
          className="flex min-h-[560px] flex-col overflow-hidden"
        >
          <div
            ref={scrollRef}
            className="scrollbar-slim flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5"
            role="log"
            aria-live="polite"
            aria-label="Conversation with Medigurdian AI"
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                toolName={message.toolName}
              />
            ))}

            {loading && <ChatMessage role="assistant" content="" pending />}

            {error && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30"
              >
                <p className="text-[13px] font-medium text-rose-700 dark:text-rose-300">
                  {error}
                </p>
                {failedQuestion && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>

          {messages.length <= 1 && !error && (
            <SuggestionChips
              suggestions={SUGGESTIONS}
              onSelect={send}
              disabled={loading}
            />
          )}

          <ChatComposer onSend={send} loading={loading} />
        </Card>

        <aside className="space-y-4">
          <Card>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 className="text-sm font-bold text-ink">How this works</h2>
            </div>

            <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-muted">
              <li>
                <span className="font-semibold text-ink-soft">Personalised.</span>{' '}
                The assistant can read your appointments, prescriptions and
                invoices through the secured backend tools.
              </li>
              <li>
                <span className="font-semibold text-ink-soft">Grounded.</span>{' '}
                Medical answers are retrieved from curated clinical guidelines
                rather than generated from memory.
              </li>
              <li>
                <span className="font-semibold text-ink-soft">Safe.</span> It
                never books, cancels or changes anything without your explicit
                instruction.
              </li>
            </ul>
          </Card>

          <MedicalDisclaimer
            title="Not a diagnosis"
            message="Medigurdian AI offers general health information and guidance only. It cannot confirm a diagnosis or prescribe treatment. Please speak to a qualified doctor about anything that concerns you."
          />

          <Card>
            <h2 className="text-sm font-bold text-ink">Need urgent help?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              For chest pain, breathing difficulty, heavy bleeding, stroke
              signs or any life-threatening symptom, contact your local
              emergency services immediately.
            </p>
            <Button
              variant="danger-outline"
              size="sm"
              fullWidth
              className="mt-3"
              onClick={() => navigate('/emergency')}
            >
              Emergency guidance
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
