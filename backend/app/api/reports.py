from dataclasses import dataclass
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from supabase import create_client

from app.config import settings
from app.schemas.report import ReportResponse
from app.services.report_service import (
    ReportError,
    SupabaseReportService,
    content_disposition,
    validate_report_date,
    validate_report_file,
    normalize_report_title,
    media_type_for_file,
)
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/reports",
    tags=["Medical Reports"],
)


@dataclass(frozen=True)
class ReportContext:
    patient_id: str
    service: SupabaseReportService


def _user_supabase(current_user):
    client = create_client(
        settings.supabase_url,
        settings.supabase_publishable_key,
    )
    client.postgrest.auth(current_user.token)
    return client


def get_report_context(
    current_user=Depends(get_current_user),
) -> ReportContext:
    """Resolve the verified Supabase user to a patient profile.

    The patient id comes only from the authenticated JWT. A frontend-supplied
    patient or report ownership identifier is never trusted.
    """

    try:
        user_supabase = _user_supabase(current_user)

        response = (
            user_supabase
            .table("patients")
            .select("id")
            .eq("supabase_user_id", str(current_user.id))
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Patient profile not found.",
            )

        patient_id = str(response.data[0]["id"])

        return ReportContext(
            patient_id=patient_id,
            service=SupabaseReportService(db_client=user_supabase),
        )

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT CONTEXT ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to resolve your patient profile.",
        ) from exc


def _raise_report_error(exc: ReportError) -> None:
    raise HTTPException(
        status_code=exc.status_code,
        detail=exc.detail,
    ) from exc


@router.post(
    "/upload",
    response_model=ReportResponse,
    status_code=201,
)
async def upload_report(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    report_date: date | None = Form(default=None),
    context: ReportContext = Depends(get_report_context),
):
    try:
        validate_report_date(report_date)

        content = await file.read(settings.report_max_file_size_bytes + 1)
        upload = validate_report_file(
            filename=file.filename,
            declared_content_type=file.content_type,
            content=content,
            max_size_bytes=settings.report_max_file_size_bytes,
        )
        report_title = normalize_report_title(title, upload.file_name)

        return context.service.create_report(
            patient_id=context.patient_id,
            upload=upload,
            title=report_title,
            report_date=report_date,
        )

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT UPLOAD ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to upload the report.",
        ) from exc

    finally:
        await file.close()


@router.get(
    "/me",
    response_model=list[ReportResponse],
)
def list_my_reports(
    context: ReportContext = Depends(get_report_context),
):
    try:
        return context.service.list_reports(context.patient_id)

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT LIST ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to load your reports.",
        ) from exc


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
)
def get_report(
    report_id: UUID,
    context: ReportContext = Depends(get_report_context),
):
    try:
        return context.service.get_report(
            context.patient_id,
            report_id,
        )

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT DETAIL ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to load this report.",
        ) from exc


@router.post(
    "/{report_id}/analyze",
    response_model=ReportResponse,
)
def analyze_report(
    report_id: UUID,
    context: ReportContext = Depends(get_report_context),
):
    try:
        return context.service.analyze_report(
            context.patient_id,
            report_id,
        )

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT ANALYSIS ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to analyze this report.",
        ) from exc


@router.get(
    "/{report_id}/download",
)
def download_report(
    report_id: UUID,
    inline: bool = False,
    context: ReportContext = Depends(get_report_context),
):
    try:
        row, content = context.service.get_download(
            context.patient_id,
            report_id,
        )

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT DOWNLOAD ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to download this report.",
        ) from exc

    file_name = row.get("file_name") or "report"

    return Response(
        content=content,
        media_type=media_type_for_file(file_name),
        headers={
            "Content-Disposition": content_disposition(
                "inline" if inline else "attachment",
                file_name,
            ),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete(
    "/{report_id}",
)
def delete_report(
    report_id: UUID,
    context: ReportContext = Depends(get_report_context),
):
    try:
        context.service.delete_report(
            context.patient_id,
            report_id,
        )

    except ReportError as exc:
        _raise_report_error(exc)

    except HTTPException:
        raise

    except Exception as exc:
        print("REPORT DELETE ERROR:", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail="Unable to delete this report.",
        ) from exc

    return {
        "message": "Report deleted successfully.",
        "report_id": str(report_id),
    }
