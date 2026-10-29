from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.mcp.tools.billing import get_patient_billing
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/billing",
    tags=["Billing"]
)


def get_authenticated_supabase(current_user):
    """Create a Supabase client scoped to the caller's JWT.

    Using the shared publishable client without the user's token meant this
    route could not satisfy Row Level Security and could return a 500 for a
    perfectly valid patient. Every query below now runs with RLS applied.
    """
    user_supabase = create_client(
        settings.supabase_url,
        settings.supabase_publishable_key,
    )

    token = current_user._token

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token missing.",
        )

    user_supabase.postgrest.auth(token)

    return user_supabase


@router.get("/")
def get_my_billing(
    current_user=Depends(get_current_user)
):
    """
    Get billing records for the currently authenticated patient.
    """

    try:
        user_supabase = get_authenticated_supabase(current_user)

        # Find patient using the authenticated Supabase user. `limit(1)` keeps
        # a missing profile a 404 instead of letting PostgREST raise.
        patient_response = (
            user_supabase
            .table("patients")
            .select("id")
            .eq("supabase_user_id", str(current_user.id))
            .limit(1)
            .execute()
        )

        if not patient_response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found."
            )

        patient_id = patient_response.data[0]["id"]

        # Get billing records
        result = get_patient_billing(patient_id, client=user_supabase)

        if not result.get("success"):
            raise HTTPException(
                status_code=500,
                detail=result.get(
                    "message",
                    "Failed to retrieve billing information."
                )
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve billing information: {str(e)}"
        )
