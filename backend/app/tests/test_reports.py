from datetime import date, datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.reports import ReportContext, get_report_context
from app.config import settings
from app.main import app
from app.services.report_service import (
    ReportDatabaseError,
    ReportError,
    ReportNotFoundError,
    ReportProcessingError,
    ReportStorageReadError,
    ReportStorageUnavailableError,
    SupabaseReportService,
    content_disposition,
    validate_report_file,
)


client = TestClient(app)

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 32


# ---------------------------------------------------------------------------
# In-memory report service used only by the API tests
# ---------------------------------------------------------------------------

class FakeReportService:
    def __init__(self):
        self.reports: dict[str, dict[str, dict]] = {}
        self.files: dict[str, tuple[str, str, bytes]] = {}
        self.fail_create: ReportError | None = None
        self.fail_list: ReportError | None = None
        self.fail_download: ReportError | None = None
        self.fail_delete: ReportError | None = None
        self.fail_analyze: ReportError | None = None

    def add_report(self, patient_id: str, title: str = "Stored report"):
        report_id = uuid4()
        report = {
            "id": report_id,
            "report_title": title,
            "report_type": "Medical report",
            "report_date": date.today(),
            "file_name": "stored.pdf",
            "file_type": "PDF",
            "status": "uploaded",
            "ai_explanation": None,
            "has_ai_explanation": False,
            "extracted_text": None,
            "uploaded_at": datetime.now(timezone.utc),
            "values": [],
            "analysis": None,
        }
        self.reports.setdefault(patient_id, {})[str(report_id)] = report
        self.files[str(report_id)] = ("stored.pdf", "application/pdf", PDF_BYTES)
        return report

    def list_reports(self, patient_id: str):
        if self.fail_list:
            raise self.fail_list

        return sorted(
            self.reports.get(patient_id, {}).values(),
            key=lambda report: report["uploaded_at"],
            reverse=True,
        )

    def get_report(self, patient_id: str, report_id: UUID):
        report = self.reports.get(patient_id, {}).get(str(report_id))

        if not report:
            raise ReportNotFoundError()

        return report

    def analyze_report(self, patient_id: str, report_id: UUID):
        if self.fail_analyze:
            raise self.fail_analyze

        report = self.get_report(patient_id, report_id)
        value = {
            "parameter": "Hemoglobin",
            "value": "13.5",
            "unit": "g/dL",
            "reference_min": "12.0",
            "reference_max": "16.0",
            "reference_text": "12.0 - 16.0",
            "status": "Within range",
            "explanation": "Hemoglobin carries oxygen in red blood cells.",
            "confidence": "high",
            "needs_review": False,
        }
        analysis = {
            "summary": "One structured result was extracted from this report.",
            "values": [value],
            "uncertainties": [],
            "questions": ["What do these results mean for me?"],
            "disclaimer": "This is not a diagnosis.",
            "source": "extraction_rules",
            "llm_status": "not_configured",
            "llm_message": "No live language model is configured.",
            "extraction_method": "pdf_text",
            "ocr_used": False,
            "ocr_confidence": None,
            "page_count": 1,
            "generated_at": datetime.now(timezone.utc),
        }
        report.update(
            {
                "status": "analyzed",
                "ai_explanation": analysis["summary"],
                "has_ai_explanation": True,
                "extracted_text": "Hemoglobin 13.5 g/dL 12.0 - 16.0",
                "values": [value],
                "analysis": analysis,
            }
        )
        return report

    def create_report(self, patient_id, upload, title, report_date):
        if self.fail_create:
            raise self.fail_create

        report_id = uuid4()
        report = {
            "id": report_id,
            "report_title": title,
            "report_type": "Medical report",
            "report_date": report_date,
            "file_name": upload.file_name,
            "file_type": upload.file_type,
            "status": "uploaded",
            "ai_explanation": None,
            "has_ai_explanation": False,
            "extracted_text": None,
            "uploaded_at": datetime.now(timezone.utc),
            "values": [],
            "analysis": None,
        }
        self.reports.setdefault(patient_id, {})[str(report_id)] = report
        self.files[str(report_id)] = (
            upload.file_name,
            upload.content_type,
            upload.content,
        )
        return report

    def get_download(self, patient_id: str, report_id: UUID):
        if self.fail_download:
            raise self.fail_download

        report = self.reports.get(patient_id, {}).get(str(report_id))

        if not report:
            raise ReportNotFoundError()

        file_data = self.files.get(str(report_id))

        if not file_data:
            raise ReportNotFoundError("Report file not found.")

        return report, file_data[2]

    def delete_report(self, patient_id: str, report_id: UUID):
        if self.fail_delete:
            raise self.fail_delete

        report = self.reports.get(patient_id, {}).pop(str(report_id), None)

        if not report:
            raise ReportNotFoundError()

        self.files.pop(str(report_id), None)


