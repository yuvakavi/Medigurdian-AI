from datetime import date, time
from uuid import UUID
import re

from app.graph.state import MedicalAgentState
from app.rag.retriever import retrieve_documents
from app.llm.llama import llama_service

from app.mcp.tools.patients import get_patient_profile
from app.mcp.tools.doctors import search_doctors, get_doctor_details

from app.mcp.tools.appointments import (
    get_patient_appointments,
    book_appointment,
    cancel_appointment,
    reschedule_appointment,
)

from app.mcp.tools.billing import get_patient_billing
from app.mcp.tools.notifications import send_patient_notification


# ============================================================
# HELPERS
# ============================================================

def _parse_date_from_text(text: str):
    """
    Supports:
    2026-09-28
    September 28
    September 28th
    """

    if not text:
        return None

    match = re.search(
        r"\b(20\d{2}-\d{2}-\d{2})\b",
        text
    )

    if match:
        try:
            return date.fromisoformat(
                match.group(1)
            )
        except ValueError:
            return None

    match = re.search(
        r"\b("
        r"january|february|march|april|may|june|"
        r"july|august|september|october|november|december"
        r")\s+"
        r"(\d{1,2})(?:st|nd|rd|th)?\b",
        text.lower()
    )

    if not match:
        return None

    month_names = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }

    try:
        return date(
            date.today().year,
            month_names[match.group(1)],
            int(match.group(2))
        )
    except ValueError:
        return None


def _parse_time_from_text(text: str):
    """
    Supports:
    10 AM
    10:30 AM
    10am
    10:30pm
    10:00
    """

    if not text:
        return None

    match = re.search(
        r"\b(\d{1,2})"
        r"(?::(\d{2}))?\s*"
        r"(am|pm)\b",
        text.lower()
    )

    if match:

        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        meridiem = match.group(3)

        if meridiem == "pm" and hour != 12:
            hour += 12

        if meridiem == "am" and hour == 12:
            hour = 0

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute)

        return None

    match = re.search(
        r"\b(\d{1,2}):(\d{2})\b",
        text
    )

    if match:

        hour = int(match.group(1))
        minute = int(match.group(2))

        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return time(hour, minute)

    return None


def _format_date(value):
    try:
        parsed = (
            value
            if isinstance(value, date)
            else date.fromisoformat(str(value))
        )

        return (
            parsed.strftime("%B %d, %Y")
            .replace(" 0", " ")
        )

    except Exception:
        return str(value)


def _format_time(value):
    try:

        if isinstance(value, time):
            parsed = value

        else:
            parsed = time.fromisoformat(
                str(value)[:8]
            )

        return (
            parsed.strftime("%I:%M %p")
            .lstrip("0")
        )

    except Exception:
        return str(value)


def _clean_doctor_name(name):
    name = str(name or "Doctor").strip()

    name = re.sub(
        r"^Dr\.?\s+",
        "",
        name,
        flags=re.IGNORECASE
    )

    return name


# ============================================================
# 1. DECIDE ACTION
# ============================================================

