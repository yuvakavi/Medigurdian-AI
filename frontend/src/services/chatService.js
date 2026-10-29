import apiClient from './httpClient';

/**
 * Chat service — Medigurdian AI assistant.
 *
 * Backend routes (app/api/chat.py):
 *   POST   /api/chat-sessions/ask?question=... -> {
 *     success, question, response, next_action, tool_name, tool_result
 *   }
 *   GET    /api/chat-sessions/me  -> ChatSessionResponse[]
 *   POST   /api/chat-sessions      -> ChatSessionCreate -> ChatSessionResponse
 *   DELETE /api/chat-sessions/{id} -> { message, session_id }
 *
 * `question` is a query parameter (verified against the generated
 * OpenAPI schema), not a JSON body field.
 */

export async function askAssistant(question) {
  const { data } = await apiClient.post('/chat-sessions/ask', null, {
    params: { question },
    // Local Ollama can take longer than the shared 30-second API timeout.
    timeout: 180000,
  });
  return data;
}

export async function fetchChatSessions() {
  const { data } = await apiClient.get('/chat-sessions/me');
  return Array.isArray(data) ? data : [];
}

export async function createChatSession(title = 'New Chat') {
  const { data } = await apiClient.post('/chat-sessions', { title });
  return data;
}

export async function deleteChatSession(sessionId) {
  const { data } = await apiClient.delete(`/chat-sessions/${sessionId}`);
  return data;
}
