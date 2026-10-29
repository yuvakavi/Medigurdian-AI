from datetime import date, time, datetime
from uuid import UUID

from app.services.supabase_client import supabase


# ============================================================
# HELPER - CONVERT VALUE TO TIME
# ============================================================

def _convert_to_time(value):
    """
    Convert a database time value into Python time.

    Supports:
    - datetime.time
    - HH:MM
    - HH:MM:SS
    """

    if isinstance(value, time):
        return value

    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    # Try HH:MM:SS
    try:
        if len(value) >= 8:
            return time.fromisoformat(value[:8])
    except ValueError:
        pass

    # Try HH:MM
    try:
        return time.fromisoformat(value[:5])
    except ValueError:
        return None


# ============================================================
# HELPER - PARSE AVAILABLE TIME
# ============================================================

def _parse_available_time(available_time):
    """
    Parse doctor's available_time.

    Examples:
        09:00-13:00
        09:00 - 13:00
        09:00:00-13:00:00
        9:00 AM - 1:00 PM
    """

    if not available_time:
        return None, None

    # --------------------------------------------------------
    # If database returns a dictionary
    # --------------------------------------------------------

    if isinstance(available_time, dict):

        start = (
            available_time.get("from")
            or available_time.get("start")
            or available_time.get("available_from")
        )

        end = (
            available_time.get("to")
            or available_time.get("end")
            or available_time.get("available_to")
        )

        return (
            _convert_to_time(start),
            _convert_to_time(end),
        )

    value = str(
        available_time
    ).strip()

    # Normalize dash characters
    value = value.replace("–", "-")
    value = value.replace("—", "-")

    # --------------------------------------------------------
    # Split time range
    # --------------------------------------------------------

    if "-" not in value:
        return None, None

    parts = value.split("-", 1)

    if len(parts) != 2:
        return None, None

    start_value = parts[0].strip()
    end_value = parts[1].strip()

    # --------------------------------------------------------
    # Try 24-hour format
    # --------------------------------------------------------

    start_time = _convert_to_time(
        start_value
    )

    end_time = _convert_to_time(
        end_value
    )

    if start_time and end_time:
        return start_time, end_time

    # --------------------------------------------------------
    # Try 12-hour AM/PM format
    # --------------------------------------------------------

    formats = [
        "%I:%M %p",
        "%I %p",
        "%I:%M:%S %p",
    ]

    for fmt in formats:

        try:

            start_time = datetime.strptime(
                start_value.upper(),
                fmt
            ).time()

            end_time = datetime.strptime(
                end_value.upper(),
                fmt
            ).time()

            return start_time, end_time

        except ValueError:
            continue

    return None, None


# ============================================================
# BOOK APPOINTMENT
# ============================================================

