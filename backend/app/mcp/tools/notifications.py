from typing import Any, Dict
from uuid import UUID

from app.services.supabase_client import supabase


def send_patient_notification(
    patient_id: UUID,
    message: str
) -> Dict[str, Any]:
    """
    Create a notification for a patient.

    The notification is stored in the Supabase
    notifications table.
    """

    if not message or not message.strip():
        return {
            "success": False,
            "implemented": True,
            "message": "Notification message is required.",
            "patient_id": str(patient_id)
        }

    try:
        response = (
            supabase
            .table("notifications")
            .insert({
                "patient_id": str(patient_id),
                "message": message.strip(),
                "is_read": False
            })
            .execute()
        )

        notification = (
            response.data[0]
            if response.data
            else None
        )

        if not notification:
            return {
                "success": False,
                "implemented": True,
                "message": "Notification could not be created.",
                "patient_id": str(patient_id)
            }

        return {
            "success": True,
            "implemented": True,
            "message": "Notification sent successfully.",
            "notification": notification
        }

    except Exception as e:

        return {
            "success": False,
            "implemented": True,
            "message": (
                f"Failed to send notification: {str(e)}"
            ),
            "patient_id": str(patient_id)
        }