from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import BaseModel
from supabase import create_client

from app.config import settings
from app.utils.auth import get_current_user
from app.schemas.patient import PatientResponse


router = APIRouter(
    prefix="/patients",
    tags=["Patients"],
)


# ---------------------------------------------------------
# Request schema for creating a patient profile
# ---------------------------------------------------------

class PatientProfileCreate(BaseModel):
    full_name: str
    date_of_birth: date | None = None
    gender: str | None = None
    blood_group: str | None = None
    phone: str | None = None
    address: str | None = None


# ---------------------------------------------------------
# GET CURRENT PATIENT
# ---------------------------------------------------------

@router.get(
    "/me",
    response_model=PatientResponse,
)
def current_patient(
    auth=Depends(get_current_user),
):
    try:
        current_user = auth["user"]
        token = auth["token"]

        # Create request-specific Supabase client
        user_supabase = create_client(
            settings.supabase_url,
            settings.supabase_publishable_key,
        )

        # Attach JWT so Supabase RLS knows the current user
        user_supabase.postgrest.auth(token)

        response = (
            user_supabase
            .table("patients")
            .select("*")
            .eq(
                "supabase_user_id",
                str(current_user.id),
            )
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found.",
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("PATIENT ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve patient profile.",
        )


# ---------------------------------------------------------
# CREATE PATIENT PROFILE
# ---------------------------------------------------------

@router.post(
    "/profile",
    response_model=PatientResponse,
)
def create_patient_profile(
    data: PatientProfileCreate,
    auth=Depends(get_current_user),
):
    try:
        current_user = auth["user"]
        token = auth["token"]

        # Create request-specific Supabase client
        user_supabase = create_client(
            settings.supabase_url,
            settings.supabase_publishable_key,
        )

        # Attach JWT for RLS
        user_supabase.postgrest.auth(token)

        # Check if patient profile already exists
        existing = (
            user_supabase
            .table("patients")
            .select("*")
            .eq(
                "supabase_user_id",
                str(current_user.id),
            )
            .limit(1)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="Patient profile already exists.",
            )

        patient_data = {
            "supabase_user_id": str(current_user.id),
            "full_name": data.full_name,
            "date_of_birth": (
                data.date_of_birth.isoformat()
                if data.date_of_birth
                else None
            ),
            "gender": data.gender,
            "blood_group": data.blood_group,
            "phone": data.phone,
            "address": data.address,
        }

        response = (
            user_supabase
            .table("patients")
            .insert(patient_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=400,
                detail="Unable to create patient profile.",
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("PATIENT PROFILE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to create patient profile.",
        )