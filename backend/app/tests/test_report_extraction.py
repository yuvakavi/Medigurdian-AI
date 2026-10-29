from __future__ import annotations

from io import BytesIO

import pytest
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app.services.report_explanation import (
    ReportExplanationService,
    build_deterministic_summary,
)
from app.services.report_extraction import (
    STATUS_ABOVE,
    STATUS_UNKNOWN,
    STATUS_WITHIN,
    ExtractionResult,
    ReportExtractionError,
    ReportOcrUnavailableError,
    extract_report_content,
    parse_lab_values,
)


def make_pdf(*lines: str) -> bytes:
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    font_ref = writer._add_object(font)
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref})}
    )

    escaped = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    commands = ["BT", "/F1 12 Tf", "72 720 Td"]
    for index, line in enumerate(escaped):
        if index:
            commands.append("0 -20 Td")
        commands.append(f"({line}) Tj")
    commands.append("ET")
    stream = DecodedStreamObject()
    stream.set_data("\n".join(commands).encode("latin-1"))
    page[NameObject("/Contents")] = writer._add_object(stream)

    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


class FakeOcr:
    def __init__(
        self,
        *,
        available: bool = True,
        pdf_text: str = "",
        image_text: str = "",
        confidence: float | None = 0.9,
        error: Exception | None = None,
    ):
        self.available = available
        self.pdf_text = pdf_text
        self.image_text = image_text
        self.confidence = confidence
        self.error = error
        self.calls: list[str] = []

    def is_available(self) -> bool:
        return self.available

    def extract_pdf(self, _content: bytes):
        self.calls.append("pdf")
        if self.error:
            raise self.error
        return (self.pdf_text, self.confidence, 1)

    def extract_image(self, _content: bytes):
        self.calls.append("image")
        if self.error:
            raise self.error
        return (self.image_text, self.confidence)


def test_text_pdf_extraction_uses_embedded_text():
    content = make_pdf(
        "Hemoglobin 13.5 g/dL 12.0 - 16.0",
        "Creatinine 1.4 mg/dL 0.6 - 1.2",
    )
    fake = FakeOcr()

    result = extract_report_content(content, "report.pdf", ocr_engine=fake)

    assert result.method == "pdf_text"
    assert result.ocr_used is False
    assert "Hemoglobin" in result.text
    assert fake.calls == []


def test_scanned_pdf_falls_back_to_ocr():
    content = make_pdf()
    fake = FakeOcr(pdf_text="Glucose 95 mg/dL 70 - 100")

    result = extract_report_content(content, "scan.pdf", ocr_engine=fake)

    assert result.method == "pdf_ocr"
    assert result.ocr_used is True
    assert result.ocr_confidence == 0.9
    assert "Glucose" in result.text
    assert fake.calls == ["pdf"]


def test_image_uses_ocr_and_marks_values_for_review():
    fake = FakeOcr(image_text="TSH 5.8 mIU/L 0.4 - 4.0")

    result = extract_report_content(b"image-bytes", "scan.png", ocr_engine=fake)
    parsed = parse_lab_values(
        result.text,
        ocr_used=result.ocr_used,
        ocr_confidence=result.ocr_confidence,
    )

    assert result.method == "image_ocr"
    assert parsed.values[0].unit == "mIU/L"
    assert parsed.values[0].status == STATUS_ABOVE
    assert parsed.values[0].needs_review is True
    assert any("OCR" in item for item in parsed.uncertainties)


def test_image_without_ocr_returns_honest_unavailable_error():
    fake = FakeOcr(available=False)

    with pytest.raises(ReportOcrUnavailableError) as exc_info:
        extract_report_content(b"image-bytes", "scan.png", ocr_engine=fake)

    assert exc_info.value.status_code == 503


def test_pdf_without_text_and_unavailable_ocr_fails():
    content = make_pdf()
    fake = FakeOcr(available=False, error=ReportOcrUnavailableError())

    with pytest.raises(ReportOcrUnavailableError):
        extract_report_content(content, "scan.pdf", ocr_engine=fake)


def test_invalid_pdf_is_rejected():
    with pytest.raises(ReportExtractionError):
        extract_report_content(b"not a pdf", "report.pdf", ocr_engine=FakeOcr())


def test_values_preserve_printed_units_and_ranges():
    parsed = parse_lab_values(
        """
        Hemoglobin: 13.5 g/dL (12.0 - 16.0)
        WBC  7.2  x10^3/uL  4.0 - 11.0
        Vitamin B12 450 pg/mL 200 - 900
        Sodium | 139 | mmol/L | 135 - 145
        """
    )

    by_name = {value.parameter: value for value in parsed.values}

    assert by_name["Hemoglobin"].value == "13.5"
    assert by_name["Hemoglobin"].unit == "g/dL"
    assert by_name["Hemoglobin"].reference_text == "12.0 - 16.0"
    assert by_name["WBC"].unit == "x10^3/uL"
    assert by_name["Vitamin B12"].unit == "pg/mL"
    assert by_name["Sodium"].unit == "mmol/L"
    assert all(value.status == STATUS_WITHIN for value in parsed.values)


