from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.schemas.medicine import MedicineResponse
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/medicines",
    tags=["Medicines"],
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
# GET ALL MEDICINES
# =========================================================

@router.get(
    "",
    response_model=list[MedicineResponse],
)
def list_medicines(
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

        response = (
            user_supabase
            .table("medicines")
            .select("*")
            .eq("is_active", True)
            .order("medicine_name")
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("MEDICINES LIST ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve medicines.",
        )


# =========================================================
# GET ONE MEDICINE
# =========================================================

@router.get(
    "/{medicine_id}",
    response_model=MedicineResponse,
)
def get_medicine(
    medicine_id: str,
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

        response = (
            user_supabase
            .table("medicines")
            .select("*")
            .eq("id", medicine_id)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found.",
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("MEDICINE GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve medicine.",
        )