def book_appointment(
    patient_id: UUID,
    doctor_id: UUID,
    appointment_date: date,
    appointment_time: time,
    reason: str | None = None,
    access_token: str | None = None,
):
    """
    Book an appointment after validating:

    1. Authentication
    2. Doctor exists
    3. Doctor is available
    4. Doctor's working day
    5. Doctor's working hours
    6. Appointment slot is not already booked
    """

    try:

        # ====================================================
        # 1. AUTHENTICATION
        # ====================================================

        if not access_token:

            return {
                "success": False,
                "message": (
                    "Authentication token is required."
                ),
            }

        # ====================================================
        # 2. GET DOCTOR DETAILS
        # ====================================================

        from app.mcp.tools.doctors import (
            get_doctor_details
        )

        doctor_result = get_doctor_details(
            doctor_id
        )

        if not doctor_result.get(
            "success"
        ):

            return {
                "success": False,
                "message": "Doctor not found.",
            }

        doctor = doctor_result.get(
            "doctor"
        )

        if not doctor:

            return {
                "success": False,
                "message": (
                    "Doctor details could not "
                    "be found."
                ),
            }

        # ====================================================
        # 3. DOCTOR NAME
        # ====================================================

        doctor_name = doctor.get(
            "full_name",
            "Doctor"
        )

        # Prevent "Dr. Dr. Arun Kumar"
        display_doctor_name = doctor_name

        if display_doctor_name.lower().startswith(
            "dr. "
        ):

            display_doctor_name = (
                display_doctor_name[4:]
            )

        elif display_doctor_name.lower().startswith(
            "dr "
        ):

            display_doctor_name = (
                display_doctor_name[3:]
            )

        # ====================================================
        # 4. CHECK DOCTOR AVAILABILITY
        # ====================================================

        if not doctor.get(
            "is_available",
            True
        ):

            return {
                "success": False,
                "message": (
                    f"Dr. {display_doctor_name} "
                    "is currently unavailable."
                ),
            }

        # ====================================================
        # 5. CHECK AVAILABLE DAYS
        # ====================================================

        available_days = doctor.get(
            "available_days"
        ) or []

        requested_day = appointment_date.strftime(
            "%A"
        )

        # ----------------------------------------------------
        # Convert string to list
        #
        # Example:
        # "Monday, Wednesday, Friday"
        #
        # becomes:
        # ["Monday", "Wednesday", "Friday"]
        # ----------------------------------------------------

        if isinstance(
            available_days,
            str
        ):

            available_days = [
                day.strip()
                for day in available_days.split(",")
                if day.strip()
            ]

        # If some other iterable is returned
        elif not isinstance(
            available_days,
            list
        ):

            try:
                available_days = list(
                    available_days
                )

            except TypeError:

                available_days = []

        # ----------------------------------------------------
        # Normalize days
        # ----------------------------------------------------

        normalized_days = [
            str(day)
            .strip()
            .lower()
            for day in available_days
        ]

        # ----------------------------------------------------
        # Validate requested day
        # ----------------------------------------------------

        if normalized_days:

            if requested_day.lower() not in normalized_days:

                available_days_text = ", ".join(
                    str(day)
                    for day in available_days
                )

                return {
                    "success": False,
                    "message": (
                        f"Dr. {display_doctor_name} "
                        f"is not available on "
                        f"{requested_day}. "
                        f"Available days: "
                        f"{available_days_text}."
                    ),
                }

        # ====================================================
        # 6. CHECK WORKING HOURS
        # ====================================================

        available_time = doctor.get(
            "available_time"
        )

        start_time, end_time = (
            _parse_available_time(
                available_time
            )
        )

        if start_time and end_time:

            # ------------------------------------------------
            # Appointment must be within working hours
            # ------------------------------------------------

            if not (
                start_time
                <= appointment_time
                <= end_time
            ):

                start_text = (
                    start_time
                    .strftime("%I:%M %p")
                    .lstrip("0")
                )

                end_text = (
                    end_time
                    .strftime("%I:%M %p")
                    .lstrip("0")
                )

                return {
                    "success": False,
                    "message": (
                        f"Dr. {display_doctor_name} "
                        f"is available from "
                        f"{start_text} to "
                        f"{end_text} on "
                        f"{requested_day}."
                    ),
                }

        # ====================================================
        # 7. ATTACH USER JWT
        # ====================================================

        supabase.postgrest.auth(
            access_token
        )

        # ====================================================
        # 8. CHECK EXISTING APPOINTMENT SLOT
        # ====================================================

        existing_result = (
            supabase
            .table("appointments")
            .select("id")
            .eq(
                "doctor_id",
                str(doctor_id)
            )
            .eq(
                "appointment_date",
                appointment_date.isoformat()
            )
            .eq(
                "appointment_time",
                appointment_time.isoformat()
            )
            .eq(
                "status",
                "scheduled"
            )
            .execute()
        )

        # ----------------------------------------------------
        # Slot already occupied
        # ----------------------------------------------------

        if existing_result.data:

            return {
                "success": False,
                "message": (
                    "This appointment slot is "
                    "already booked. "
                    "Please choose another time."
                ),
            }

        # ====================================================
        # 9. PREPARE APPOINTMENT DATA
        # ====================================================

        appointment_data = {
            "patient_id": str(
                patient_id
            ),
            "doctor_id": str(
                doctor_id
            ),
            "appointment_date": (
                appointment_date.isoformat()
            ),
            "appointment_time": (
                appointment_time.isoformat()
            ),
            "reason": (
                reason
                or "General consultation"
            ),
            "status": "scheduled",
        }

        # ====================================================
        # 10. INSERT APPOINTMENT
        # ====================================================

        result = (
            supabase
            .table("appointments")
            .insert(
                appointment_data
            )
            .execute()
        )

        # ----------------------------------------------------
        # Insert failed
        # ----------------------------------------------------

        if not result.data:

            return {
                "success": False,
                "message": (
                    "Unable to create "
                    "the appointment."
                ),
            }

        appointment = result.data[0]

        # ====================================================
        # 11. SUCCESS
        # ====================================================

        return {
            "success": True,
            "message": (
                "Appointment booked successfully."
            ),
            "appointment": appointment,
        }

    except Exception as e:

        print(
            "BOOK APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            "success": False,
            "message": (
                f"Unable to book appointment: {str(e)}"
            ),
        }


