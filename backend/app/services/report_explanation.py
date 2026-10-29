from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.llm.llama import llama_service
from app.services.report_extraction import (
    STATUS_ABOVE,
    STATUS_BELOW,
    STATUS_UNKNOWN,
    STATUS_WITHIN,
    ExtractedValue,
    ExtractionResult,
    ParsedReport,
)


DISCLAIMER = (
    "This explanation is for general information only. It is not a diagnosis "
    "or medical advice. Reference ranges vary by laboratory and clinical "
    "context. Discuss abnormal, uncertain or concerning results with a "
    "qualified clinician. Do not start, stop or change any medication based "
    "on this explanation."
)

_LLM_BANNED_PATTERNS = (
    r"\bdiagnos",
    r"\byou have\b",
    r"\byou may have\b",
    r"\bstart taking\b",
    r"\bstop taking\b",
    r"\bprescrib",
    r"\bmedication\b",
    r"\bmedicine\b",
    r"\bcure\b",
    r"\bhealthy\b",
    r"\bnormal\b",
    r"\bproves?\b",
    r"\bconfirms?\b",
    r"\brule out\b",
)


@dataclass
class ExplanationResult:
    summary: str
    questions: list[str]
    source: str
    llm_status: str
    llm_message: str


def _counts(values: list[ExtractedValue]) -> dict[str, int]:
    return {
        "total": len(values),
        "within": sum(value.status == STATUS_WITHIN for value in values),
        "below": sum(value.status == STATUS_BELOW for value in values),
        "above": sum(value.status == STATUS_ABOVE for value in values),
        "unknown": sum(value.status == STATUS_UNKNOWN for value in values),
    }


def build_deterministic_summary(
    values: list[ExtractedValue],
    uncertainties: list[str],
    extraction: ExtractionResult,
) -> str:
    counts = _counts(values)

    if not values:
        summary = (
            "No structured laboratory values could be detected from the "
            "readable text in this report. The document may use a layout this "
            "extractor does not recognize, or the relevant text may be "
            "unreadable."
        )
    else:
        summary = (
            f"The report contains {counts['total']} structured test "
            f"result{'s' if counts['total'] != 1 else ''}. "
            f"{counts['within']} are within the printed reference range, "
            f"{counts['below'] + counts['above']} are outside it, and "
            f"{counts['unknown']} could not be classified because a printed "
            "range was missing or the value was not numeric."
        )

        if counts["below"] or counts["above"]:
            summary += (
                " A value outside a printed reference range requires clinical "
                "context and does not by itself establish a diagnosis."
            )
        else:
            summary += (
                " This does not prove that the report is normal or that no "
                "health issue is present."
            )

    if extraction.ocr_used:
        summary += (
            " The document was read with OCR, so punctuation, decimal points, "
            "units and ranges should be checked against the original."
        )

    if uncertainties:
        summary += (
            f" {len(uncertainties)} item"
            f"{'s' if len(uncertainties) != 1 else ''} need manual review."
        )

    return summary


def build_deterministic_questions(values: list[ExtractedValue]) -> list[str]:
    questions = [
        "What do these results mean in the context of my symptoms and medical history?",
        "Do any of these results need to be repeated or checked with another test?",
        "Which reference ranges did this laboratory use?",
    ]

    if not values:
        questions.insert(
            0,
            "Can you review the original report with me because no structured values could be extracted?",
        )
    elif any(value.status in {STATUS_BELOW, STATUS_ABOVE} for value in values):
        questions.insert(
            0,
            "Which out-of-range values are most important for my situation?",
        )
        questions.append(
            "Are any of these out-of-range results urgent enough to need attention before my next routine visit?"
        )
    elif any(value.status == STATUS_UNKNOWN for value in values):
        questions.append(
            "Can you explain the reference range for the results that could not be classified?"
        )
    else:
        questions.append(
            "Are there other results in the original report that are not shown in this structured table?"
        )

    return questions[:5]


def _llm_payload(values: list[ExtractedValue]) -> list[dict[str, Any]]:
    return [
        {
            "test": value.parameter,
            "value": value.value,
            "unit": value.unit,
            "printed_reference_range": value.reference_text,
            "status": value.status,
            "educational_description": value.explanation,
        }
        for value in values
    ]


def build_llm_prompt(values: list[ExtractedValue]) -> str:
    data = json.dumps(_llm_payload(values), ensure_ascii=True)
    return f"""
You are writing a short, plain-English summary of a laboratory report for a patient.

Use only the structured data below. The data was extracted from the patient's report.

Strict rules:
- Do not add or change any numeric value, unit or reference range.
- Do not diagnose a disease or say that the patient has a condition.
- Do not recommend starting, stopping or changing medication.
- Do not claim that any result proves health or disease.
- Do not include any digits or numbers in your answer.
- Do not mention patient identity or personal information.
- If a value could not be classified, say that clinical context is needed.
- Keep the summary to 2-4 short sentences.
- Ask 2-5 short questions that the patient can ask a clinician.

Return JSON only, with exactly this shape:
{{"summary": "...", "questions": ["...", "..."]}}

Structured data:
{data}
""".strip()


