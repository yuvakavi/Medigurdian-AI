from pydantic import BaseModel, Field


class SymptomRequest(BaseModel):

    age: int = Field(
        ge=0,
        le=120
    )

    gender: str

    symptoms: str = Field(
        min_length=2,
        max_length=3000
    )

    duration: str

    severity: str


class SymptomResponse(BaseModel):

    assessment: str
    urgency: str
    disclaimer: str