from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EmergencyRecordCreate(BaseModel):
    emergency_type: str
    symptoms: Optional[str] = None
    description: Optional[str] = None
    severity: str = "medium"
    location: Optional[str] = None
    contact_number: Optional[str] = None


class EmergencyRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    emergency_type: str
    symptoms: Optional[str] = None
    description: Optional[str] = None
    severity: str
    location: Optional[str] = None
    contact_number: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime