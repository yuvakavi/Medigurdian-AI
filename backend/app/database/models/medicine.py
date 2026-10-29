from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    medicine_name: str
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    medicine_type: Optional[str] = None
    dosage: Optional[str] = None
    strength: Optional[str] = None
    route: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    uses: Optional[str] = None
    side_effects: Optional[str] = None
    warnings: Optional[str] = None
    contraindications: Optional[str] = None
    instructions: Optional[str] = None
    is_active: bool