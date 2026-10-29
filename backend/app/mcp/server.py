from pathlib import Path
import sys
from uuid import UUID

# =========================================================
# FIX PYTHON PATH
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# =========================================================
# IMPORTS
# =========================================================

from pydantic import AnyHttpUrl

from mcp.server import MCPServer
from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.auth.settings import AuthSettings

from app.config import settings
from app.mcp.auth import SupabaseTokenVerifier

from app.mcp.tools.patients import get_patient_profile

from app.mcp.tools.doctors import (
    search_doctors,
    get_doctor_details
)

from app.mcp.tools.appointments import (
    book_appointment,
    get_patient_appointments
)

from app.mcp.tools.billing import (
    get_patient_billing
)

from app.mcp.tools.notifications import (
    send_patient_notification
)


# =========================================================
# CREATE MCP SERVER
# =========================================================

mcp = MCPServer(
    "Medigurdian AI MCP Server",

    # Supabase JWT verification
    token_verifier=SupabaseTokenVerifier(),

    # MCP HTTP authentication configuration
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(
            settings.supabase_url
        ),
        resource_server_url=AnyHttpUrl(
            "http://127.0.0.1:8001/mcp"
        ),
        required_scopes=[],
        validate_token_resource=False,
    ),
)


# =========================================================
# PATIENT PROFILE
# =========================================================

@mcp.tool()
async def mcp_get_patient_profile(user_id: UUID):
    """
    Get the authenticated patient's profile.
    """

    access_token = get_access_token()

    if access_token is None:
        return {
            "success": False,
            "message": "Authentication required."
        }

    return get_patient_profile(
        user_id=user_id,
        access_token=access_token.token,
    )


# =========================================================
# DOCTOR SEARCH
# =========================================================

@mcp.tool()
def mcp_search_doctors(
    department: str | None = None,
    specialization: str | None = None
):
    """
    Search available doctors by department
    or medical specialization.
    """

    return search_doctors(
        department=department,
        specialization=specialization
    )


# =========================================================
# DOCTOR DETAILS
# =========================================================

@mcp.tool()
def mcp_get_doctor_details(
    doctor_id: str
):
    """
    Get details about a specific doctor.
    """

    return get_doctor_details(
        UUID(doctor_id)
    )


# =========================================================
# BOOK APPOINTMENT
# =========================================================

@mcp.tool()
async def mcp_book_appointment(
    doctor_id: str,
    appointment_date: str,
    appointment_time: str,
    reason: str | None = None
):
    """
    Book an appointment for the currently authenticated patient.
    """

    from datetime import date, time

    access_token = get_access_token()

    if access_token is None:
        return {
            "success": False,
            "message": "Authentication required."
        }

    # The verified MCP token identifies the current user.
    user_id = UUID(access_token.client_id)

    # Find the patient belonging to this authenticated user.
    patient_result = get_patient_profile(
        user_id=user_id,
        access_token=access_token.token,
    )

    if not patient_result.get("success"):
        return {
            "success": False,
            "message": "Authenticated patient profile not found."
        }

    patient_id = UUID(
        patient_result["patient"]["id"]
    )

    return book_appointment(
        patient_id=patient_id,
        doctor_id=UUID(doctor_id),
        appointment_date=date.fromisoformat(
            appointment_date
        ),
        appointment_time=time.fromisoformat(
            appointment_time
        ),
        reason=reason,
        access_token=access_token.token,
    )
# =========================================================
# PATIENT APPOINTMENTS
# =========================================================
@mcp.tool()
async def mcp_get_patient_appointments(
    user_id: str
):
    """
    Get appointments belonging to the authenticated patient.
    """

    access_token = get_access_token()

    if access_token is None:
        return {
            "success": False,
            "message": "Authentication required."
        }

    return get_patient_appointments(
        user_id=UUID(user_id),
        access_token=access_token.token,
    )
# =========================================================
# BILLING
# =========================================================

@mcp.tool()
def mcp_get_patient_billing(
    patient_id: str
):
    """
    Get patient billing information.
    """

    return get_patient_billing(
        UUID(patient_id)
    )


# =========================================================
# NOTIFICATION
# =========================================================

@mcp.tool()
def mcp_send_patient_notification(
    patient_id: str,
    message: str
):
    """
    Send a notification to a patient.
    """

    return send_patient_notification(
        patient_id=UUID(patient_id),
        message=message
    )


# =========================================================
# RUN MCP SERVER
# =========================================================

if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="127.0.0.1",
        port=8001,
        json_response=True
    )