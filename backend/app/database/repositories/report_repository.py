from sqlalchemy.orm import Session

from app.database.models.medical_report import MedicalReport


def get_report(
    db: Session,
    report_id: int
):

    return (
        db.query(MedicalReport)
        .filter(
            MedicalReport.id == report_id
        )
        .first()
    )


def get_patient_reports(
    db: Session,
    patient_id: int
):

    return (
        db.query(MedicalReport)
        .filter(
            MedicalReport.patient_id == patient_id
        )
        .order_by(
            MedicalReport.uploaded_at.desc()
        )
        .all()
    )