# ============================================================
# GET PATIENT APPOINTMENTS
# ============================================================

def get_patient_appointments(
    user_id: UUID,
    access_token: str | None = None,
):
    """
    Get appointments belonging to the
    authenticated patient.
    """

    try:

        # ====================================================
        # 1. AUTHENTICATION
        # ====================================================

        if not access_token:

            return {
                "success": False,
                "message": (
                    "Authentication token is required."
                ),
            }

        # ====================================================
        # 2. ATTACH USER JWT
        # ====================================================

        supabase.postgrest.auth(
            access_token
        )

        # ====================================================
        # 3. FIND PATIENT
        # ====================================================

        patient_result = (
            supabase
            .table("patients")
            .select("id")
            .eq(
                "supabase_user_id",
                str(user_id)
            )
            .maybe_single()
            .execute()
        )

        if not patient_result.data:

            return {
                "success": False,
                "message": (
                    "Patient profile not found."
                ),
            }

        patient_id = (
            patient_result.data["id"]
        )

        # ====================================================
        # 4. GET APPOINTMENTS
        # ====================================================

        result = (
            supabase
            .table("appointments")
            .select("*")
            .eq(
                "patient_id",
                patient_id
            )
            .order(
                "appointment_date",
                desc=False
            )
            .order(
                "appointment_time",
                desc=False
            )
            .execute()
        )

        # ====================================================
        # 5. RETURN RESULT
        # ====================================================

        return {
            "success": True,
            "count": len(
                result.data or []
            ),
            "appointments": (
                result.data or []
            ),
        }

    except Exception as e:

        print(
            "GET PATIENT APPOINTMENTS ERROR:",
            repr(e)
        )

        return {
            "success": False,
            "message": str(e),
        }

# ============================================================
# CANCEL APPOINTMENT
# ============================================================

def cancel_appointment(
    appointment_id: UUID,
    user_id: UUID,
    access_token: str | None = None,
):
    """
    Cancel an appointment belonging to the authenticated patient.

    Validation:
    1. Authentication
    2. Patient exists
    3. Appointment exists
    4. Appointment belongs to patient
    5. Appointment is currently scheduled
    """

    try:

        # ----------------------------------------------------
        # 1. AUTHENTICATION
        # ----------------------------------------------------

        if not access_token:

            return {
                "success": False,
                "message": (
                    "Authentication token is required."
                ),
            }

        # Attach JWT
        supabase.postgrest.auth(
            access_token
        )

        # ----------------------------------------------------
        # 2. FIND PATIENT
        # ----------------------------------------------------

        patient_result = (
            supabase
            .table("patients")
            .select("id")
            .eq(
                "supabase_user_id",
                str(user_id)
            )
            .maybe_single()
            .execute()
        )

        if not patient_result.data:

            return {
                "success": False,
                "message": (
                    "Patient profile not found."
                ),
            }

        patient_id = patient_result.data["id"]

        # ----------------------------------------------------
        # 3. FIND APPOINTMENT
        # ----------------------------------------------------

        appointment_result = (
            supabase
            .table("appointments")
            .select("*")
            .eq(
                "id",
                str(appointment_id)
            )
            .eq(
                "patient_id",
                patient_id
            )
            .maybe_single()
            .execute()
        )

        if not appointment_result.data:

            return {
                "success": False,
                "message": (
                    "Appointment not found or "
                    "you do not have permission to "
                    "cancel this appointment."
                ),
            }

        appointment = (
            appointment_result.data
        )

        # ----------------------------------------------------
        # 4. CHECK STATUS
        # ----------------------------------------------------

        current_status = (
            appointment.get(
                "status"
            )
            or ""
        ).lower()

        if current_status != "scheduled":

            return {
                "success": False,
                "message": (
                    "This appointment cannot be "
                    f"cancelled because its current "
                    f"status is '{current_status}'."
                ),
            }

        # ----------------------------------------------------
        # 5. UPDATE STATUS
        # ----------------------------------------------------

        update_result = (
            supabase
            .table("appointments")
            .update({
                "status": "cancelled"
            })
            .eq(
                "id",
                str(appointment_id)
            )
            .eq(
                "patient_id",
                patient_id
            )
            .execute()
        )

        if not update_result.data:

            return {
                "success": False,
                "message": (
                    "Unable to cancel the appointment."
                ),
            }

        cancelled_appointment = (
            update_result.data[0]
        )

        # ----------------------------------------------------
        # 6. SUCCESS
        # ----------------------------------------------------

        return {
            "success": True,
            "message": (
                "Appointment cancelled successfully."
            ),
            "appointment": cancelled_appointment,
        }

    except Exception as e:

        print(
            "CANCEL APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            "success": False,
            "message": str(e),
        }


