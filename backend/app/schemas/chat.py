from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChatSessionCreate(BaseModel):
    title: str = "New Chat"


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    title: str
    created_at: datetime
    updated_at: datetime