from typing import Any, Dict
from uuid import UUID

from supabase import create_client

from app.config import settings


def get_patient_profile(
    user_id: UUID,
    access_token: str,
) -> Dict[str, Any]:

    try:
        client = create_client(
            settings.supabase_url,
            settings.supabase_publishable_key,
        )

        # Use the authenticated user's JWT for Supabase RLS
        client.postgrest.auth(access_token)

        response = (
            client
            .table("patients")
            .select("*")
            .eq("supabase_user_id", str(user_id))
            .limit(1)
            .execute()
        )

        if not response or not response.data:
            return {
                "success": False,
                "message": "Patient profile not found or access is not authenticated.",
            }

        return {
            "success": True,
            "patient": response.data[0],
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Unable to retrieve patient profile: {str(e)}",
        }