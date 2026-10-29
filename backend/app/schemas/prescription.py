from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PrescriptionCreate(BaseModel):
    doctor_id: UUID
    medicine_id: UUID
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    doctor_id: UUID
    medicine_id: UUID

    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None

    start_date: Optional[date] = None
    end_date: Optional[date] = None

    status: str

    created_at: datetime
    updated_at: datetime