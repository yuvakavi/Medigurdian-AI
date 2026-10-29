from __future__ import annotations

import io
import re
from dataclasses import dataclass, field, replace
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from pypdf import PdfReader


MAX_EXTRACTED_CHARS = 200_000
MIN_EMBEDDED_TEXT_CHARS = 20
MAX_OCR_PAGES = 50

STATUS_BELOW = "Below range"
STATUS_WITHIN = "Within range"
STATUS_ABOVE = "Above range"
STATUS_UNKNOWN = "Unable to determine"


class ReportExtractionError(Exception):
    """A safe, user-facing failure from report extraction."""

    def __init__(self, detail: str, status_code: int = 422):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ReportOcrUnavailableError(ReportExtractionError):
    def __init__(
        self,
        detail: str = (
            "OCR is not available on the server, so this image or scanned PDF "
            "cannot be read."
        ),
    ):
        super().__init__(detail, 503)


@dataclass(frozen=True)
class ExtractedValue:
    parameter: str
    value: str
    unit: str | None
    reference_min: str | None
    reference_max: str | None
    reference_text: str | None
    status: str
    explanation: str | None
    confidence: str
    needs_review: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "parameter": self.parameter,
            "value": self.value,
            "unit": self.unit,
            "reference_min": self.reference_min,
            "reference_max": self.reference_max,
            "reference_text": self.reference_text,
            "status": self.status,
            "explanation": self.explanation,
            "confidence": self.confidence,
            "needs_review": self.needs_review,
        }


