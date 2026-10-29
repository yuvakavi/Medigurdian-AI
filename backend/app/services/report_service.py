from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

from supabase import create_client
from storage3.exceptions import StorageApiError

from app.config import settings
from app.services.report_explanation import (
    ReportExplanationService,
    build_analysis_payload,
)
from app.services.report_extraction import (
    ReportExtractionError,
    extract_report_content,
    parse_lab_values,
)


ALLOWED_EXTENSIONS = {
    ".pdf": ("application/pdf", "PDF"),
    ".png": ("image/png", "PNG image"),
    ".jpg": ("image/jpeg", "JPEG image"),
    ".jpeg": ("image/jpeg", "JPEG image"),
}

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}

MIME_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
}

REPORT_TYPE_DEFAULT = "Medical report"
MAX_TITLE_LENGTH = 200
MAX_FILE_NAME_LENGTH = 255

LIST_COLUMNS = (
    "id,report_title,report_type,report_date,file_name,status,"
    "ai_analysis,created_at,updated_at"
)
DOWNLOAD_COLUMNS = "id,file_name,file_path"
ANALYSIS_COLUMNS = "id,file_name,file_path,status,created_at,updated_at"
DETAIL_COLUMNS = (
    "id,report_title,report_type,report_date,file_name,file_path,"
    "extracted_text,ai_analysis,status,created_at,updated_at"
)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class ReportError(Exception):
    """Base error carrying the HTTP status safe to expose to the client."""

    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


class ReportValidationError(ReportError):
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(detail, status_code)


class ReportNotFoundError(ReportError):
    def __init__(self, detail: str = "Report not found."):
        super().__init__(detail, 404)


class ReportStorageUnavailableError(ReportError):
    def __init__(self, detail: str = "Private report storage is not available."):
        super().__init__(detail, 503)


class ReportStorageReadError(ReportError):
    def __init__(self, detail: str = "Unable to retrieve the report file."):
        super().__init__(detail, 502)


class ReportDatabaseError(ReportError):
    def __init__(self, detail: str = "Unable to save report information."):
        super().__init__(detail, 500)


class ReportProcessingError(ReportError):
    def __init__(self, detail: str, status_code: int = 422):
        super().__init__(detail, status_code)


# ---------------------------------------------------------------------------
# Upload validation
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ValidatedReportFile:
    content: bytes
    file_name: str
    content_type: str
    extension: str
    file_type: str


def _clean_file_name(filename: str | None, extension: str) -> str:
    raw = str(filename or "").replace("\\", "/").split("/")[-1]
    cleaned = "".join(
        character
        for character in raw
        if character >= " " and character != "\x7f"
    ).strip().strip(".")

    if not cleaned:
        cleaned = f"report{extension}"

    stem = Path(cleaned).stem.strip() or "report"
    stem = stem[: MAX_FILE_NAME_LENGTH - len(extension)]
    return f"{stem}{extension}"


def _detect_content_type(content: bytes) -> str | None:
    if b"%PDF-" in content[:1024]:
        return "application/pdf"

    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    return None


def validate_report_file(
    filename: str | None,
    declared_content_type: str | None,
    content: bytes,
    max_size_bytes: int | None = None,
) -> ValidatedReportFile:
    """Validate an uploaded report using extension, declared type and magic bytes."""

    limit = max_size_bytes or settings.report_max_file_size_bytes

    if not content:
        raise ReportValidationError("The selected file is empty.")

    if len(content) > limit:
        raise ReportValidationError(
            f"The file must be {limit // (1024 * 1024)} MB or smaller.",
            413,
        )

    raw_extension = Path(str(filename or "")).suffix.lower()

    if raw_extension not in ALLOWED_EXTENSIONS:
        raise ReportValidationError(
            "Only PDF, PNG, JPG and JPEG files are supported."
        )

    expected_content_type, file_type = ALLOWED_EXTENSIONS[raw_extension]
    detected_content_type = _detect_content_type(content)

    if detected_content_type is None:
        raise ReportValidationError(
            "The file content could not be verified as a PDF, PNG or JPEG image."
        )

    if detected_content_type != expected_content_type:
        raise ReportValidationError(
            "The file content does not match its file extension."
        )

    declared = (declared_content_type or "").split(";")[0].strip().lower()
    declared = MIME_ALIASES.get(declared, declared)

    if declared and declared not in {"application/octet-stream", detected_content_type}:
        raise ReportValidationError(
            "The file content type does not match the uploaded file."
        )

    return ValidatedReportFile(
        content=content,
        file_name=_clean_file_name(filename, raw_extension),
        content_type=detected_content_type,
        extension=raw_extension,
        file_type=file_type,
    )


