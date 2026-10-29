from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.schemas.prescription import (
    PrescriptionCreate,
    PrescriptionResponse,
)
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/prescriptions",
    tags=["Prescriptions"]
)


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
# CREATE PRESCRIPTION
# =========================================================

@router.post(
    "",
    response_model=PrescriptionResponse
)
def create_prescription(
    data: PrescriptionCreate,
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

        # Check doctor exists
        doctor_response = (
            user_supabase
            .table("doctors")
            .select("id")
            .eq("id", str(data.doctor_id))
            .limit(1)
            .execute()
        )

        if not doctor_response.data:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found."
            )

        # Check medicine exists and is active
        medicine_response = (
            user_supabase
            .table("medicines")
            .select("id")
            .eq("id", str(data.medicine_id))
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        if not medicine_response.data:
            raise HTTPException(
                status_code=404,
                detail="Medicine not found."
            )

        # Prepare prescription data
        prescription_data = {
            "patient_id": patient_id,
            "doctor_id": str(data.doctor_id),
            "medicine_id": str(data.medicine_id),
            "dosage": data.dosage,
            "frequency": data.frequency,
            "duration": data.duration,
            "instructions": data.instructions,
            "start_date": (
                data.start_date.isoformat()
                if data.start_date
                else None
            ),
            "end_date": (
                data.end_date.isoformat()
                if data.end_date
                else None
            ),
            "status": "active",
        }

        # Insert prescription
        response = (
            user_supabase
            .table("prescriptions")
            .insert(prescription_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Unable to create prescription."
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("PRESCRIPTION CREATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to create prescription."
        )


# =========================================================
# GET MY PRESCRIPTIONS
# =========================================================

@router.get(
    "/me",
    response_model=list[PrescriptionResponse]
)
def get_my_prescriptions(
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

        # Get patient's prescriptions
        response = (
            user_supabase
            .table("prescriptions")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("PRESCRIPTIONS GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve prescriptions."
        )


# =========================================================
# CANCEL PRESCRIPTION
# =========================================================

@router.delete("/{prescription_id}")
def cancel_prescription(
    prescription_id: str,
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

        # Cancel only this patient's prescription
        response = (
            user_supabase
            .table("prescriptions")
            .update({"status": "cancelled"})
            .eq("id", prescription_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Prescription not found."
            )

        return {
            "message": "Prescription cancelled successfully.",
            "prescription_id": prescription_id
        }

    except HTTPException:
        raise

    except Exception as e:
        print("PRESCRIPTION CANCEL ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to cancel prescription."
        )