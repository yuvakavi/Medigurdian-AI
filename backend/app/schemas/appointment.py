from datetime import date, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AppointmentCreate(BaseModel):
    doctor_id: UUID
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_date: date
    appointment_time: time
    reason: Optional[str] = None
    status: str
    notes: Optional[str] = None