def normalize_report_title(title: str | None, filename: str) -> str:
    value = re.sub(r"\s+", " ", str(title or "")).strip()

    if len(value) > MAX_TITLE_LENGTH:
        raise ReportValidationError(
            f"The report title must be {MAX_TITLE_LENGTH} characters or fewer."
        )

    if value:
        return value

    fallback = Path(filename).stem.strip() or REPORT_TYPE_DEFAULT
    return fallback[:MAX_TITLE_LENGTH]


def validate_report_date(report_date: date | None) -> None:
    if report_date and report_date > date.today():
        raise ReportValidationError("The report date cannot be in the future.")


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def media_type_for_file(file_name: str | None) -> str:
    extension = Path(str(file_name or "")).suffix.lower()
    entry = ALLOWED_EXTENSIONS.get(extension)
    return entry[0] if entry else "application/octet-stream"


def file_type_for_name(file_name: str | None) -> str:
    extension = Path(str(file_name or "")).suffix.lower()
    entry = ALLOWED_EXTENSIONS.get(extension)
    return entry[1] if entry else "Document"


def content_disposition(disposition: str, filename: str | None) -> str:
    original = _clean_file_name(filename, Path(str(filename or "")).suffix.lower() or ".pdf")
    ascii_name = re.sub(r"[^A-Za-z0-9._ -]", "_", original).strip() or "report"
    encoded = quote(original, safe="")

    return (
        f'{disposition}; filename="{ascii_name}"; '
        f"filename*=UTF-8''{encoded}"
    )


