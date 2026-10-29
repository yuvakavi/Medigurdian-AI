from typing import Any, TypedDict


class MedicalAgentState(TypedDict, total=False):
    # User's original request
    question: str

    # Authenticated Supabase user
    user_id: str

    # Supabase access token
    access_token: str

    # RAG context
    context: str

    # Agent response
    response: str

    # MCP tool information
    tool_name: str
    tool_arguments: dict[str, Any]
    tool_result: dict[str, Any]

    # Conversation / workflow control
    next_action: str