@pytest.fixture(autouse=True)
def reset_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def use_context(patient_id: str = "patient-a", service: FakeReportService | None = None):
    service = service or FakeReportService()
    app.dependency_overrides[get_report_context] = lambda: ReportContext(
        patient_id=patient_id,
        service=service,
    )
    return service


def upload_pdf(
    patient_id: str = "patient-a",
    service: FakeReportService | None = None,
    *,
    title: str | None = "Blood work",
    report_date: str | None = None,
    filename: str = "blood-work.pdf",
    content: bytes = PDF_BYTES,
    content_type: str = "application/pdf",
):
    fake = use_context(patient_id, service)
    data = {}

    if title is not None:
        data["title"] = title

    if report_date is not None:
        data["report_date"] = report_date

    response = client.post(
        "/api/reports/upload",
        data=data,
        files={"file": (filename, content, content_type)},
    )
    return response, fake


# ---------------------------------------------------------------------------
# Registration and authentication
# ---------------------------------------------------------------------------

def test_reports_routes_are_registered_once():
    paths = client.get("/openapi.json").json()["paths"]

    assert "post" in paths["/api/reports/upload"]
    assert "get" in paths["/api/reports/me"]
    assert "get" in paths["/api/reports/{report_id}"]
    assert "post" in paths["/api/reports/{report_id}/analyze"]
    assert "get" in paths["/api/reports/{report_id}/download"]
    assert "delete" in paths["/api/reports/{report_id}"]


def test_unauthenticated_upload_and_download_are_rejected():
    upload = client.post(
        "/api/reports/upload",
        files={"file": ("blood.pdf", PDF_BYTES, "application/pdf")},
    )
    download = client.get(f"/api/reports/{uuid4()}/download")
    listing = client.get("/api/reports/me")
    analyze = client.post(f"/api/reports/{uuid4()}/analyze")

    assert upload.status_code == 401
    assert download.status_code == 401
    assert listing.status_code == 401
    assert analyze.status_code == 401


# ---------------------------------------------------------------------------
# Upload validation and success
# ---------------------------------------------------------------------------

def test_valid_pdf_upload_returns_safe_metadata_without_storage_path():
    response, _ = upload_pdf(report_date=date.today().isoformat())

    assert response.status_code == 201
    body = response.json()
    assert body["report_title"] == "Blood work"
    assert body["file_name"] == "blood-work.pdf"
    assert body["file_type"] == "PDF"
    assert body["status"] == "uploaded"
    assert body["ai_explanation"] is None
    assert body["has_ai_explanation"] is False
    assert body["values"] == []
    assert "file_path" not in body
    assert "patient_id" not in body
    assert UUID(body["id"])


def test_valid_png_upload_and_title_fallback_to_filename():
    response, _ = upload_pdf(
        title=None,
        filename="scan.png",
        content=PNG_BYTES,
        content_type="image/png",
    )

    assert response.status_code == 201
    assert response.json()["report_title"] == "scan"
    assert response.json()["file_type"] == "PNG image"


def test_upload_rejects_unsupported_extension():
    response, _ = upload_pdf(filename="notes.txt", content=b"hello")

    assert response.status_code == 400
    assert "PDF, PNG, JPG and JPEG" in response.json()["detail"]


def test_upload_rejects_content_that_does_not_match_extension():
    response, _ = upload_pdf(
        filename="blood.pdf",
        content=PNG_BYTES,
        content_type="application/pdf",
    )

    assert response.status_code == 400
    assert "does not match" in response.json()["detail"]


