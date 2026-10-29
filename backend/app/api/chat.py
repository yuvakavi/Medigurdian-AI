from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
)
from app.utils.auth import get_current_user
from app.graph.workflow import medical_graph


router = APIRouter(
    prefix="/chat-sessions",
    tags=["Chat Sessions"]
)


# =========================================================
# AUTHENTICATED SUPABASE CLIENT
# =========================================================

def get_authenticated_supabase(current_user):
    user_supabase = create_client(
        settings.supabase_url,
        settings.supabase_publishable_key
    )

    token = current_user._token

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token missing."
        )

    user_supabase.postgrest.auth(token)

    return user_supabase


# =========================================================
# CREATE CHAT SESSION
# =========================================================

@router.post(
    "",
    response_model=ChatSessionResponse
)
def create_chat_session(
    data: ChatSessionCreate,
    current_user=Depends(get_current_user)
):
    try:
        user_supabase = get_authenticated_supabase(current_user)

        # Find logged-in patient's profile
        patient_response = (
            user_supabase
            .table("patients")
            .select("id")
            .eq("supabase_user_id", current_user.id)
            .limit(1)
            .execute()
        )

        if not patient_response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found."
            )

        patient_id = patient_response.data[0]["id"]

        session_data = {
            "patient_id": patient_id,
            "title": data.title,
        }

        response = (
            user_supabase
            .table("chat_sessions")
            .insert(session_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Unable to create chat session."
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("CHAT SESSION CREATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to create chat session."
        )


# =========================================================
# GET MY CHAT SESSIONS
# =========================================================

@router.get(
    "/me",
    response_model=list[ChatSessionResponse]
)
def get_my_chat_sessions(
    current_user=Depends(get_current_user)
):
    try:
        user_supabase = get_authenticated_supabase(current_user)

        # Find logged-in patient's profile
        patient_response = (
            user_supabase
            .table("patients")
            .select("id")
            .eq("supabase_user_id", current_user.id)
            .limit(1)
            .execute()
        )

        if not patient_response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found."
            )

        patient_id = patient_response.data[0]["id"]

        response = (
            user_supabase
            .table("chat_sessions")
            .select("*")
            .eq("patient_id", patient_id)
            .order("updated_at", desc=True)
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("CHAT SESSIONS GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve chat sessions."
        )


# =========================================================
# DELETE CHAT SESSION
# =========================================================

@router.delete("/{session_id}")
def delete_chat_session(
    session_id: str,
    current_user=Depends(get_current_user)
):
    try:
        user_supabase = get_authenticated_supabase(current_user)

        # Find logged-in patient's profile
        patient_response = (
            user_supabase
            .table("patients")
            .select("id")
            .eq("supabase_user_id", current_user.id)
            .limit(1)
            .execute()
        )

        if not patient_response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found."
            )

        patient_id = patient_response.data[0]["id"]

        response = (
            user_supabase
            .table("chat_sessions")
            .delete()
            .eq("id", session_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Chat session not found."
            )

        return {
            "message": "Chat session deleted successfully.",
            "session_id": session_id
        }

    except HTTPException:
        raise

    except Exception as e:
        print("CHAT SESSION DELETE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete chat session."
        )


# =========================================================
# CHAT WITH MEDIGURDIAN AI
# =========================================================

@router.post("/ask")
def ask_medigurdian(
    question: str,
    current_user=Depends(get_current_user)
):
    """
    Send a question to the Medigurdian AI LangGraph agent.

    The LangGraph workflow decides whether to use:

    - RAG + Llama 3
    - MCP patient tools
    - MCP doctor tools
    - MCP appointment tools
    - MCP billing
    - MCP notifications
    """

    try:
        # -------------------------------------------------
        # GET AUTHENTICATED USER TOKEN
        # -------------------------------------------------

        access_token = current_user._token

        if not access_token:
            raise HTTPException(
                status_code=401,
                detail="Authentication token missing."
            )

        # -------------------------------------------------
        # CREATE INITIAL LANGGRAPH STATE
        # -------------------------------------------------

        initial_state = {
            "question": question,
            "user_id": str(current_user.id),
            "access_token": access_token,
        }

        # -------------------------------------------------
        # RUN MEDICAL LANGGRAPH
        # -------------------------------------------------

        result = medical_graph.invoke(
            initial_state
        )

        # -------------------------------------------------
        # RETURN AI RESPONSE
        # -------------------------------------------------

        return {
            "success": True,
            "question": question,
            "response": result.get("response"),
            "next_action": result.get("next_action"),
            "tool_name": result.get("tool_name"),
            "tool_result": result.get("tool_result"),
        }

    except HTTPException:
        raise

    except Exception as e:
        print("MEDIGURDIAN CHAT ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to process your request."
        )

    