@dataclass
class ParsedReport:
    values: list[ExtractedValue] = field(default_factory=list)
    uncertainties: list[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    text: str
    method: str
    ocr_used: bool
    ocr_confidence: float | None
    page_count: int
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Curated educational descriptions
#
# These are intentionally general educational statements, not interpretations.
# They contain no reference ranges and make no diagnosis.
# ---------------------------------------------------------------------------

TEST_DESCRIPTIONS = {
    "hemoglobin": "Hemoglobin is the oxygen-carrying protein in red blood cells. The result reflects the amount measured in this sample.",
    "haemoglobin": "Hemoglobin is the oxygen-carrying protein in red blood cells. The result reflects the amount measured in this sample.",
    "hematocrit": "Hematocrit describes the proportion of blood volume occupied by red blood cells in the sample.",
    "haematocrit": "Hematocrit describes the proportion of blood volume occupied by red blood cells in the sample.",
    "red blood cell count": "Red blood cells carry oxygen. This result is the number of red blood cells measured in the sample.",
    "rbc": "Red blood cells carry oxygen. This result is the number of red blood cells measured in the sample.",
    "white blood cell count": "White blood cells are part of the immune system. This result is the number measured in the sample.",
    "wbc": "White blood cells are part of the immune system. This result is the number measured in the sample.",
    "platelet count": "Platelets help blood clot. This result is the number of platelets measured in the sample.",
    "platelets": "Platelets help blood clot. This result is the number of platelets measured in the sample.",
    "mcv": "MCV describes the average size of red blood cells in the sample.",
    "mch": "MCH describes the average amount of hemoglobin in red blood cells in the sample.",
    "mchc": "MCHC describes the average concentration of hemoglobin in red blood cells in the sample.",
    "rdw": "RDW describes variation in the size of red blood cells in the sample.",
    "neutrophils": "Neutrophils are a type of white blood cell involved in the immune response. This result reflects the number or percentage measured.",
    "lymphocytes": "Lymphocytes are a type of white blood cell involved in the immune response. This result reflects the number or percentage measured.",
    "monocytes": "Monocytes are a type of white blood cell involved in the immune response. This result reflects the number or percentage measured.",
    "eosinophils": "Eosinophils are a type of white blood cell involved in the immune response. This result reflects the number or percentage measured.",
    "basophils": "Basophils are a type of white blood cell involved in the immune response. This result reflects the number or percentage measured.",
    "glucose": "Glucose is a sugar measured in the blood. Interpretation depends on whether the sample was fasting or random and on clinical context.",
    "fasting glucose": "Glucose is a sugar measured in the blood. A fasting result is interpreted in the context of the fasting state and clinical history.",
    "random glucose": "Glucose is a sugar measured in the blood. A random result is interpreted with the timing of the sample and clinical context.",
    "hba1c": "HbA1c estimates average blood glucose over the preceding weeks. Interpretation depends on the laboratory method and clinical context.",
    "creatinine": "Creatinine is a waste product filtered by the kidneys. The result is interpreted alongside kidney function and clinical context.",
    "bun": "Blood urea nitrogen is a waste product related to protein breakdown and kidney filtration. It is interpreted with clinical context.",
    "urea": "Urea is a waste product related to protein breakdown and kidney filtration. It is interpreted with clinical context.",
    "egfr": "eGFR is an estimate of kidney filtration calculated from a blood result and other factors. It is not a direct measurement of kidney function.",
    "sodium": "Sodium is an electrolyte involved in fluid balance and nerve and muscle function.",
    "potassium": "Potassium is an electrolyte involved in nerve, muscle and heart function.",
    "chloride": "Chloride is an electrolyte involved in fluid balance and acid-base balance.",
    "bicarbonate": "Bicarbonate is involved in the body's acid-base balance.",
    "calcium": "Calcium is a mineral involved in bone, nerve and muscle function. Interpretation can depend on albumin and clinical context.",
    "magnesium": "Magnesium is a mineral involved in nerve, muscle and enzyme function.",
    "phosphorus": "Phosphorus is a mineral involved in bone and energy metabolism.",
    "phosphate": "Phosphate is a mineral involved in bone and energy metabolism.",
    "alt": "ALT is an enzyme found mainly in the liver. The result is interpreted with other liver tests and clinical context.",
    "ast": "AST is an enzyme found in the liver and other tissues. The result is interpreted with other tests and clinical context.",
    "alkaline phosphatase": "Alkaline phosphatase is an enzyme found in several tissues, including the liver and bone. It is interpreted with clinical context.",
    "alp": "Alkaline phosphatase is an enzyme found in several tissues, including the liver and bone. It is interpreted with clinical context.",
    "bilirubin": "Bilirubin is a substance produced when red blood cells break down. It is interpreted with other liver and blood results.",
    "albumin": "Albumin is a protein made by the liver. The result is interpreted with nutrition, liver and kidney context.",
    "total protein": "Total protein measures the combined protein content of the sample. It is interpreted with albumin and other clinical information.",
    "cholesterol": "Cholesterol is a type of lipid measured in the blood. Results are interpreted with the full lipid panel and clinical context.",
    "total cholesterol": "Total cholesterol is a lipid measurement. It is interpreted with other lipid results and clinical context.",
    "ldl": "LDL cholesterol is a lipoprotein measurement. It is interpreted with the full lipid panel and clinical context.",
    "hdl": "HDL cholesterol is a lipoprotein measurement. It is interpreted with the full lipid panel and clinical context.",
    "triglycerides": "Triglycerides are a type of lipid measured in the blood. Results are interpreted with the full lipid panel and clinical context.",
    "tsh": "TSH is a hormone involved in thyroid regulation. It is interpreted with thyroid hormone results and clinical context.",
    "free t4": "Free T4 is a thyroid hormone measurement. It is interpreted with TSH and clinical context.",
    "t4": "T4 is a thyroid hormone measurement. It is interpreted with TSH and clinical context.",
    "free t3": "Free T3 is a thyroid hormone measurement. It is interpreted with TSH and clinical context.",
    "t3": "T3 is a thyroid hormone measurement. It is interpreted with TSH and clinical context.",
    "vitamin d": "Vitamin D is measured to assess vitamin D status. Interpretation depends on the form tested and clinical context.",
    "vitamin b12": "Vitamin B12 is a vitamin involved in blood and nerve function. Interpretation depends on the laboratory method and clinical context.",
    "ferritin": "Ferritin is a protein that stores iron. It is interpreted with iron studies and clinical context.",
    "iron": "Iron is a mineral involved in hemoglobin production. It is interpreted with other iron studies and clinical context.",
    "crp": "C-reactive protein is a marker associated with inflammation. It is not specific to one condition and is interpreted with clinical context.",
    "esr": "Erythrocyte sedimentation rate is a nonspecific marker associated with inflammation. It is interpreted with clinical context.",
    "psa": "PSA is a protein produced by the prostate. Results are interpreted with age, prostate examination and clinical context.",
    "inr": "INR is a measure of how long blood takes to clot compared with a standard. It is interpreted with clinical context.",
    "pt": "Prothrombin time is a clotting test. It is interpreted with other clotting results and clinical context.",
    "aptt": "APTT is a clotting test. It is interpreted with other clotting results and clinical context.",
    "urine protein": "Urine protein measures protein present in a urine sample. It is interpreted with other urine and kidney findings.",
    "specific gravity": "Specific gravity describes the concentration of a urine sample. It is interpreted with hydration and clinical context.",
    "urine ph": "Urine pH describes the acidity or alkalinity of a urine sample. It is interpreted with other urine findings.",
}

_ALIASES = sorted(TEST_DESCRIPTIONS, key=len, reverse=True)


def normalize_test_name(name: str) -> str:
    value = str(name or "").lower()
    value = value.replace("µ", "u").replace("μ", "u")
    value = re.sub(r"[^a-z0-9%]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def describe_test(name: str) -> str | None:
    normalized = normalize_test_name(name)
    if not normalized:
        return None

    if normalized in TEST_DESCRIPTIONS:
        return TEST_DESCRIPTIONS[normalized]

    for alias in _ALIASES:
        if normalized == alias:
            return TEST_DESCRIPTIONS[alias]
        if normalized.startswith(alias + " "):
            return TEST_DESCRIPTIONS[alias]
        if normalized.endswith(" " + alias):
            return TEST_DESCRIPTIONS[alias]
    return None


# ---------------------------------------------------------------------------
# Value parsing
# ---------------------------------------------------------------------------

_RANGE_RE = re.compile(
    r"(?<![\d.])(\d+(?:[.,]\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:[.,]\d+)?)(?![\d.-])",
    re.IGNORECASE,
)
_LT_RE = re.compile(r"(?:<=|≤|<)\s*(\d+(?:[.,]\d+)?)")
_GT_RE = re.compile(r"(?:>=|≥|>)\s*(\d+(?:[.,]\d+)?)")
_VALUE_RE = re.compile(r"^\s*([<>]?\s*-?\d+(?:[.,]\d+)?)\s*(.*)$")
_GENERAL_RESULT_RE = re.compile(
    r"^\s*(?P<name>[A-Za-z][A-Za-z0-9 ,./%()'+\-]{1,80}?)\s+"
    r"(?P<value>[<>]?\s*-?\d+(?:[.,]\d+)?)\s+(?P<rest>.+)$"
)

_HEADER_WORDS = {
    "test",
    "test name",
    "parameter",
    "investigation",
    "result",
    "results",
    "value",
    "values",
    "unit",
    "units",
    "reference",
    "reference range",
    "reference interval",
    "normal range",
    "bio reference",
    "biological reference",
}
_SKIP_PREFIXES = (
    "patient",
    "name",
    "age",
    "sex",
    "gender",
    "date",
    "report date",
    "collected",
    "reported",
    "sample",
    "specimen",
    "doctor",
    "dr ",
    "address",
    "phone",
    "tel",
    "email",
    "lab no",
    "accession",
    "barcode",
    "method",
    "note",
    "comment",
    "interpretation",
    "disclaimer",
    "end of report",
    "page ",
    "http",
    "www.",
)
_DATE_RE = re.compile(
    r"\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b"
)


def _clean_line(line: str) -> str:
    value = str(line or "").replace("\t", "  ")
    value = value.replace("\u00a0", " ").replace("\u202f", " ")
    value = re.sub(r"[ \u200b]+", " ", value)
    return value.strip()


def _looks_like_date(value: str) -> bool:
    return bool(_DATE_RE.fullmatch(str(value or "").strip()))


def _clean_test_name(name: str) -> str | None:
    value = re.sub(r"\s+", " ", str(name or "")).strip(" .:-|")
    if len(value) < 2 or len(value) > 100:
        return None
    if not re.search(r"[A-Za-z]", value):
        return None

    normalized = normalize_test_name(value)
    if normalized in _HEADER_WORDS:
        return None
    if any(normalized.startswith(prefix) for prefix in _SKIP_PREFIXES):
        return None
    if re.match(r"^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$", value):
        return None
    return value


def _numeric(text: str | None) -> Decimal | None:
    if text is None:
        return None
    try:
        return Decimal(str(text).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


def _without_dates(fragment: str) -> str:
    return _DATE_RE.sub(" ", str(fragment or ""))


def _extract_reference(fragment: str) -> tuple[str | None, str | None, str | None]:
    searchable = _without_dates(fragment)
    two_sided = _RANGE_RE.search(searchable)
    if two_sided:
        return (
            two_sided.group(1).replace(",", "."),
            two_sided.group(2).replace(",", "."),
            two_sided.group(0).strip(),
        )

    upper = _LT_RE.search(searchable)
    if upper:
        return (None, upper.group(1).replace(",", "."), upper.group(0).strip())

    lower = _GT_RE.search(searchable)
    if lower:
        return (lower.group(1).replace(",", "."), None, lower.group(0).strip())

    return (None, None, None)


def _status_for(
    value: str,
    reference_min: str | None,
    reference_max: str | None,
) -> str:
    if value.strip().startswith(("<", ">")):
        return STATUS_UNKNOWN

    numeric_value = _numeric(value)
    low = _numeric(reference_min)
    high = _numeric(reference_max)

    if numeric_value is None or (low is None and high is None):
        return STATUS_UNKNOWN
    if low is not None and numeric_value < low:
        return STATUS_BELOW
    if high is not None and numeric_value > high:
        return STATUS_ABOVE
    return STATUS_WITHIN


def _parse_fragment(
    name: str,
    fragment: str,
    *,
    explicit_columns: bool,
) -> ExtractedValue | None:
    cleaned_name = _clean_test_name(name)
    if not cleaned_name:
        return None

    match = _VALUE_RE.match(fragment)
    if not match:
        return None

    value = match.group(1).strip()
    if _looks_like_date(value):
        return None

    rest = match.group(2) or ""
    rest_without_dates = _without_dates(rest)
    reference_min, reference_max, reference_text = _extract_reference(fragment)

    range_match = _RANGE_RE.search(rest_without_dates)
    unit_part = rest_without_dates[: range_match.start()] if range_match else rest_without_dates
    if not range_match:
        lt_match = _LT_RE.search(rest_without_dates)
        gt_match = _GT_RE.search(rest_without_dates)
        first_bound = min(
            [m.start() for m in (lt_match, gt_match) if m is not None],
            default=None,
        )
        if first_bound is not None:
            unit_part = rest_without_dates[:first_bound]

    unit = unit_part.strip().strip("()[]{}:;,").strip()
    if (
        not unit
        or len(unit) > 30
        or re.search(r"\b(normal|reference|range|result|flag)\b", unit, re.I)
        or not re.search(r"[A-Za-z%µμ/^]", unit)
        or re.search(r"\s", unit)
    ):
        unit = None
    elif not re.fullmatch(r"[A-Za-z0-9%µμ/^.*×xX+\-\s]+", unit):
        unit = None

    status = _status_for(value, reference_min, reference_max)
    needs_review = status == STATUS_UNKNOWN

    if reference_text is None:
        needs_review = True
    if unit is None:
        needs_review = True

    if reference_text is not None and unit is not None:
        confidence = "high"
    elif explicit_columns or reference_text is not None:
        confidence = "medium"
    else:
        confidence = "medium"

    return ExtractedValue(
        parameter=cleaned_name,
        value=value,
        unit=unit,
        reference_min=reference_min,
        reference_max=reference_max,
        reference_text=reference_text,
        status=status,
        explanation=describe_test(cleaned_name),
        confidence=confidence,
        needs_review=needs_review,
    )


def _looks_like_result_line(line: str) -> bool:
    lower = line.lower().strip()
    if lower.startswith(_SKIP_PREFIXES):
        return False
    return bool(re.search(r"[A-Za-z]", line) and re.search(r"\d", line))


def _parse_line(line: str) -> ExtractedValue | None:
    columns = [
        column.strip()
        for column in re.split(r"\s{2,}|\t+|\s*\|\s*", line)
        if column.strip()
    ]

    if len(columns) >= 2:
        name = columns[0]
        for index in range(1, len(columns)):
            if _VALUE_RE.match(columns[index]):
                fragment = " ".join(columns[index:])
                parsed = _parse_fragment(
                    name,
                    fragment,
                    explicit_columns=True,
                )
                if parsed:
                    return parsed
                break

    colon = re.match(r"^\s*([^:]{2,100}):\s*(.+)$", line)
    if colon:
        parsed = _parse_fragment(
            colon.group(1),
            colon.group(2),
            explicit_columns=False,
        )
        if parsed:
            return parsed

    general = _GENERAL_RESULT_RE.match(line)
    if general:
        parsed = _parse_fragment(
            general.group("name"),
            f"{general.group('value')} {general.group('rest')}",
            explicit_columns=False,
        )
        if parsed and (parsed.unit is not None or parsed.reference_text is not None):
            return parsed

    lower = line.lower()
    for alias in _ALIASES:
        if not lower.startswith(alias):
            continue
        if len(line) <= len(alias) or line[len(alias)] not in " \t:-|,":
            continue
        original_name = line[: len(alias)].strip(" \t:-|,")
        fragment = line[len(alias) :].strip(" \t:-|,")
        parsed = _parse_fragment(original_name, fragment, explicit_columns=False)
        if parsed:
            return parsed

    return None


def parse_lab_values(
    text: str,
    *,
    ocr_used: bool = False,
    ocr_confidence: float | None = None,
) -> ParsedReport:
    """Parse only high-confidence lab rows and preserve printed values/units."""

    parsed = ParsedReport()
    seen: set[tuple[str, str, str | None, str | None]] = set()
    duplicate_check: dict[str, set[str]] = {}
    unparsed_result_lines = 0

    for raw_line in str(text or "").splitlines():
        line = _clean_line(raw_line)
        if not line or len(line) > 300:
            continue

        value = _parse_line(line)
        if value is None:
            if _looks_like_result_line(line):
                unparsed_result_lines += 1
            continue

        key = (
            normalize_test_name(value.parameter),
            value.value,
            value.unit,
            value.reference_text,
        )
        if key in seen:
            continue
        seen.add(key)

        duplicate_check.setdefault(normalize_test_name(value.parameter), set()).add(
            f"{value.value}|{value.unit or ''}"
        )
        parsed.values.append(value)

    for index, value in enumerate(parsed.values):
        distinct = duplicate_check.get(normalize_test_name(value.parameter), set())
        if len(distinct) > 1:
            parsed.values[index] = ExtractedValue(
                parameter=value.parameter,
                value=value.value,
                unit=value.unit,
                reference_min=value.reference_min,
                reference_max=value.reference_max,
                reference_text=value.reference_text,
                status=value.status,
                explanation=value.explanation,
                confidence="low",
                needs_review=True,
            )
            message = (
                f"Multiple different values were found for {value.parameter}. "
                "Verify the original report before relying on this row."
            )
            if message not in parsed.uncertainties:
                parsed.uncertainties.append(message)

    if ocr_used:
        for index, value in enumerate(parsed.values):
            parsed.values[index] = replace(
                value,
                confidence="medium" if value.confidence == "high" else value.confidence,
                needs_review=True,
            )
        parsed.uncertainties.append(
            "Text was extracted with OCR. Verify punctuation, decimal points, "
            "units and reference ranges against the original document."
        )
        if ocr_confidence is not None and ocr_confidence < 0.75:
            parsed.uncertainties.append(
                "OCR confidence was low for at least part of this document. "
                "Manual review is recommended."
            )

    if not parsed.values:
        parsed.uncertainties.append(
            "No structured laboratory values were detected. The report may use "
            "a layout this extractor does not recognize, or the relevant text "
            "may be unreadable."
        )
    elif unparsed_result_lines >= 2:
        parsed.uncertainties.append(
            "Some lines containing numbers could not be parsed confidently and "
            "were not included. Check the original report for those items."
        )

    for value in parsed.values:
        if value.reference_text is None:
            parsed.uncertainties.append(
                f"No printed reference range was found for {value.parameter}. "
                "No generic range was substituted."
            )
        if value.unit is None:
            parsed.uncertainties.append(
                f"No unit was printed for {value.parameter}."
            )

    # Keep the payload bounded and avoid repeating the same warning dozens of times.
    parsed.uncertainties = list(dict.fromkeys(parsed.uncertainties))[:30]
    return parsed


# ---------------------------------------------------------------------------
# PDF and OCR extraction
# ---------------------------------------------------------------------------

class RapidOcrEngine:
    """Self-contained OCR engine using RapidOCR and PyMuPDF-style rendering."""

    def __init__(self):
        self._engine = None

    def is_available(self) -> bool:
        try:
            from rapidocr_onnxruntime import RapidOCR  # noqa: F401
            from PIL import Image  # noqa: F401
            import numpy  # noqa: F401
            import pypdfium2  # noqa: F401
        except Exception:
            return False
        return True

    def _get_engine(self):
        if self._engine is not None:
            return self._engine

        if not self.is_available():
            raise ReportOcrUnavailableError()

        try:
            from rapidocr_onnxruntime import RapidOCR

            self._engine = RapidOCR()
            return self._engine
        except Exception as exc:
            raise ReportOcrUnavailableError(
                "OCR could not be initialized on the server."
            ) from exc

    @staticmethod
    def _text_and_confidence(result: Any) -> tuple[str, float | None]:
        if not result:
            return ("", None)

        lines: list[str] = []
        scores: list[float] = []
        for item in result:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            text = str(item[1] or "").strip()
            if text:
                lines.append(text)
            if len(item) >= 3:
                try:
                    scores.append(float(item[2]))
                except (TypeError, ValueError):
                    pass

        confidence = sum(scores) / len(scores) if scores else None
        return ("\n".join(lines), confidence)

    def extract_image(self, content: bytes) -> tuple[str, float | None]:
        from PIL import Image
        import numpy as np

        try:
            with Image.open(io.BytesIO(content)) as image:
                rgb = image.convert("RGB")
                array = np.array(rgb)
        except Exception as exc:
            raise ReportExtractionError(
                "The image could not be opened for text extraction."
            ) from exc

        try:
            result, _ = self._get_engine()(array)
        except ReportOcrUnavailableError:
            raise
        except Exception as exc:
            raise ReportExtractionError(
                "OCR could not read this image."
            ) from exc

        text, confidence = self._text_and_confidence(result)
        return (text, confidence)

    def extract_pdf(self, content: bytes) -> tuple[str, float | None, int]:
        try:
            import pypdfium2 as pdfium
        except Exception as exc:
            raise ReportOcrUnavailableError() from exc

        try:
            document = pdfium.PdfDocument(content)
        except Exception as exc:
            raise ReportExtractionError(
                "The PDF could not be opened for OCR."
            ) from exc

        page_count = len(document)
        texts: list[str] = []
        scores: list[float] = []

        try:
            for index, page in enumerate(document):
                if index >= MAX_OCR_PAGES:
                    break
                try:
                    bitmap = page.render(scale=2)
                    image = bitmap.to_pil().convert("RGB")
                    import numpy as np

                    result, _ = self._get_engine()(np.array(image))
                    text, confidence = self._text_and_confidence(result)
                    if text:
                        texts.append(text)
                    if confidence is not None:
                        scores.append(confidence)
                finally:
                    try:
                        page.close()
                    except Exception:
                        pass
        finally:
            try:
                document.close()
            except Exception:
                pass

        confidence = sum(scores) / len(scores) if scores else None
        return ("\n\n".join(texts), confidence, page_count)


def _extract_pdf_text(content: bytes) -> tuple[str, int]:
    try:
        reader = PdfReader(io.BytesIO(content))
    except Exception as exc:
        raise ReportExtractionError(
            "The PDF could not be read. It may be damaged or password-protected."
        ) from exc

    if reader.is_encrypted:
        raise ReportExtractionError(
            "This PDF is password-protected and cannot be read."
        )

    texts: list[str] = []
    try:
        for page in reader.pages:
            texts.append(page.extract_text() or "")
    except Exception as exc:
        raise ReportExtractionError(
            "Text could not be extracted from this PDF."
        ) from exc

    return ("\n".join(texts), len(reader.pages))


def _truncate_text(text: str) -> tuple[str, bool]:
    clean = str(text or "").strip()
    if len(clean) <= MAX_EXTRACTED_CHARS:
        return (clean, False)
    return (clean[:MAX_EXTRACTED_CHARS], True)


def extract_report_content(
    content: bytes,
    file_name: str,
    *,
    ocr_engine: Any | None = None,
) -> ExtractionResult:
    """Extract text from a PDF or image, using OCR only when needed."""

    extension = Path(str(file_name or "")).suffix.lower()
    engine = ocr_engine or RapidOcrEngine()

    if extension == ".pdf":
        embedded, page_count = _extract_pdf_text(content)
        embedded = embedded.strip()

        if len(embedded) >= MIN_EMBEDDED_TEXT_CHARS:
            text, truncated = _truncate_text(embedded)
            warnings = []
            if truncated:
                warnings.append(
                    "Extracted text was very long and was truncated for storage."
                )
            return ExtractionResult(
                text=text,
                method="pdf_text",
                ocr_used=False,
                ocr_confidence=None,
                page_count=page_count,
                warnings=warnings,
            )

        try:
            ocr_text, confidence, ocr_pages = engine.extract_pdf(content)
        except ReportOcrUnavailableError:
            if embedded:
                return ExtractionResult(
                    text=embedded,
                    method="pdf_text",
                    ocr_used=False,
                    ocr_confidence=None,
                    page_count=page_count,
                    warnings=[
                        "This PDF had very little embedded text and OCR is not "
                        "available. Verify the extracted values against the original."
                    ],
                )
            raise

        if not ocr_text.strip():
            raise ReportExtractionError(
                "No readable text was found in this PDF, including with OCR."
            )

        text, truncated = _truncate_text(ocr_text)
        warnings = [
            "This PDF had little or no embedded text, so OCR was used. "
            "Verify the values against the original document."
        ]
        if ocr_pages > MAX_OCR_PAGES:
            warnings.append(
                f"Only the first {MAX_OCR_PAGES} pages were processed with OCR."
            )
        if truncated:
            warnings.append(
                "Extracted text was very long and was truncated for storage."
            )
        return ExtractionResult(
            text=text,
            method="pdf_ocr",
            ocr_used=True,
            ocr_confidence=confidence,
            page_count=page_count,
            warnings=warnings,
        )

    if extension in {".png", ".jpg", ".jpeg"}:
        if not engine.is_available():
            raise ReportOcrUnavailableError()

        ocr_text, confidence = engine.extract_image(content)
        if not ocr_text.strip():
            raise ReportExtractionError(
                "No readable text was found in this image."
            )

        text, truncated = _truncate_text(ocr_text)
        warnings = [
            "This image was read with OCR. Verify the values against the "
            "original document."
        ]
        if truncated:
            warnings.append(
                "Extracted text was very long and was truncated for storage."
            )
        return ExtractionResult(
            text=text,
            method="image_ocr",
            ocr_used=True,
            ocr_confidence=confidence,
            page_count=1,
            warnings=warnings,
        )

    raise ReportExtractionError(
        "Only PDF, PNG, JPG and JPEG reports can be processed."
    )
