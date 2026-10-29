from sqlalchemy.orm import Session

from app.database.models.billing import (
    Billing
)


def get_patient_bills(
    db: Session,
    patient_id: int
):

    return (
        db.query(Billing)
        .filter(
            Billing.patient_id == patient_id
        )
        .order_by(
            Billing.created_at.desc()
        )
        .all()
    )