from fastapi import APIRouter, Depends, HTTPException
from supabase import create_client

from app.config import settings
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
)
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"],
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
# CREATE APPOINTMENT
# =========================================================

@router.post(
    "",
    response_model=AppointmentResponse,
)
def create_appointment(
    data: AppointmentCreate,
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

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
                detail="Patient profile not found.",
            )

        patient_id = patient_response.data[0]["id"]

        # Check doctor
        doctor_response = (
            user_supabase
            .table("doctors")
            .select("id, is_available")
            .eq("id", str(data.doctor_id))
            .limit(1)
            .execute()
        )

        if not doctor_response.data:
            raise HTTPException(
                status_code=404,
                detail="Doctor not found.",
            )

        doctor = doctor_response.data[0]

        if not doctor["is_available"]:
            raise HTTPException(
                status_code=400,
                detail="Doctor is currently unavailable.",
            )

        # Check duplicate appointment slot
        existing = (
            user_supabase
            .table("appointments")
            .select("id")
            .eq("doctor_id", str(data.doctor_id))
            .eq(
                "appointment_date",
                data.appointment_date.isoformat(),
            )
            .eq(
                "appointment_time",
                data.appointment_time.isoformat(),
            )
            .eq("status", "scheduled")
            .limit(1)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="This appointment slot is already booked.",
            )

        # Create appointment
        appointment_data = {
            "patient_id": patient_id,
            "doctor_id": str(data.doctor_id),
            "appointment_date": data.appointment_date.isoformat(),
            "appointment_time": data.appointment_time.isoformat(),
            "reason": data.reason,
            "notes": data.notes,
            "status": "scheduled",
        }

        response = (
            user_supabase
            .table("appointments")
            .insert(appointment_data)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Unable to create appointment.",
            )

        return response.data[0]

    except HTTPException:
        raise

    except Exception as e:
        print("APPOINTMENT CREATE ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to create appointment.",
        )


# =========================================================
# GET MY APPOINTMENTS
# =========================================================

@router.get(
    "/me",
    response_model=list[AppointmentResponse],
)
def get_my_appointments(
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

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
                detail="Patient profile not found.",
            )

        patient_id = patient_response.data[0]["id"]

        response = (
            user_supabase
            .table("appointments")
            .select("*")
            .eq("patient_id", patient_id)
            .order("appointment_date")
            .order("appointment_time")
            .execute()
        )

        return response.data

    except HTTPException:
        raise

    except Exception as e:
        print("APPOINTMENTS GET ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve appointments.",
        )


# =========================================================
# CANCEL APPOINTMENT
# =========================================================

@router.delete(
    "/{appointment_id}",
)
def cancel_appointment(
    appointment_id: str,
    current_user=Depends(get_current_user),
):
    try:
        user_supabase = get_authenticated_supabase(
            current_user
        )

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
                detail="Patient profile not found.",
            )

        patient_id = patient_response.data[0]["id"]

        response = (
            user_supabase
            .table("appointments")
            .update({"status": "cancelled"})
            .eq("id", appointment_id)
            .eq("patient_id", patient_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found.",
            )

        return {
            "message": "Appointment cancelled successfully.",
            "appointment_id": appointment_id,
        }

    except HTTPException:
        raise

    except Exception as e:
        print("APPOINTMENT CANCEL ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to cancel appointment.",
        )