def _parse_timestamp(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value.strip():
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# Supabase-backed service
# ---------------------------------------------------------------------------

class SupabaseReportService:
    """Patient-scoped report metadata plus private file storage.

    Metadata queries run through the caller's JWT and therefore respect the
    existing `medical_reports` RLS policies. Storage operations use the
    service-role key on the server only because the private bucket deliberately
    grants no browser access.
    """

    def __init__(
        self,
        db_client: Any,
        storage: Any | None = None,
        bucket: str | None = None,
        max_size_bytes: int | None = None,
        extraction_service: Any | None = None,
        explanation_service: Any | None = None,
    ):
        self.db = db_client
        self._storage = storage
        self.bucket = bucket or settings.report_storage_bucket
        self.max_size_bytes = max_size_bytes or settings.report_max_file_size_bytes
        self.extraction_service = extraction_service or extract_report_content
        self.explanation_service = (
            explanation_service or ReportExplanationService()
        )

    # -- storage -----------------------------------------------------------

    def _get_storage(self):
        if self._storage is not None:
            return self._storage

        service_key = (settings.supabase_service_role_key or "").strip()

        if not service_key:
            raise ReportStorageUnavailableError(
                "Private report storage is not configured on the server."
            )

        try:
            admin = create_client(
                settings.supabase_url,
                service_key,
            )
            self._storage = admin.storage.from_(self.bucket)
            return self._storage
        except Exception as exc:
            raise ReportStorageUnavailableError(
                "Private report storage is not available."
            ) from exc

    def _remove_quietly(self, object_path: str | None) -> None:
        if not object_path:
            return

        try:
            self._get_storage().remove([object_path])
        except Exception:
            # The database record is authoritative. A failed cleanup leaves a
            # private, unreferenced object rather than exposing report content.
            pass

    # -- serialisation -----------------------------------------------------

    @staticmethod
    def _serialize(
        row: dict,
        include_extracted_text: bool = False,
        include_analysis: bool = False,
    ) -> dict:
        created_at = row.get("created_at") or row.get("uploaded_at")

        if not created_at:
            raise ReportDatabaseError("Report metadata is incomplete.")

        file_name = row.get("file_name") or "report"
        raw_analysis = row.get("ai_analysis")
        ai_explanation = None
        analysis = None
        values: list[dict] = []

        if isinstance(raw_analysis, str) and raw_analysis.strip():
            try:
                stored = json.loads(raw_analysis)
            except (TypeError, ValueError):
                ai_explanation = raw_analysis.strip()
            else:
                if isinstance(stored, dict) and isinstance(stored.get("summary"), str):
                    ai_explanation = stored.get("summary") or None
                    stored_values = stored.get("values")
                    if isinstance(stored_values, list):
                        values = [
                            value for value in stored_values if isinstance(value, dict)
                        ]
                    if include_analysis:
                        analysis = {
                            "summary": stored.get("summary") or "",
                            "values": values,
                            "uncertainties": (
                                stored.get("uncertainties")
                                if isinstance(stored.get("uncertainties"), list)
                                else []
                            ),
                            "questions": (
                                stored.get("questions")
                                if isinstance(stored.get("questions"), list)
                                else []
                            ),
                            "disclaimer": stored.get("disclaimer"),
                            "source": stored.get("source") or "extraction_rules",
                            "llm_status": stored.get("llm_status") or "not_configured",
                            "llm_message": stored.get("llm_message"),
                            "extraction_method": stored.get("extraction_method"),
                            "ocr_used": bool(stored.get("ocr_used")),
                            "ocr_confidence": stored.get("ocr_confidence"),
                            "page_count": stored.get("page_count"),
                            "generated_at": stored.get("generated_at"),
                        }
                else:
                    ai_explanation = raw_analysis.strip()

        return {
            "id": row["id"],
            "report_title": (
                row.get("report_title")
                or Path(file_name).stem
                or REPORT_TYPE_DEFAULT
            ),
            "report_type": row.get("report_type") or REPORT_TYPE_DEFAULT,
            "report_date": row.get("report_date"),
            "file_name": Path(file_name).name,
            "file_type": file_type_for_name(file_name),
            "status": row.get("status") or "uploaded",
            "ai_explanation": ai_explanation,
            "has_ai_explanation": bool(ai_explanation),
            "extracted_text": (
                row.get("extracted_text") if include_extracted_text else None
            ),
            "uploaded_at": created_at,
            "values": values if include_analysis else [],
            "analysis": analysis,
        }

    # -- metadata ----------------------------------------------------------

    def list_reports(self, patient_id: str) -> list[dict]:
        try:
            response = (
                self.db.table("medical_reports")
                .select(LIST_COLUMNS)
                .eq("patient_id", str(patient_id))
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as exc:
            raise ReportDatabaseError(
                "Unable to load your reports."
            ) from exc

        return [
            self._serialize(row)
            for row in (response.data or [])
        ]

    def _get_owned_row(
        self,
        patient_id: str,
        report_id: UUID,
        include_extracted_text: bool = True,
        include_file_path: bool = False,
        columns: str | None = None,
    ) -> dict:
        if columns:
            selected_columns = columns
        elif include_extracted_text:
            columns = DETAIL_COLUMNS
            selected_columns = columns
        elif include_file_path:
            selected_columns = DOWNLOAD_COLUMNS
        else:
            selected_columns = LIST_COLUMNS

        try:
            response = (
                self.db.table("medical_reports")
                .select(selected_columns)
                .eq("id", str(report_id))
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ReportDatabaseError(
                "Unable to load this report."
            ) from exc

        if not response.data:
            raise ReportNotFoundError()

        return response.data[0]

    def get_report(self, patient_id: str, report_id: UUID) -> dict:
        row = self._get_owned_row(
            patient_id,
            report_id,
            include_extracted_text=True,
        )
        return self._serialize(
            row,
            include_extracted_text=True,
            include_analysis=True,
        )

    def create_report(
        self,
        patient_id: str,
        upload: ValidatedReportFile,
        title: str,
        report_date: date | None,
    ) -> dict:
        validate_report_date(report_date)

        object_path = (
            f"{patient_id}/{uuid4().hex}{upload.extension}"
        )

        storage = self._get_storage()

        try:
            storage.upload(
                object_path,
                upload.content,
                {
                    "content-type": upload.content_type,
                    "cache-control": "3600",
                    "upsert": "false",
                },
            )
        except Exception as exc:
            raise ReportStorageUnavailableError(
                "Unable to store the report file."
            ) from exc

        metadata = {
            "patient_id": str(patient_id),
            "report_title": title,
            "report_type": REPORT_TYPE_DEFAULT,
            "report_date": report_date.isoformat() if report_date else None,
            "file_name": upload.file_name,
            "file_path": object_path,
            "status": "uploaded",
        }

        try:
            response = (
                self.db.table("medical_reports")
                .insert(metadata)
                .execute()
            )
        except Exception as exc:
            self._remove_quietly(object_path)
            raise ReportDatabaseError(
                "Unable to save the report information."
            ) from exc

        if not response.data:
            self._remove_quietly(object_path)
            raise ReportDatabaseError(
                "Unable to save the report information."
            )

        return self._serialize(response.data[0])

    # -- file access -------------------------------------------------------

    def _download_owned_file(self, row: dict) -> bytes:
        object_path = row.get("file_path")

        if not object_path:
            raise ReportNotFoundError("Report file not found.")

        parts = PurePosixPath(str(object_path)).parts

        if (
            str(object_path).startswith("/")
            or "\\" in str(object_path)
            or ".." in parts
        ):
            raise ReportNotFoundError("Report file not found.")

        try:
            return self._get_storage().download(object_path)
        except StorageApiError as exc:
            if str(getattr(exc, "status", "")) == "404":
                raise ReportNotFoundError("Report file not found.") from exc
            raise ReportStorageReadError() from exc
        except Exception as exc:
            raise ReportStorageReadError() from exc

    def get_download(
        self,
        patient_id: str,
        report_id: UUID,
    ) -> tuple[dict, bytes]:
        row = self._get_owned_row(
            patient_id,
            report_id,
            include_extracted_text=False,
            include_file_path=True,
        )
        return row, self._download_owned_file(row)

    # -- analysis ----------------------------------------------------------

    def _update_report_row(
        self,
        patient_id: str,
        report_id: UUID,
        values: dict,
    ) -> dict:
        try:
            response = (
                self.db.table("medical_reports")
                .update(values)
                .eq("id", str(report_id))
                .eq("patient_id", str(patient_id))
                .select("*")
                .execute()
            )
        except Exception as exc:
            raise ReportDatabaseError(
                "Unable to update this report."
            ) from exc

        if not response.data:
            raise ReportDatabaseError("Unable to update this report.")

        return response.data[0]

    def _mark_failed_quietly(self, patient_id: str, report_id: UUID) -> None:
        try:
            self._update_report_row(
                patient_id,
                report_id,
                {"status": "failed"},
            )
        except Exception:
            # Preserve the original safe error. A failed status update must not
            # turn a processing failure into an unhandled server error.
            pass

    def analyze_report(self, patient_id: str, report_id: UUID) -> dict:
        row = self._get_owned_row(
            patient_id,
            report_id,
            columns=ANALYSIS_COLUMNS,
        )

        if row.get("status") == "processing":
            updated_at = _parse_timestamp(row.get("updated_at"))
            if (
                updated_at is not None
                and datetime.now(timezone.utc) - updated_at
                < timedelta(minutes=10)
            ):
                raise ReportProcessingError(
                    "This report is already being analyzed. Try again in a moment.",
                    409,
                )

        self._update_report_row(
            patient_id,
            report_id,
            {"status": "processing"},
        )

        try:
            content = self._download_owned_file(row)
        except ReportError:
            self._mark_failed_quietly(patient_id, report_id)
            raise

        file_name = row.get("file_name") or ""

        try:
            if hasattr(self.extraction_service, "extract"):
                extraction = self.extraction_service.extract(
                    content,
                    file_name=file_name,
                )
            else:
                extraction = self.extraction_service(content, file_name)

            parsed = parse_lab_values(
                extraction.text,
                ocr_used=extraction.ocr_used,
                ocr_confidence=extraction.ocr_confidence,
            )
            explanation = self.explanation_service.explain(
                extraction,
                parsed,
            )
            payload = build_analysis_payload(
                extraction,
                parsed,
                explanation,
            )
        except ReportExtractionError as exc:
            self._mark_failed_quietly(patient_id, report_id)
            raise ReportProcessingError(exc.detail, exc.status_code) from exc
        except Exception as exc:
            self._mark_failed_quietly(patient_id, report_id)
            raise ReportProcessingError(
                "Unable to analyze this report. The original file was not changed."
            ) from exc

        try:
            updated = self._update_report_row(
                patient_id,
                report_id,
                {
                    "status": "analyzed",
                    "extracted_text": extraction.text,
                    "ai_analysis": json.dumps(payload, ensure_ascii=False),
                },
            )
        except ReportDatabaseError:
            self._mark_failed_quietly(patient_id, report_id)
            raise

        return self._serialize(
            updated,
            include_extracted_text=True,
            include_analysis=True,
        )

    def delete_report(self, patient_id: str, report_id: UUID) -> None:
        row = self._get_owned_row(
            patient_id,
            report_id,
            include_extracted_text=False,
            include_file_path=True,
        )

        # Resolve private storage before deleting metadata. If the server is not
        # configured for storage, fail closed instead of deleting the record and
        # silently orphaning an unreachable object.
        self._get_storage()

        try:
            (
                self.db.table("medical_reports")
                .delete()
                .eq("id", str(report_id))
                .eq("patient_id", str(patient_id))
                .execute()
            )
        except Exception as exc:
            raise ReportDatabaseError(
                "Unable to delete this report."
            ) from exc

        # RLS should prevent an unauthorised delete. Verify instead of
        # reporting success when the row is still present.
        try:
            check = (
                self.db.table("medical_reports")
                .select("id")
                .eq("id", str(report_id))
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
            )
        except Exception as exc:
            raise ReportDatabaseError(
                "Unable to confirm the report was deleted."
            ) from exc

        if check.data:
            raise ReportDatabaseError("Unable to delete this report.")

        self._remove_quietly(row.get("file_path"))
