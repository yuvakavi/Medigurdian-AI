from datetime import datetime

from pydantic import BaseModel


class BillingResponse(BaseModel):

    id: int
    bill_number: str
    consultation_fee: float
    lab_fee: float
    medicine_fee: float
    facility_fee: float
    insurance_amount: float
    tax: float
    total_amount: float
    payment_status: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }