from typing import Any, Dict
from uuid import UUID

from app.services.supabase_client import supabase


def get_patient_billing(
    patient_id: UUID,
    client=None,
) -> Dict[str, Any]:
    """
    Retrieve billing records for a patient from Supabase.

    ``client`` lets an HTTP route pass a request-scoped, JWT-authenticated
    client so Row Level Security is enforced. Background/MCP callers keep the
    existing default client.
    """

    db = client or supabase

    try:
        response = (
            db
            .table("billing")
            .select(
                "id, patient_id, invoice_number, amount, "
                "payment_status, payment_method, description, "
                "billing_date, due_date, created_at"
            )
            .eq("patient_id", str(patient_id))
            .order("billing_date", desc=True)
            .execute()
        )

        billing_records = response.data or []

        if not billing_records:
            return {
                "success": True,
                "implemented": True,
                "message": "No billing records found for this patient.",
                "patient_id": str(patient_id),
                "billing": []
            }

        return {
            "success": True,
            "implemented": True,
            "message": "Billing information retrieved successfully.",
            "patient_id": str(patient_id),
            "billing": billing_records
        }

    except Exception as e:
        return {
            "success": False,
            "implemented": True,
            "message": f"Failed to retrieve billing information: {str(e)}",
            "patient_id": str(patient_id),
            "billing": []
        }