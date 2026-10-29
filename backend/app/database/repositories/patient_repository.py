from sqlalchemy.orm import Session

from app.database.models.patient import Patient


def get_patient(
    db: Session,
    patient_id: int,
):
    return (
        db.query(Patient)
        .filter(
            Patient.id == patient_id
        )
        .first()
    )


def get_first_patient(
    db: Session,
):
    return (
        db.query(Patient)
        .order_by(
            Patient.id.asc()
        )
        .first()
    )


def get_patient_by_code(
    db: Session,
    patient_code: str,
):
    return (
        db.query(Patient)
        .filter(
            Patient.patient_code == patient_code
        )
        .first()
    )