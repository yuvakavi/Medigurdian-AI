from pydantic import BaseModel


class MedicineResponse(BaseModel):

    id: int
    name: str
    generic_name: str | None
    category: str | None
    prescription_required: bool
    description: str | None

    model_config = {
        "from_attributes": True
    }