# ============================================================
# RESCHEDULE APPOINTMENT
# ============================================================

def reschedule_appointment(
    appointment_id: UUID,
    user_id: UUID,
    new_date: date,
    new_time: time,
    access_token: str | None = None,
):
    """
    Reschedule an existing appointment.

    Validation:
    1. Authentication
    2. Patient ownership
    3. Appointment status
    4. Doctor availability
    5. Doctor working day
    6. Doctor working hours
    7. New slot is not already booked
    """

    try:

        # ----------------------------------------------------
        # 1. AUTHENTICATION
        # ----------------------------------------------------

        if not access_token:

            return {
                "success": False,
                "message": (
                    "Authentication token is required."
                ),
            }

        supabase.postgrest.auth(
            access_token
        )

        # ----------------------------------------------------
        # 2. FIND PATIENT
        # ----------------------------------------------------

        patient_result = (
            supabase
            .table("patients")
            .select("id")
            .eq(
                "supabase_user_id",
                str(user_id)
            )
            .maybe_single()
            .execute()
        )

        if not patient_result.data:

            return {
                "success": False,
                "message": (
                    "Patient profile not found."
                ),
            }

        patient_id = patient_result.data["id"]

        # ----------------------------------------------------
        # 3. FIND EXISTING APPOINTMENT
        # ----------------------------------------------------

        appointment_result = (
            supabase
            .table("appointments")
            .select("*")
            .eq(
                "id",
                str(appointment_id)
            )
            .eq(
                "patient_id",
                patient_id
            )
            .maybe_single()
            .execute()
        )

        if not appointment_result.data:

            return {
                "success": False,
                "message": (
                    "Appointment not found or "
                    "you do not have permission to "
                    "reschedule this appointment."
                ),
            }

        appointment = (
            appointment_result.data
        )

        # ----------------------------------------------------
        # 4. CHECK STATUS
        # ----------------------------------------------------

        current_status = (
            appointment.get(
                "status"
            )
            or ""
        ).lower()

        if current_status != "scheduled":

            return {
                "success": False,
                "message": (
                    "Only scheduled appointments "
                    "can be rescheduled."
                ),
            }

        # ----------------------------------------------------
        # 5. GET DOCTOR
        # ----------------------------------------------------

        doctor_id = appointment.get(
            "doctor_id"
        )

        if not doctor_id:

            return {
                "success": False,
                "message": (
                    "Doctor information could "
                    "not be found for this appointment."
                ),
            }

        from app.mcp.tools.doctors import (
            get_doctor_details
        )

        doctor_result = get_doctor_details(
            UUID(str(doctor_id))
        )

        if not doctor_result.get(
            "success"
        ):

            return {
                "success": False,
                "message": (
                    "Doctor information could "
                    "not be retrieved."
                ),
            }

        doctor = (
            doctor_result.get(
                "doctor"
            ) or {}
        )

        # ----------------------------------------------------
        # 6. NORMALIZE DOCTOR NAME
        # ----------------------------------------------------

        doctor_name = doctor.get(
            "full_name",
            "Doctor"
        )

        display_doctor_name = doctor_name

        if display_doctor_name.lower().startswith(
            "dr. "
        ):

            display_doctor_name = (
                display_doctor_name[4:]
            )

        elif display_doctor_name.lower().startswith(
            "dr "
        ):

            display_doctor_name = (
                display_doctor_name[3:]
            )

        # ----------------------------------------------------
        # 7. CHECK DOCTOR AVAILABILITY
        # ----------------------------------------------------

        if not doctor.get(
            "is_available",
            True
        ):

            return {
                "success": False,
                "message": (
                    f"Dr. {display_doctor_name} "
                    "is currently unavailable."
                ),
            }

        # ----------------------------------------------------
        # 8. CHECK AVAILABLE DAYS
        # ----------------------------------------------------

        available_days = (
            doctor.get(
                "available_days"
            ) or []
        )

        requested_day = new_date.strftime(
            "%A"
        )

        if isinstance(
            available_days,
            str
        ):

            available_days = [
                day.strip()
                for day in available_days.split(",")
                if day.strip()
            ]

        elif not isinstance(
            available_days,
            list
        ):

            try:
                available_days = list(
                    available_days
                )
            except TypeError:
                available_days = []

        normalized_days = [
            str(day)
            .strip()
            .lower()
            for day in available_days
        ]

        if normalized_days:

            if requested_day.lower() not in normalized_days:

                available_days_text = ", ".join(
                    str(day)
                    for day in available_days
                )

                return {
                    "success": False,
                    "message": (
                        f"Dr. {display_doctor_name} "
                        f"is not available on "
                        f"{requested_day}. "
                        f"Available days: "
                        f"{available_days_text}."
                    ),
                }

        # ----------------------------------------------------
        # 9. CHECK WORKING HOURS
        # ----------------------------------------------------

        available_time = doctor.get(
            "available_time"
        )

        start_time, end_time = (
            _parse_available_time(
                available_time
            )
        )

        if start_time and end_time:

            if not (
                start_time
                <= new_time
                <= end_time
            ):

                start_text = (
                    start_time
                    .strftime("%I:%M %p")
                    .lstrip("0")
                )

                end_text = (
                    end_time
                    .strftime("%I:%M %p")
                    .lstrip("0")
                )

                return {
                    "success": False,
                    "message": (
                        f"Dr. {display_doctor_name} "
                        f"is available from "
                        f"{start_text} to "
                        f"{end_text} on "
                        f"{requested_day}."
                    ),
                }

        # ----------------------------------------------------
        # 10. CHECK NEW SLOT
        # ----------------------------------------------------

        existing_result = (
            supabase
            .table("appointments")
            .select("id")
            .eq(
                "doctor_id",
                str(doctor_id)
            )
            .eq(
                "appointment_date",
                new_date.isoformat()
            )
            .eq(
                "appointment_time",
                new_time.isoformat()
            )
            .eq(
                "status",
                "scheduled"
            )
            .execute()
        )

        # Ignore the appointment being rescheduled
        existing_appointments = [
            item
            for item in (
                existing_result.data
                or []
            )
            if str(item.get("id"))
            != str(appointment_id)
        ]

        if existing_appointments:

            return {
                "success": False,
                "message": (
                    "The new appointment slot "
                    "is already booked. "
                    "Please choose another time."
                ),
            }

        # ----------------------------------------------------
        # 11. UPDATE APPOINTMENT
        # ----------------------------------------------------

        update_result = (
            supabase
            .table("appointments")
            .update({
                "appointment_date": (
                    new_date.isoformat()
                ),
                "appointment_time": (
                    new_time.isoformat()
                ),
                "status": "scheduled",
            })
            .eq(
                "id",
                str(appointment_id)
            )
            .eq(
                "patient_id",
                patient_id
            )
            .execute()
        )

        if not update_result.data:

            return {
                "success": False,
                "message": (
                    "Unable to reschedule "
                    "the appointment."
                ),
            }

        updated_appointment = (
            update_result.data[0]
        )

        # ----------------------------------------------------
        # 12. SUCCESS
        # ----------------------------------------------------

        return {
            "success": True,
            "message": (
                "Appointment rescheduled successfully."
            ),
            "appointment": updated_appointment,
        }

    except Exception as e:

        print(
            "RESCHEDULE APPOINTMENT ERROR:",
            repr(e)
        )

        return {
            "success": False,
            "message": str(e),
        }  