def test_missing_reference_range_is_not_invented():
    parsed = parse_lab_values("Hemoglobin 13.5 g/dL")

    assert parsed.values[0].reference_min is None
    assert parsed.values[0].reference_max is None
    assert parsed.values[0].reference_text is None
    assert parsed.values[0].status == STATUS_UNKNOWN
    assert any("No printed reference range" in item for item in parsed.uncertainties)


def test_one_sided_range_is_preserved_and_used():
    parsed = parse_lab_values("TSH 5.8 mIU/L <5.0")

    assert parsed.values[0].reference_min is None
    assert parsed.values[0].reference_max == "5.0"
    assert parsed.values[0].reference_text == "<5.0"
    assert parsed.values[0].status == STATUS_ABOVE


def test_conflicting_values_are_flagged_for_review():
    parsed = parse_lab_values(
        """
        Hemoglobin 13.5 g/dL 12.0 - 16.0
        Hemoglobin 14.2 g/dL 12.0 - 16.0
        """
    )

    assert len(parsed.values) == 2
    assert all(value.needs_review for value in parsed.values)
    assert all(value.confidence == "low" for value in parsed.values)
    assert any("Multiple different values" in item for item in parsed.uncertainties)


def test_dates_are_not_used_as_reference_ranges():
    parsed = parse_lab_values(
        """
        Collected 2026-10-23
        Hemoglobin 13.5 g/dL
        """
    )

    assert len(parsed.values) == 1
    assert parsed.values[0].reference_text is None


def test_no_structured_values_is_reported_as_uncertainty():
    parsed = parse_lab_values("This is a narrative report with no table.")

    assert parsed.values == []
    assert any("No structured laboratory values" in item for item in parsed.uncertainties)


def test_deterministic_summary_does_not_claim_health():
    extraction = ExtractionResult(
        text="Hemoglobin 13.5 g/dL 12.0 - 16.0",
        method="pdf_text",
        ocr_used=False,
        ocr_confidence=None,
        page_count=1,
    )
    parsed = parse_lab_values(extraction.text)

    summary = build_deterministic_summary(parsed.values, [], extraction)

    assert "does not prove" in summary
    assert "health issue" in summary


class FakeLlm:
    def __init__(self, response: str):
        self.response = response
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return self.response


def _parsed_values():
    return parse_lab_values(
        "Hemoglobin 13.5 g/dL 12.0 - 16.0\nTSH 5.8 mIU/L 0.4 - 4.0"
    )


def test_llm_summary_is_used_only_after_safety_validation():
    llm = FakeLlm(
        '{"summary": "The report shows extracted laboratory values that need '
        'clinical context. Some values are outside the printed reference range.", '
        '"questions": ["Which result should I discuss first?"]}'
    )
    service = ReportExplanationService(llm=llm, enabled=True, provider="ollama")
    extraction = ExtractionResult(
        text="",
        method="pdf_text",
        ocr_used=False,
        ocr_confidence=None,
        page_count=1,
    )

    result = service.explain(extraction, _parsed_values())

    assert result.llm_status == "used"
    assert result.source == "extraction_rules_plus_llm"
    assert "clinical context" in result.summary
    assert len(llm.prompts) == 1


def test_llm_output_with_numbers_falls_back_safely():
    llm = FakeLlm(
        '{"summary": "Your hemoglobin is 13.5 and your TSH is 5.8.", '
        '"questions": ["What should I do?"]}'
    )
    service = ReportExplanationService(llm=llm, enabled=True, provider="ollama")
    extraction = ExtractionResult(
        text="",
        method="pdf_text",
        ocr_used=False,
        ocr_confidence=None,
        page_count=1,
    )

    result = service.explain(extraction, _parsed_values())

    assert result.llm_status == "failed"
    assert result.source == "extraction_rules"
    assert "structured test" in result.summary


def test_llm_output_with_diagnosis_falls_back_safely():
    llm = FakeLlm(
        '{"summary": "You may have a thyroid condition and should discuss treatment.", '
        '"questions": ["Should I start medication?"]}'
    )
    service = ReportExplanationService(llm=llm, enabled=True, provider="ollama")
    extraction = ExtractionResult(
        text="",
        method="pdf_text",
        ocr_used=False,
        ocr_confidence=None,
        page_count=1,
    )

    result = service.explain(extraction, _parsed_values())

    assert result.llm_status == "failed"
    assert "You may have" not in result.summary


def test_mock_provider_does_not_call_llm():
    class ExplodingLlm:
        def generate(self, _prompt: str) -> str:
            raise AssertionError("The mock provider must not be called.")

    service = ReportExplanationService(
        llm=ExplodingLlm(),
        enabled=True,
        provider="mock",
    )
    extraction = ExtractionResult(
        text="",
        method="pdf_text",
        ocr_used=False,
        ocr_confidence=None,
        page_count=1,
    )

    result = service.explain(extraction, _parsed_values())

    assert result.llm_status == "not_configured"
    assert result.source == "extraction_rules"
