from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.schemas.emergency import (
    EmergencyRecordCreate,
    EmergencyRecordResponse,
)
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/emergency",
    tags=["Emergency"]
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
# CREATE EMERGENCY RECORD
# =========================================================

@router.post(
    "",
    response_model=EmergencyRecordResponse
)
def create_emergency_record(
    data: EmergencyRecordCreate,
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

        emergency_data = {
            "patient_id": patient_id,
            "emergency_type": data.emergency_type,
            "symptoms": data.symptoms,
            "description": data.description,
            "severity": data.severity,
            "location": data.location,
            "contact_number": data.contact_number,
            "status": "open",
        }

        response = (
            user_supabase
            .table("emergency_records")
            .insert(emergency_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Unable to create emergency record."
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("EMERGENCY CREATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to create emergency record."
        )


# =========================================================
# GET MY EMERGENCY RECORDS
# =========================================================

@router.get(
    "/me",
    response_model=list[EmergencyRecordResponse]
)
def get_my_emergency_records(
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
            .table("emergency_records")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("EMERGENCY GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve emergency records."
        )


# =========================================================
# UPDATE EMERGENCY STATUS
# =========================================================

@router.put(
    "/{emergency_id}/status"
)
def update_emergency_status(
    emergency_id: str,
    status: str,
    current_user=Depends(get_current_user)
):
    try:
        allowed_statuses = [
            "open",
            "in_progress",
            "resolved",
            "cancelled"
        ]

        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Use one of: {allowed_statuses}"
            )

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
            .table("emergency_records")
            .update({"status": status})
            .eq("id", emergency_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Emergency record not found."
            )

        return {
            "message": "Emergency status updated successfully.",
            "emergency_id": emergency_id,
            "status": status
        }

    except HTTPException:
        raise

    except Exception as e:
        print("EMERGENCY STATUS UPDATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to update emergency status."
        )


# =========================================================
# DELETE EMERGENCY RECORD
# =========================================================

@router.delete(
    "/{emergency_id}"
)
def delete_emergency_record(
    emergency_id: str,
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
            .table("emergency_records")
            .delete()
            .eq("id", emergency_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Emergency record not found."
            )

        return {
            "message": "Emergency record deleted successfully.",
            "emergency_id": emergency_id
        }

    except HTTPException:
        raise

    except Exception as e:
        print("EMERGENCY DELETE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to delete emergency record."
        )