def test_upload_rejects_unverifiable_content():
    response, _ = upload_pdf(
        filename="blood.pdf",
        content=b"not really a pdf",
        content_type="application/pdf",
    )

    assert response.status_code == 400
    assert "could not be verified" in response.json()["detail"]


def test_upload_rejects_declared_content_type_mismatch():
    response, _ = upload_pdf(
        filename="blood.pdf",
        content=PDF_BYTES,
        content_type="text/plain",
    )

    assert response.status_code == 400
    assert "content type" in response.json()["detail"]


def test_upload_rejects_future_report_date():
    future = (date.today() + timedelta(days=1)).isoformat()
    response, _ = upload_pdf(report_date=future)

    assert response.status_code == 400
    assert "future" in response.json()["detail"]


def test_upload_enforces_size_limit(monkeypatch):
    monkeypatch.setattr(settings, "report_max_file_size_bytes", 32)
    response, _ = upload_pdf(content=b"%PDF-" + b"0" * 40)

    assert response.status_code == 413
    assert "smaller" in response.json()["detail"]


def test_upload_sanitizes_path_traversal_filename():
    response, _ = upload_pdf(filename="../../outside.pdf")

    assert response.status_code == 201
    assert response.json()["file_name"] == "outside.pdf"
    assert ".." not in response.json()["file_name"]


def test_upload_cleans_up_storage_when_metadata_insert_fails():
    class FailingDatabase:
        def table(self, _name):
            return self

        def insert(self, _metadata):
            return self

        def execute(self):
            raise RuntimeError("database unavailable")

    class FakeStorage:
        def __init__(self):
            self.uploaded = []
            self.removed = []

        def upload(self, path, _content, _options):
            self.uploaded.append(path)

        def remove(self, paths):
            self.removed.extend(paths)

    storage = FakeStorage()
    service = SupabaseReportService(
        db_client=FailingDatabase(),
        storage=storage,
        bucket="medical-reports",
        max_size_bytes=1024,
    )
    validated = validate_report_file(
        "blood.pdf",
        "application/pdf",
        PDF_BYTES,
        1024,
    )

    with pytest.raises(ReportDatabaseError):
        service.create_report(
            "patient-a",
            validated,
            "Blood work",
            date.today(),
        )

    assert len(storage.uploaded) == 1
    assert storage.removed == storage.uploaded


# ---------------------------------------------------------------------------
# Listing, details and ownership
# ---------------------------------------------------------------------------

def test_listing_is_scoped_to_the_authenticated_patient():
    service = FakeReportService()
    service.add_report("patient-a", "My report")
    service.add_report("patient-b", "Someone else's report")
    use_context("patient-a", service)

    response = client.get("/api/reports/me")

    assert response.status_code == 200
    assert [report["report_title"] for report in response.json()] == ["My report"]
    assert all("file_path" not in report for report in response.json())


def test_details_return_only_an_owned_report():
    service = FakeReportService()
    owned = service.add_report("patient-a", "Owned")
    other = service.add_report("patient-b", "Other")
    use_context("patient-a", service)

    owned_response = client.get(f"/api/reports/{owned['id']}")
    other_response = client.get(f"/api/reports/{other['id']}")

    assert owned_response.status_code == 200
    assert owned_response.json()["report_title"] == "Owned"
    assert other_response.status_code == 404
    assert other_response.json()["detail"] == "Report not found."


def test_missing_report_returns_not_found():
    use_context("patient-a", FakeReportService())

    response = client.get(f"/api/reports/{uuid4()}")

    assert response.status_code == 404


def test_analyze_returns_owned_structured_analysis():
    service = FakeReportService()
    report = service.add_report("patient-a", "Blood work")
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{report['id']}/analyze")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "analyzed"
    assert body["has_ai_explanation"] is True
    assert body["analysis"]["source"] == "extraction_rules"
    assert body["analysis"]["values"][0]["unit"] == "g/dL"
    assert body["analysis"]["values"][0]["status"] == "Within range"
    assert "file_path" not in body
    assert "patient_id" not in body


def test_analyze_rejects_another_patients_report():
    service = FakeReportService()
    other = service.add_report("patient-b")
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{other['id']}/analyze")

    assert response.status_code == 404


