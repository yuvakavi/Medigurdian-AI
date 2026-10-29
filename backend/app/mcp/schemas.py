from datetime import date, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# =========================================================
# PATIENT PROFILE
# =========================================================

class PatientProfileInput(BaseModel):
    user_id: UUID


# =========================================================
# DOCTOR SEARCH
# =========================================================

class DoctorSearchInput(BaseModel):
    department: Optional[str] = None
    specialization: Optional[str] = None


# =========================================================
# DOCTOR DETAILS
# =========================================================

class DoctorDetailsInput(BaseModel):
    doctor_id: UUID


# =========================================================
# APPOINTMENT BOOKING
# =========================================================

class AppointmentToolInput(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = None


# =========================================================
# PATIENT APPOINTMENTS
# =========================================================

class PatientAppointmentsInput(BaseModel):
    user_id: UUID


# =========================================================
# BILLING
# =========================================================

class BillingInput(BaseModel):
    patient_id: UUID


# =========================================================
# NOTIFICATION
# =========================================================

class NotificationInput(BaseModel):
    patient_id: UUID
    message: str