def decide_action(
    state: MedicalAgentState
) -> MedicalAgentState:

    question = state.get(
        "question",
        ""
    ).lower().strip()

    if not question:
        return {
            **state,
            "next_action": "rag"
        }

    # --------------------------------------------------------
    # PATIENT PROFILE
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "my profile",
        "patient profile",
        "my details",
        "my personal details"
    ]):

        return {
            **state,
            "next_action": "patient_profile"
        }

    # --------------------------------------------------------
    # CANCEL APPOINTMENT
    # IMPORTANT: BEFORE APPOINTMENT LIST
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "cancel appointment",
        "cancel my appointment",
        "cancel an appointment",
        "cancel the appointment",
        "cancel booking",
        "cancel my booking"
    ]):

        return {
            **state,
            "next_action": "cancel_appointment"
        }

    # --------------------------------------------------------
    # RESCHEDULE APPOINTMENT
    # IMPORTANT: BEFORE APPOINTMENT LIST
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "reschedule appointment",
        "reschedule my appointment",
        "reschedule an appointment",
        "reschedule the appointment",
        "change appointment",
        "change my appointment",
        "change the appointment",
        "change appointment time"
    ]):

        return {
            **state,
            "next_action": "reschedule_appointment"
        }

    # --------------------------------------------------------
    # BOOK APPOINTMENT
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "book appointment",
        "book an appointment",
        "schedule appointment",
        "schedule an appointment",
        "make appointment",
        "make an appointment",
        "book a doctor"
    ]):

        return {
            **state,
            "next_action": "book_appointment"
        }

    # --------------------------------------------------------
    # APPOINTMENT LIST
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "my appointments",
        "my appointment",
        "appointment history",
        "show appointments",
        "show my appointments",
        "upcoming appointments",
        "upcoming appointment"
    ]):

        return {
            **state,
            "next_action": "patient_appointments"
        }

    # --------------------------------------------------------
    # DOCTOR SEARCH
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "find doctor",
        "find a doctor",
        "search doctor",
        "search for doctor",
        "doctors available",
        "available doctors",
        "find specialist",
        "find a specialist",
        "specialist"
    ]):

        return {
            **state,
            "next_action": "search_doctors"
        }

    # --------------------------------------------------------
    # DOCTOR DETAILS
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "doctor details",
        "doctor information",
        "doctor profile"
    ]):

        return {
            **state,
            "next_action": "doctor_details"
        }

    # --------------------------------------------------------
    # BILLING
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "billing",
        "bill",
        "payment",
        "payments",
        "hospital bill"
    ]):

        return {
            **state,
            "next_action": "billing"
        }

    # --------------------------------------------------------
    # NOTIFICATION
    # --------------------------------------------------------

    if any(keyword in question for keyword in [
        "notification",
        "notify me",
        "send notification"
    ]):

        return {
            **state,
            "next_action": "notification"
        }

    # --------------------------------------------------------
    # DEFAULT → RAG
    # --------------------------------------------------------

    return {
        **state,
        "next_action": "rag"
    }


# ============================================================
# 2. RAG RETRIEVAL
# ============================================================

def retrieve_knowledge(
    state: MedicalAgentState
) -> MedicalAgentState:

    question = state.get(
        "question",
        ""
    )

    if not question:

        return {
            **state,
            "context": ""
        }

    try:

        documents = retrieve_documents(
            question,
            top_k=3
        )

        if not documents:

            return {
                **state,
                "context": ""
            }

        context_parts = []

        for document in documents:

            if isinstance(
                document,
                str
            ):

                context_parts.append(
                    document
                )

            elif hasattr(
                document,
                "page_content"
            ):

                context_parts.append(
                    document.page_content
                )

            else:

                context_parts.append(
                    str(document)
                )

        return {
            **state,
            # Local CPU generation is much faster with a bounded prompt.
            "context": "\n\n".join(
                context_parts
            )[:2500]
        }

    except Exception as e:

        print(
            "RAG RETRIEVAL ERROR:",
            repr(e)
        )

        return {
            **state,
            "context": ""
        }


# ============================================================
# 3. LLAMA 3 MEDICAL RESPONSE
# ============================================================

def generate_medical_response(
    state: MedicalAgentState
) -> MedicalAgentState:

    question = state.get(
        "question",
        ""
    )

    context = state.get(
        "context",
        ""
    )

    if not question:

        return {
            **state,
            "response": (
                "Please provide a question."
            )
        }

    try:

        prompt = f"""
You are Medigurdian AI, a healthcare assistance system.

Use the provided medical knowledge context to answer the user's question.

Medical Knowledge Context:

{context}

User Question:

{question}

Instructions:

- Give a clear and understandable response in 120 words or fewer.
- Use the provided context when relevant.
- Do not invent medical facts.
- Do not provide a definitive diagnosis.
- If the information is insufficient, clearly say so.
- For emergencies, advise the user to seek immediate professional medical help.

Answer:
"""

        response = llama_service.generate(
            prompt,
            max_tokens=180
        )

        return {
            **state,
            "response": response
        }

    except Exception as e:

        print(
            "LLAMA RESPONSE ERROR:",
            repr(e)
        )

        return {
            **state,
            "response": (
                "Unable to generate a response "
                "at this time."
            )
        }


