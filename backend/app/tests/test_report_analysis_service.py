from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.services.report_explanation import ExplanationResult
from app.services.report_extraction import (
    ExtractionResult,
    ReportExtractionError,
)
from app.services.report_service import (
    ReportDatabaseError,
    ReportProcessingError,
    SupabaseReportService,
)


PDF_BYTES = b"%PDF-1.4\nsynthetic\n%%EOF\n"


class Result:
    def __init__(self, data):
        self.data = data


class Query:
    def __init__(self, db):
        self.db = db
        self.operation = None
        self.columns = None
        self.values = None
        self.returning = None
        self.filters = []

    def select(self, columns):
        if self.operation == "update":
            self.returning = columns
        else:
            self.operation = "select"
            self.columns = columns
        return self

    def update(self, values):
        self.operation = "update"
        self.values = values
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def limit(self, _value):
        return self

    def execute(self):
        if self.operation == "select":
            self.db.calls.append(("select", self.columns, list(self.filters)))
            if self.db.row is None:
                return Result([])
            return Result([dict(self.db.row)])

        if self.operation == "update":
            self.db.calls.append(("update", dict(self.values), list(self.filters)))
            if (
                self.db.fail_final_update
                and self.values.get("status") == "analyzed"
            ):
                raise RuntimeError("database unavailable")
            self.db.row.update(self.values)
            return Result([dict(self.db.row)])

        raise AssertionError("Unexpected database operation")


class FakeDatabase:
    def __init__(self, row):
        self.row = row
        self.calls = []
        self.fail_final_update = False

    def table(self, _name):
        return Query(self)


class FakeStorage:
    def __init__(self, content: bytes = PDF_BYTES, error: Exception | None = None):
        self.content = content
        self.error = error
        self.downloaded: list[str] = []

    def download(self, path):
        self.downloaded.append(path)
        if self.error:
            raise self.error
        return self.content


class FakeExtraction:
    def __init__(
        self,
        text: str = "Hemoglobin 13.5 g/dL 12.0 - 16.0",
        error: Exception | None = None,
    ):
        self.text = text
        self.error = error
        self.calls = []

    def extract(self, content: bytes, file_name: str):
        self.calls.append((content, file_name))
        if self.error:
            raise self.error
        return ExtractionResult(
            text=self.text,
            method="pdf_text",
            ocr_used=False,
            ocr_confidence=None,
            page_count=1,
        )


class FakeExplanation:
    def __init__(self):
        self.calls = 0

    def explain(self, extraction, parsed):
        self.calls += 1
        return ExplanationResult(
            summary="One structured result was extracted from this report.",
            questions=["What do these results mean for me?"],
            source="extraction_rules",
            llm_status="not_configured",
            llm_message="No live language model is configured.",
        )


def make_row(status: str = "uploaded", updated_at: datetime | None = None):
    return {
        "id": str(uuid4()),
        "file_name": "stored.pdf",
        "file_path": "patient-a/object.pdf",
        "status": status,
        "created_at": datetime.now(timezone.utc),
        "updated_at": updated_at or datetime.now(timezone.utc),
    }


def make_service(
    row: dict | None = None,
    *,
    storage: FakeStorage | None = None,
    extraction: FakeExtraction | None = None,
    explanation: FakeExplanation | None = None,
):
    database = FakeDatabase(row if row is not None else make_row())
    service = SupabaseReportService(
        db_client=database,
        storage=storage or FakeStorage(),
        bucket="medical-reports",
        extraction_service=extraction or FakeExtraction(),
        explanation_service=explanation or FakeExplanation(),
    )
    return service, database


def test_analysis_succeeds_and_stores_structured_values():
    service, database = make_service()
    report_id = uuid4()

    result = service.analyze_report("patient-a", report_id)

    assert result["status"] == "analyzed"
    assert result["has_ai_explanation"] is True
    assert result["analysis"]["values"][0]["unit"] == "g/dL"
    assert result["analysis"]["values"][0]["status"] == "Within range"
    assert result["extracted_text"] == "Hemoglobin 13.5 g/dL 12.0 - 16.0"
    assert "file_path" not in result
    assert database.row["status"] == "analyzed"
    stored = json.loads(database.row["ai_analysis"])
    assert stored["values"][0]["reference_text"] == "12.0 - 16.0"
    assert any(
        operation == "update" and values.get("status") == "processing"
        for operation, values, _filters in database.calls
    )
    assert any(
        operation == "update" and values.get("status") == "analyzed"
        for operation, values, _filters in database.calls
    )
    assert all(
        ("patient_id", "patient-a") in filters
        for _operation, _values, filters in database.calls
    )


def test_analysis_failure_marks_report_failed():
    extraction = FakeExtraction(
        error=ReportExtractionError("No readable text was found.", 422)
    )
    service, database = make_service(extraction=extraction)

    with pytest.raises(ReportProcessingError) as exc_info:
        service.analyze_report("patient-a", uuid4())

    assert exc_info.value.status_code == 422
    assert database.row["status"] == "failed"
    assert "ai_analysis" not in database.row


def test_storage_failure_marks_report_failed():
    service, database = make_service(
        storage=FakeStorage(error=RuntimeError("storage unavailable"))
    )

    with pytest.raises(Exception) as exc_info:
        service.analyze_report("patient-a", uuid4())

    assert getattr(exc_info.value, "status_code", None) == 502
    assert database.row["status"] == "failed"


def test_database_failure_during_analysis_is_reported():
    service, database = make_service()
    database.fail_final_update = True

    with pytest.raises(ReportDatabaseError):
        service.analyze_report("patient-a", uuid4())

    assert database.row["status"] == "failed"


def test_analysis_rejects_duplicate_processing():
    service, database = make_service(
        row=make_row(
            status="processing",
            updated_at=datetime.now(timezone.utc),
        )
    )
    storage = service._storage

    with pytest.raises(ReportProcessingError) as exc_info:
        service.analyze_report("patient-a", uuid4())

    assert exc_info.value.status_code == 409
    assert storage.downloaded == []
    assert not any(
        operation == "update"
        for operation, _values, _filters in database.calls
    )


def test_analysis_does_not_invent_values_when_none_are_parsed():
    extraction = FakeExtraction(text="Narrative report with no table.")
    explanation = FakeExplanation()
    service, _database = make_service(
        extraction=extraction,
        explanation=explanation,
    )

    result = service.analyze_report("patient-a", uuid4())

    assert result["analysis"]["values"] == []
    assert result["status"] == "analyzed"
    assert result["has_ai_explanation"] is True
    assert explanation.calls == 1
