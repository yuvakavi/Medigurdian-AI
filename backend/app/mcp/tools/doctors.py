from typing import Any, Dict, Optional
from uuid import UUID

from app.services.supabase_client import supabase


def search_doctors(
    department: Optional[str] = None,
    specialization: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search available doctors by department or specialization.
    """

    try:

        query = (
            supabase
            .table("doctors")
            .select("*")
            .eq("is_available", True)
        )

        if department:
            query = query.ilike(
                "department",
                f"%{department}%"
            )

        if specialization:
            query = query.ilike(
                "specialization",
                f"%{specialization}%"
            )

        response = query.execute()

        return {
            "success": True,
            "count": len(response.data or []),
            "doctors": response.data or []
        }

    except Exception as e:

        return {
            "success": False,
            "message": f"Unable to search doctors: {str(e)}"
        }


def get_doctor_details(
    doctor_id: UUID
) -> Dict[str, Any]:
    """
    Get details of a specific doctor.
    """

    try:

        response = (
            supabase
            .table("doctors")
            .select("*")
            .eq("id", str(doctor_id))
            .maybe_single()
            .execute()
        )

        if not response.data:

            return {
                "success": False,
                "message": "Doctor not found."
            }

        return {
            "success": True,
            "doctor": response.data
        }

    except Exception as e:

        return {
            "success": False,
            "message": f"Unable to retrieve doctor details: {str(e)}"
        }