# ============================================================
# 4. MCP - PATIENT PROFILE
# ============================================================

def mcp_patient_profile(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_get_patient_profile",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        result = get_patient_profile(
            user_id=UUID(user_id),
            access_token=access_token
        )

        return {
            **state,
            "tool_name": "mcp_get_patient_profile",
            "tool_result": result
        }

    except Exception as e:

        return {
            **state,
            "tool_name": "mcp_get_patient_profile",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 5. MCP - SEARCH DOCTORS
# ============================================================

def mcp_search_doctors(
    state: MedicalAgentState
) -> MedicalAgentState:

    question = state.get(
        "question",
        ""
    ).lower()

    specialization = None
    department = None

    specializations = [
        "cardiologist",
        "dermatologist",
        "neurologist",
        "pediatrician",
        "endocrinologist",
        "general physician"
    ]

    departments = [
        "cardiology",
        "dermatology",
        "neurology",
        "pediatrics",
        "endocrinology",
        "general medicine"
    ]

    for item in specializations:

        if item in question:

            specialization = item
            break

    for item in departments:

        if item in question:

            department = item
            break

    try:

        result = search_doctors(
            department=department,
            specialization=specialization
        )

        return {
            **state,
            "tool_name": "mcp_search_doctors",
            "tool_arguments": {
                "department": department,
                "specialization": specialization
            },
            "tool_result": result
        }

    except Exception as e:

        return {
            **state,
            "tool_name": "mcp_search_doctors",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 6. MCP - DOCTOR DETAILS
# ============================================================

def mcp_doctor_details(
    state: MedicalAgentState
) -> MedicalAgentState:

    doctor_id = (
        state
        .get("tool_arguments", {})
        .get("doctor_id")
    )

    if not doctor_id:

        return {
            **state,
            "tool_name": "mcp_get_doctor_details",
            "tool_result": {
                "success": False,
                "message": "Doctor ID is required."
            }
        }

    try:

        result = get_doctor_details(
            UUID(str(doctor_id))
        )

        return {
            **state,
            "tool_name": "mcp_get_doctor_details",
            "tool_result": result
        }

    except Exception as e:

        return {
            **state,
            "tool_name": "mcp_get_doctor_details",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 7. MCP - PATIENT APPOINTMENTS
# ============================================================

def mcp_patient_appointments(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_get_patient_appointments",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        result = get_patient_appointments(
            user_id=UUID(user_id),
            access_token=access_token
        )

        return {
            **state,
            "tool_name": "mcp_get_patient_appointments",
            "tool_result": result
        }

    except Exception as e:

        return {
            **state,
            "tool_name": "mcp_get_patient_appointments",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 8. MCP - BOOK APPOINTMENT
# ============================================================

def mcp_book_patient_appointment(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    question = state.get(
        "question",
        ""
    )

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_book_appointment",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        patient_result = get_patient_profile(
            user_id=UUID(user_id),
            access_token=access_token
        )

        if not patient_result.get(
            "success"
        ):

            return {
                **state,
                "tool_name": "mcp_book_appointment",
                "tool_result": {
                    "success": False,
                    "message": "Patient profile not found."
                }
            }

        patient_id = UUID(
            patient_result[
                "patient"
            ]["id"]
        )

        doctor_response = search_doctors()

        if not doctor_response.get(
            "success"
        ):

            return {
                **state,
                "tool_name": "mcp_book_appointment",
                "tool_result": doctor_response
            }

        doctors = doctor_response.get(
            "doctors",
            []
        )

        question_lower = question.lower()

        selected_doctor = None

        for doctor in doctors:

            doctor_name = str(
                doctor.get(
                    "full_name",
                    ""
                )
            ).lower()

            name_without_dr = re.sub(
                r"^dr\.?\s+",
                "",
                doctor_name
            ).strip()

            if name_without_dr in question_lower:

                selected_doctor = doctor
                break

            name_parts = name_without_dr.split()

            if len(name_parts) >= 2:

                if (
                    name_parts[0] in question_lower
                    and
                    name_parts[-1] in question_lower
                ):

                    selected_doctor = doctor
                    break

        if not selected_doctor:

            return {
                **state,
                "tool_name": "mcp_book_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Doctor could not be identified. "
                        "Please provide the doctor's name."
                    ),
                    "available_doctors": [
                        doctor.get("full_name")
                        for doctor in doctors
                    ]
                }
            }

        doctor_id = UUID(
            selected_doctor["id"]
        )

        appointment_date = _parse_date_from_text(
            question
        )

        if appointment_date is None:

            return {
                **state,
                "tool_name": "mcp_book_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Appointment date could not be "
                        "identified. Please provide a date "
                        "such as 2026-09-26 or September 26."
                    )
                }
            }

        appointment_time = _parse_time_from_text(
            question
        )

        if appointment_time is None:

            return {
                **state,
                "tool_name": "mcp_book_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Appointment time could not be "
                        "identified. Please provide a time "
                        "such as 10 AM or 10:00."
                    )
                }
            }

        reason = "General consultation"

        reason_match = re.search(
            r"(?:for|reason is|reason:)\s+(.+)$",
            question,
            re.IGNORECASE
        )

        if reason_match:

            reason = reason_match.group(1).strip()

        result = book_appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            reason=reason,
            access_token=access_token,
        )

        return {
            **state,
            "tool_name": "mcp_book_appointment",
            "tool_arguments": {
                "doctor_id": str(doctor_id),
                "appointment_date": (
                    appointment_date.isoformat()
                ),
                "appointment_time": (
                    appointment_time.isoformat()
                ),
                "reason": reason,
            },
            "tool_result": result
        }

    except Exception as e:

        print(
            "MCP BOOK APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            **state,
            "tool_name": "mcp_book_appointment",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 9. MCP - CANCEL APPOINTMENT
# ============================================================

def mcp_cancel_patient_appointment(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    question = state.get(
        "question",
        ""
    )

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_cancel_appointment",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        # ----------------------------------------------------
        # Find patient's appointments
        # ----------------------------------------------------

        appointments_result = get_patient_appointments(
            user_id=UUID(user_id),
            access_token=access_token
        )

        if not appointments_result.get(
            "success"
        ):

            return {
                **state,
                "tool_name": "mcp_cancel_appointment",
                "tool_result": appointments_result
            }

        appointments = (
            appointments_result.get(
                "appointments"
            ) or []
        )

        # ----------------------------------------------------
        # Extract appointment date/time
        # ----------------------------------------------------

        target_date = _parse_date_from_text(
            question
        )

        target_time = _parse_time_from_text(
            question
        )

        if target_date is None:

            return {
                **state,
                "tool_name": "mcp_cancel_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the date of "
                        "the appointment you want to cancel."
                    )
                }
            }

        # ----------------------------------------------------
        # Match appointments
        # ----------------------------------------------------

        matching = []

        for appointment in appointments:

            if (
                appointment.get(
                    "appointment_date"
                )
                != target_date.isoformat()
            ):
                continue

            if (
                appointment.get(
                    "status",
                    ""
                ).lower()
                != "scheduled"
            ):
                continue

            if target_time:

                stored_time = str(
                    appointment.get(
                        "appointment_time",
                        ""
                    )
                )[:5]

                if stored_time != target_time.strftime(
                    "%H:%M"
                ):

                    continue

            matching.append(
                appointment
            )

        # ----------------------------------------------------
        # No appointment
        # ----------------------------------------------------

        if not matching:

            return {
                **state,
                "tool_name": "mcp_cancel_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "No scheduled appointment was "
                        "found for the specified date"
                        + (
                            " and time."
                            if target_time
                            else "."
                        )
                    )
                }
            }

        # ----------------------------------------------------
        # Multiple appointments
        # ----------------------------------------------------

        if len(matching) > 1 and not target_time:

            return {
                **state,
                "tool_name": "mcp_cancel_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "You have multiple appointments "
                        "on that date. Please provide "
                        "the appointment time."
                    ),
                    "appointments": matching
                }
            }

        appointment = matching[0]

        appointment_id = UUID(
            str(
                appointment["id"]
            )
        )

        result = cancel_appointment(
            appointment_id=appointment_id,
            user_id=UUID(user_id),
            access_token=access_token
        )

        return {
            **state,
            "tool_name": "mcp_cancel_appointment",
            "tool_arguments": {
                "appointment_id": str(
                    appointment_id
                )
            },
            "tool_result": result
        }

    except Exception as e:

        print(
            "MCP CANCEL APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            **state,
            "tool_name": "mcp_cancel_appointment",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 10. MCP - RESCHEDULE APPOINTMENT
# ============================================================

def mcp_reschedule_patient_appointment(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    question = state.get(
        "question",
        ""
    )

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_reschedule_appointment",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        # ----------------------------------------------------
        # Get patient's appointments
        # ----------------------------------------------------

        appointments_result = get_patient_appointments(
            user_id=UUID(user_id),
            access_token=access_token
        )

        if not appointments_result.get(
            "success"
        ):

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": appointments_result
            }

        appointments = (
            appointments_result.get(
                "appointments"
            ) or []
        )

        # ----------------------------------------------------
        # Extract dates
        #
        # Example:
        # Reschedule September 28 at 10 AM
        # to October 2 at 10 AM
        # ----------------------------------------------------

        to_match = re.search(
            r"\bto\b",
            question,
            re.IGNORECASE
        )

        if not to_match:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the new date "
                        "and time. Example: "
                        "'Reschedule my appointment on "
                        "September 28 at 10 AM to "
                        "October 2 at 10 AM.'"
                    )
                }
            }

        old_part = question[
            :to_match.start()
        ]

        new_part = question[
            to_match.end():
        ]

        old_date = _parse_date_from_text(
            old_part
        )

        old_time = _parse_time_from_text(
            old_part
        )

        new_date = _parse_date_from_text(
            new_part
        )

        new_time = _parse_time_from_text(
            new_part
        )

        # ----------------------------------------------------
        # Validate old date/time
        # ----------------------------------------------------

        if old_date is None:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the date of "
                        "the existing appointment."
                    )
                }
            }

        if old_time is None:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the time of "
                        "the existing appointment."
                    )
                }
            }

        # ----------------------------------------------------
        # Validate new date/time
        # ----------------------------------------------------

        if new_date is None:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the new "
                        "appointment date."
                    )
                }
            }

        if new_time is None:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "Please provide the new "
                        "appointment time."
                    )
                }
            }

        # ----------------------------------------------------
        # Find existing appointment
        # ----------------------------------------------------

        selected_appointment = None

        for appointment in appointments:

            if (
                appointment.get(
                    "appointment_date"
                )
                != old_date.isoformat()
            ):

                continue

            if (
                appointment.get(
                    "appointment_time",
                    ""
                )[:5]
                != old_time.strftime("%H:%M")
            ):

                continue

            if (
                appointment.get(
                    "status",
                    ""
                ).lower()
                != "scheduled"
            ):

                continue

            selected_appointment = appointment
            break

        if not selected_appointment:

            return {
                **state,
                "tool_name": "mcp_reschedule_appointment",
                "tool_result": {
                    "success": False,
                    "message": (
                        "No scheduled appointment was "
                        "found for the specified date "
                        "and time."
                    )
                }
            }

        appointment_id = UUID(
            str(
                selected_appointment["id"]
            )
        )

        # ----------------------------------------------------
        # RESCHEDULE
        # ----------------------------------------------------

        result = reschedule_appointment(
            appointment_id=appointment_id,
            user_id=UUID(user_id),
            new_date=new_date,
            new_time=new_time,
            access_token=access_token
        )

        return {
            **state,
            "tool_name": "mcp_reschedule_appointment",
            "tool_arguments": {
                "appointment_id": str(
                    appointment_id
                ),
                "new_date": (
                    new_date.isoformat()
                ),
                "new_time": (
                    new_time.isoformat()
                ),
            },
            "tool_result": result
        }

    except Exception as e:

        print(
            "MCP RESCHEDULE APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            **state,
            "tool_name": "mcp_reschedule_appointment",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 11. MCP - BILLING
# ============================================================

def mcp_billing(
    state: MedicalAgentState
) -> MedicalAgentState:

    user_id = state.get(
        "user_id"
    )

    access_token = state.get(
        "access_token"
    )

    # --------------------------------------------------------
    # AUTHENTICATION CHECK
    # --------------------------------------------------------

    if not user_id or not access_token:

        return {
            **state,
            "tool_name": "mcp_get_patient_billing",
            "tool_result": {
                "success": False,
                "message": "Authentication required."
            }
        }

    try:

        # ----------------------------------------------------
        # FIND PATIENT FROM LOGGED-IN USER
        # ----------------------------------------------------

        patient_result = get_patient_profile(
            user_id=UUID(user_id),
            access_token=access_token
        )

        if not patient_result.get(
            "success"
        ):

            return {
                **state,
                "tool_name": "mcp_get_patient_billing",
                "tool_result": {
                    "success": False,
                    "message": "Patient profile not found."
                }
            }

        patient = patient_result.get(
            "patient"
        )

        if not patient:

            return {
                **state,
                "tool_name": "mcp_get_patient_billing",
                "tool_result": {
                    "success": False,
                    "message": "Patient profile not found."
                }
            }

        patient_id = patient.get(
            "id"
        )

        if not patient_id:

            return {
                **state,
                "tool_name": "mcp_get_patient_billing",
                "tool_result": {
                    "success": False,
                    "message": "Patient ID could not be determined."
                }
            }

        # ----------------------------------------------------
        # GET BILLING
        # ----------------------------------------------------

        result = get_patient_billing(
            UUID(str(patient_id))
        )

        return {
            **state,
            "tool_name": "mcp_get_patient_billing",
            "tool_arguments": {
                "patient_id": str(
                    patient_id
                )
            },
            "tool_result": result
        }

    except Exception as e:

        print(
            "MCP BILLING ERROR:",
            repr(e)
        )

        return {
            **state,
            "tool_name": "mcp_get_patient_billing",
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 12. MCP - NOTIFICATION
# ============================================================

def mcp_notification(
    state: MedicalAgentState
) -> MedicalAgentState:

    patient_id = (
        state
        .get("tool_arguments", {})
        .get("patient_id")
    )

    message = (
        state
        .get("tool_arguments", {})
        .get("message")
    )

    if not patient_id or not message:

        return {
            **state,
            "tool_name": "mcp_send_patient_notification",
            "tool_result": {
                "success": False,
                "message": (
                    "Patient ID and notification "
                    "message are required."
                )
            }
        }

    try:

        result = send_patient_notification(
            patient_id=UUID(
                str(patient_id)
            ),
            message=message
        )

        return {
            **state,
            "tool_name": (
                "mcp_send_patient_notification"
            ),
            "tool_result": result
        }

    except Exception as e:

        return {
            **state,
            "tool_name": (
                "mcp_send_patient_notification"
            ),
            "tool_result": {
                "success": False,
                "message": str(e)
            }
        }


# ============================================================
# 13. MCP RESULT → USER RESPONSE
# ============================================================

def generate_tool_response(
    state: MedicalAgentState
) -> MedicalAgentState:

    tool_result = (
        state.get(
            "tool_result"
        ) or {}
    )

    tool_name = state.get(
        "tool_name",
        ""
    )

    question = state.get(
        "question",
        ""
    )

    if not tool_result:

        return {
            **state,
            "response": (
                "No result was returned "
                "from the requested tool."
            )
        }

    # ========================================================
    # BOOK APPOINTMENT
    # ========================================================

    if tool_name == "mcp_book_appointment":

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "The appointment could not be booked."
                )
            }

        appointment = (
            tool_result.get(
                "appointment"
            ) or {}
        )

        doctor_name = "the doctor"

        doctor_match = re.search(
            r"(?:with|for)\s+"
            r"(?:Dr\.?\s+)?"
            r"([A-Za-z]+(?:\s+[A-Za-z]+)+?)"
            r"\s+(?:on|at)\b",
            question,
            re.IGNORECASE
        )

        if doctor_match:

            doctor_name = (
                doctor_match
                .group(1)
                .strip()
            )

        return {
            **state,
            "response": (
                "Appointment booked successfully!\n\n"
                f"Your appointment with Dr. "
                f"{doctor_name} is scheduled for "
                f"{_format_date(appointment.get('appointment_date'))} "
                f"at "
                f"{_format_time(appointment.get('appointment_time'))} "
                f"for "
                f"{appointment.get('reason', 'general consultation')}. "
                f"Status: "
                f"{appointment.get('status', 'scheduled')}."
            )
        }

    # ========================================================
    # CANCEL APPOINTMENT
    # ========================================================

    if tool_name == "mcp_cancel_appointment":

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "The appointment could not be cancelled."
                )
            }

        appointment = (
            tool_result.get(
                "appointment"
            ) or {}
        )

        return {
            **state,
            "response": (
                "Appointment cancelled successfully.\n\n"
                f"Appointment date: "
                f"{_format_date(appointment.get('appointment_date'))}\n"
                f"Time: "
                f"{_format_time(appointment.get('appointment_time'))}\n"
                f"Status: "
                f"{appointment.get('status', 'cancelled')}."
            )
        }

    # ========================================================
    # RESCHEDULE APPOINTMENT
    # ========================================================

    if tool_name == "mcp_reschedule_appointment":

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "The appointment could not be rescheduled."
                )
            }

        appointment = (
            tool_result.get(
                "appointment"
            ) or {}
        )

        return {
            **state,
            "response": (
                "Appointment rescheduled successfully.\n\n"
                f"New date: "
                f"{_format_date(appointment.get('appointment_date'))}\n"
                f"New time: "
                f"{_format_time(appointment.get('appointment_time'))}\n"
                f"Status: "
                f"{appointment.get('status', 'scheduled')}."
            )
        }

    # ========================================================
    # PATIENT APPOINTMENTS
    # ========================================================

    if tool_name == (
        "mcp_get_patient_appointments"
    ):

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "Unable to retrieve your appointments."
                )
            }

        appointments = (
            tool_result.get(
                "appointments"
            ) or []
        )

        if not appointments:

            return {
                **state,
                "response": (
                    "You currently have no appointments."
                )
            }

        lines = [
            "Here are your appointments:"
        ]

        for appointment in appointments:

            lines.append(
                f"- "
                f"{_format_date(appointment.get('appointment_date'))} "
                f"at "
                f"{_format_time(appointment.get('appointment_time'))} "
                f"— "
                f"{appointment.get('reason', 'General consultation')} "
                f"({appointment.get('status', 'scheduled')})"
            )

        return {
            **state,
            "response": "\n".join(lines)
        }

    # ========================================================
    # PATIENT PROFILE
    # ========================================================

    if tool_name == (
        "mcp_get_patient_profile"
    ):

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "Unable to retrieve your patient profile."
                )
            }

        patient = (
            tool_result.get(
                "patient"
            ) or {}
        )

        name = (
            patient.get(
                "full_name"
            )
            or patient.get(
                "name"
            )
            or "Patient"
        )

        return {
            **state,
            "response": (
                "Here is your patient profile:\n\n"
                f"Name: {name}"
            )
        }

    # ========================================================
    # DOCTOR SEARCH
    # ========================================================

    if tool_name == (
        "mcp_search_doctors"
    ):

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "Unable to search for doctors."
                )
            }

        doctors = (
            tool_result.get(
                "doctors"
            ) or []
        )

        if not doctors:

            return {
                **state,
                "response": (
                    "No doctors were found "
                    "matching your request."
                )
            }

        lines = [
            "Available doctors:"
        ]

        for doctor in doctors:

            name = _clean_doctor_name(
                doctor.get(
                    "full_name",
                    "Doctor"
                )
            )

            specialization = (
                doctor.get(
                    "specialization"
                )
            )

            if specialization:

                lines.append(
                    f"- Dr. {name} — "
                    f"{specialization}"
                )

            else:

                lines.append(
                    f"- Dr. {name}"
                )

        return {
            **state,
            "response": "\n".join(lines)
        }

    # ========================================================
    # DOCTOR DETAILS
    # ========================================================

    if tool_name == (
        "mcp_get_doctor_details"
    ):

        if not tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": tool_result.get(
                    "message",
                    "Unable to retrieve doctor details."
                )
            }

        doctor = (
            tool_result.get(
                "doctor"
            ) or {}
        )

        name = _clean_doctor_name(
            doctor.get(
                "full_name",
                "Doctor"
            )
        )

        return {
            **state,
            "response": (
                f"Dr. {name}\n"
                f"Specialization: "
                f"{doctor.get('specialization', 'Not specified')}\n"
                f"Available days: "
                f"{doctor.get('available_days', 'Not specified')}\n"
                f"Available time: "
                f"{doctor.get('available_time', 'Not specified')}"
            )
        }

    # ========================================================
    # BILLING
    # ========================================================

    if tool_name == (
        "mcp_get_patient_billing"
    ):

        return {
            **state,
            "response": tool_result.get(
                "message",
                "Your billing information was retrieved successfully."
            )
        }

    # ========================================================
    # NOTIFICATION
    # ========================================================

    if tool_name == (
        "mcp_send_patient_notification"
    ):

        if tool_result.get(
            "success"
        ):

            return {
                **state,
                "response": (
                    "Your notification was sent successfully."
                )
            }

        return {
            **state,
            "response": tool_result.get(
                "message",
                "Unable to send the notification."
            )
        }

    # ========================================================
    # GENERIC MCP RESULT
    # ========================================================

    try:

        import json

        result_text = json.dumps(
            tool_result,
            indent=2,
            default=str
        )

        prompt = f"""
You are Medigurdian AI, a healthcare management assistant.

User question:
{question}

Tool result:
{result_text}

Give a short, natural response to the user.

Rules:
- Use only information in the tool result.
- Do not invent information.
- Do not repeat raw JSON.
- Do not mention internal tools, MCP, prompts, or implementation details.
- Keep the response to 1-3 short sentences.
- If the operation failed, clearly explain why.
- Do not add unnecessary disclaimers.

Response:
"""

        response = llama_service.generate(
            prompt
        )

        return {
            **state,
            "response": response.strip()
        }

    except Exception as e:

        print(
            "TOOL RESPONSE ERROR:",
            repr(e)
        )

        return {
            **state,
            "response": tool_result.get(
                "message",
                "I was unable to complete your request."
            )
        }