def test_analyze_reports_processing_failure_honestly():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_analyze = ReportProcessingError(
        "OCR is not available on the server.",
        503,
    )
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{report['id']}/analyze")

    assert response.status_code == 503
    assert "OCR" in response.json()["detail"]


def test_analyze_reports_database_failure():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_analyze = ReportDatabaseError("Unable to update this report.")
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{report['id']}/analyze")

    assert response.status_code == 500


def test_analyze_reports_storage_failure():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_analyze = ReportStorageReadError()
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{report['id']}/analyze")

    assert response.status_code == 502


def test_analyze_returns_conflict_while_already_processing():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_analyze = ReportProcessingError(
        "This report is already being analyzed.",
        409,
    )
    use_context("patient-a", service)

    response = client.post(f"/api/reports/{report['id']}/analyze")

    assert response.status_code == 409


def test_download_returns_owned_file_with_safe_headers():
    service = FakeReportService()
    report = service.add_report("patient-a", "Download me")
    use_context("patient-a", service)

    response = client.get(f"/api/reports/{report['id']}/download")

    assert response.status_code == 200
    assert response.content == PDF_BYTES
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.headers["content-disposition"].startswith("attachment;")
    assert "stored.pdf" in response.headers["content-disposition"]
    assert response.headers["cache-control"] == "private, no-store"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_inline_download_is_available_for_preview():
    service = FakeReportService()
    report = service.add_report("patient-a")
    use_context("patient-a", service)

    response = client.get(
        f"/api/reports/{report['id']}/download?inline=true"
    )

    assert response.status_code == 200
    assert response.headers["content-disposition"].startswith("inline;")


def test_download_rejects_another_patients_report():
    service = FakeReportService()
    other = service.add_report("patient-b")
    use_context("patient-a", service)

    response = client.get(f"/api/reports/{other['id']}/download")

    assert response.status_code == 404
    assert response.content != PDF_BYTES


def test_download_missing_file_returns_not_found():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.files.pop(str(report["id"]))
    use_context("patient-a", service)

    response = client.get(f"/api/reports/{report['id']}/download")

    assert response.status_code == 404


def test_delete_is_owner_scoped_and_removes_the_report():
    service = FakeReportService()
    report = service.add_report("patient-a")
    other = service.add_report("patient-b")
    use_context("patient-a", service)

    denied = client.delete(f"/api/reports/{other['id']}")
    deleted = client.delete(f"/api/reports/{report['id']}")
    missing = client.delete(f"/api/reports/{report['id']}")

    assert denied.status_code == 404
    assert deleted.status_code == 200
    assert deleted.json()["report_id"] == str(report["id"])
    assert missing.status_code == 404
    assert str(report["id"]) not in service.reports["patient-a"]


# ---------------------------------------------------------------------------
# Failure handling
# ---------------------------------------------------------------------------

def test_storage_failure_during_upload_returns_503():
    service = FakeReportService()
    service.fail_create = ReportStorageUnavailableError()
    response, _ = upload_pdf(service=service)

    assert response.status_code == 503
    assert "storage" in response.json()["detail"].lower()


def test_database_failure_during_upload_returns_500():
    service = FakeReportService()
    service.fail_create = ReportDatabaseError()
    response, _ = upload_pdf(service=service)

    assert response.status_code == 500
    assert "save" in response.json()["detail"].lower()


def test_listing_failure_returns_500():
    service = FakeReportService()
    service.fail_list = ReportDatabaseError("Unable to load your reports.")
    use_context("patient-a", service)

    response = client.get("/api/reports/me")

    assert response.status_code == 500


def test_storage_failure_during_download_returns_502():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_download = ReportStorageReadError()
    use_context("patient-a", service)

    response = client.get(f"/api/reports/{report['id']}/download")

    assert response.status_code == 502


def test_delete_failure_returns_500():
    service = FakeReportService()
    report = service.add_report("patient-a")
    service.fail_delete = ReportDatabaseError()
    use_context("patient-a", service)

    response = client.delete(f"/api/reports/{report['id']}")

    assert response.status_code == 500


