from fastapi import APIRouter

from app.schemas.symptom import (
    SymptomRequest,
    SymptomResponse
)

from app.services.symptom_service import (
    analyze
)


router = APIRouter(
    prefix="/symptoms",
    tags=["Symptoms"]
)


@router.post(
    "/analyze",
    response_model=SymptomResponse
)
def analyze_symptoms(
    request: SymptomRequest
):

    return analyze(
        request
    )