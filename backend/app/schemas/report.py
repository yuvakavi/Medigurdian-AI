from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReportValueResponse(BaseModel):
    """A structured lab value, only returned when one actually exists."""

    parameter: str
    value: str
    unit: str | None = None
    reference_min: str | None = None
    reference_max: str | None = None
    reference_text: str | None = None
    status: str = "Unable to determine"
    explanation: str | None = None
    confidence: str | None = None
    needs_review: bool = False

    model_config = ConfigDict(from_attributes=True)


class ReportAnalysisResponse(BaseModel):
    """Evidence-grounded structured analysis stored with a report."""

    summary: str = ""
    values: list[ReportValueResponse] = Field(default_factory=list)
    uncertainties: list[str] = Field(default_factory=list)
    questions: list[str] = Field(default_factory=list)
    disclaimer: str | None = None
    source: str = "extraction_rules"
    llm_status: str = "not_configured"
    llm_message: str | None = None
    extraction_method: str | None = None
    ocr_used: bool = False
    ocr_confidence: float | None = None
    page_count: int | None = None
    generated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ReportResponse(BaseModel):
    """Patient-facing report metadata.

    Storage paths and other internal fields are deliberately absent.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    report_title: str
    report_type: str | None = None
    report_date: date | None = None
    file_name: str
    file_type: str | None = None
    status: str
    ai_explanation: str | None = None
    has_ai_explanation: bool = False
    extracted_text: str | None = None
    uploaded_at: datetime
    values: list[ReportValueResponse] = Field(default_factory=list)
    analysis: ReportAnalysisResponse | None = None
