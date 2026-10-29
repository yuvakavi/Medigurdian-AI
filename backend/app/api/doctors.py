from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"],
)


def get_authenticated_supabase(current_user):
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


# =========================================================
# GET ALL DOCTORS
# =========================================================

@router.get("")
def list_doctors(
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

        response = (
            user_supabase
            .table("doctors")
            .select("*")
            .order("full_name")
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("DOCTORS LIST ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve doctors.",
        )


# =========================================================
# GET ONE DOCTOR
# =========================================================

@router.get("/{doctor_id}")
def get_doctor(
    doctor_id: str,
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

        response = (
            user_supabase
            .table("doctors")
            .select("*")
            .eq("id", doctor_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("DOCTOR GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve doctor.",
        )