def _parse_json_object(raw: str) -> dict[str, Any]:
    text = str(raw or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("No JSON object found.")
    return json.loads(text[start : end + 1])


def _validate_llm_output(raw: str) -> tuple[str, list[str]]:
    payload = _parse_json_object(raw)
    summary = payload.get("summary")
    questions = payload.get("questions")

    if not isinstance(summary, str):
        raise ValueError("Missing summary.")
    summary = re.sub(r"\s+", " ", summary).strip()
    if len(summary) < 30 or len(summary) > 1200:
        raise ValueError("Summary length is invalid.")
    if re.search(r"\d", summary):
        raise ValueError("Summary contains numeric values.")

    if not isinstance(questions, list) or not 1 <= len(questions) <= 6:
        raise ValueError("Questions are invalid.")

    clean_questions: list[str] = []
    for question in questions:
        if not isinstance(question, str):
            raise ValueError("Question is invalid.")
        question = re.sub(r"\s+", " ", question).strip()
        if len(question) < 5 or len(question) > 300:
            raise ValueError("Question length is invalid.")
        if re.search(r"\d", question):
            raise ValueError("Question contains numeric values.")
        clean_questions.append(question)

    combined = " ".join([summary, *clean_questions]).lower()
    if any(re.search(pattern, combined) for pattern in _LLM_BANNED_PATTERNS):
        raise ValueError("Model output contained a disallowed claim.")

    return summary, clean_questions


class ReportExplanationService:
    def __init__(
        self,
        *,
        llm: Any | None = None,
        enabled: bool | None = None,
        provider: str | None = None,
    ):
        self.llm = llm or llama_service
        self.enabled = (
            settings.report_analysis_llm_enabled if enabled is None else enabled
        )
        self.provider = settings.llm_provider if provider is None else provider

    def explain(
        self,
        extraction: ExtractionResult,
        parsed: ParsedReport,
    ) -> ExplanationResult:
        deterministic_summary = build_deterministic_summary(
            parsed.values,
            parsed.uncertainties,
            extraction,
        )
        deterministic_questions = build_deterministic_questions(parsed.values)

        if not self.enabled:
            return ExplanationResult(
                summary=deterministic_summary,
                questions=deterministic_questions,
                source="extraction_rules",
                llm_status="disabled",
                llm_message=(
                    "AI narrative generation is disabled. This explanation was "
                    "generated from the extracted values using deterministic rules."
                ),
            )

        if self.provider == "mock":
            return ExplanationResult(
                summary=deterministic_summary,
                questions=deterministic_questions,
                source="extraction_rules",
                llm_status="not_configured",
                llm_message=(
                    "No live language model is configured. This explanation was "
                    "generated from the extracted values using deterministic rules."
                ),
            )

        if not parsed.values:
            return ExplanationResult(
                summary=deterministic_summary,
                questions=deterministic_questions,
                source="extraction_rules",
                llm_status="not_needed",
                llm_message=(
                    "No structured values were available for a model-generated "
                    "summary. The explanation is based on the readable text only."
                ),
            )

        try:
            raw = self.llm.generate(build_llm_prompt(parsed.values))
            llm_summary, llm_questions = _validate_llm_output(raw)
        except Exception:
            return ExplanationResult(
                summary=deterministic_summary,
                questions=deterministic_questions,
                source="extraction_rules",
                llm_status="failed",
                llm_message=(
                    "The configured language model could not be used or its "
                    "output did not pass safety checks. This explanation was "
                    "generated from the extracted values using deterministic rules."
                ),
            )

        questions = list(
            dict.fromkeys([*llm_questions, *deterministic_questions])
        )[:6]
        return ExplanationResult(
            summary=llm_summary,
            questions=questions,
            source="extraction_rules_plus_llm",
            llm_status="used",
            llm_message=(
                "A configured language model helped write the summary and "
                "questions using only the structured values shown. It did not "
                "add values, units, reference ranges or a diagnosis."
            ),
        )


def build_analysis_payload(
    extraction: ExtractionResult,
    parsed: ParsedReport,
    explanation: ExplanationResult,
) -> dict[str, Any]:
    uncertainties = list(
        dict.fromkeys([*parsed.uncertainties, *extraction.warnings])
    )[:40]

    return {
        "version": 1,
        "summary": explanation.summary,
        "values": [value.as_dict() for value in parsed.values],
        "uncertainties": uncertainties,
        "questions": explanation.questions,
        "disclaimer": DISCLAIMER,
        "source": explanation.source,
        "llm_status": explanation.llm_status,
        "llm_message": explanation.llm_message,
        "extraction_method": extraction.method,
        "ocr_used": extraction.ocr_used,
        "ocr_confidence": extraction.ocr_confidence,
        "page_count": extraction.page_count,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