# ---------------------------------------------------------------------------
# Serialization and response safety
# ---------------------------------------------------------------------------

def test_ai_explanation_is_only_returned_when_present():
    base = {
        "id": uuid4(),
        "report_title": "Report",
        "report_type": "Medical report",
        "report_date": date.today(),
        "file_name": "report.pdf",
        "status": "uploaded",
        "created_at": datetime.now(timezone.utc),
    }

    no_ai = SupabaseReportService._serialize(
        {**base, "ai_analysis": None, "extracted_text": "text"}
    )
    with_ai = SupabaseReportService._serialize(
        {**base, "ai_analysis": "A generated explanation", "extracted_text": "text"},
        include_extracted_text=True,
    )

    assert no_ai["ai_explanation"] is None
    assert no_ai["has_ai_explanation"] is False
    assert no_ai["extracted_text"] is None
    assert with_ai["ai_explanation"] == "A generated explanation"
    assert with_ai["has_ai_explanation"] is True
    assert with_ai["extracted_text"] == "text"


def test_download_and_delete_select_the_private_file_path():
    class Result:
        def __init__(self, data):
            self.data = data

    class FakeQuery:
        def __init__(self, db, operation="select"):
            self.db = db
            self.operation = operation
            self.columns = None
            self.filters = []

        def select(self, columns):
            self.operation = "select"
            self.columns = columns
            return self

        def delete(self):
            self.operation = "delete"
            return self

        def eq(self, key, value):
            self.filters.append((key, value))
            return self

        def limit(self, _value):
            return self

        def execute(self):
            self.db.calls.append((self.operation, self.columns))

            if self.operation == "select" and self.columns == "id":
                return Result([])

            if self.operation == "select":
                return Result(
                    [
                        {
                            "id": uuid4(),
                            "file_name": "stored.pdf",
                            "file_path": "patient-a/object.pdf",
                        }
                    ]
                )

            return Result([])

    class FakeDatabase:
        def __init__(self):
            self.calls = []

        def table(self, _name):
            return FakeQuery(self)

    class FakeStorage:
        def __init__(self):
            self.removed = []

        def download(self, path):
            assert path == "patient-a/object.pdf"
            return PDF_BYTES

        def remove(self, paths):
            self.removed.extend(paths)

    database = FakeDatabase()
    storage = FakeStorage()
    service = SupabaseReportService(
        db_client=database,
        storage=storage,
        bucket="medical-reports",
    )
    report_id = uuid4()

    row, content = service.get_download("patient-a", report_id)
    service.delete_report("patient-a", report_id)

    assert content == PDF_BYTES
    assert row["file_name"] == "stored.pdf"
    assert any(
        operation == "select" and "file_path" in (columns or "")
        for operation, columns in database.calls
    )
    assert storage.removed == ["patient-a/object.pdf"]


def test_delete_fails_before_metadata_removal_when_storage_is_missing(monkeypatch):
    class Result:
        def __init__(self, data):
            self.data = data

    class Query:
        def __init__(self, db):
            self.db = db
            self.operation = "select"

        def select(self, _columns):
            self.operation = "select"
            return self

        def delete(self):
            self.operation = "delete"
            return self

        def eq(self, _key, _value):
            return self

        def limit(self, _value):
            return self

        def execute(self):
            if self.operation == "delete":
                self.db.deleted = True
                return Result([])
            return Result(
                [
                    {
                        "id": uuid4(),
                        "file_name": "stored.pdf",
                        "file_path": "patient-a/object.pdf",
                    }
                ]
            )

    class Database:
        def __init__(self):
            self.deleted = False

        def table(self, _name):
            return Query(self)

    database = Database()
    monkeypatch.setattr(settings, "supabase_service_role_key", "")
    service = SupabaseReportService(
        db_client=database,
        storage=None,
        bucket="medical-reports",
    )

    with pytest.raises(ReportStorageUnavailableError):
        service.delete_report("patient-a", uuid4())

    assert database.deleted is False


def test_content_disposition_escapes_untrusted_filenames():
    header = content_disposition("attachment", '../../bad"name.pdf')

    assert "\r" not in header
    assert "\n" not in header
    assert "filename*=UTF-8''" in header
