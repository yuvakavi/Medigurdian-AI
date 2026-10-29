from fastapi import (
    APIRouter,
    Depends
)

from sqlalchemy import func

from sqlalchemy.orm import Session

from app.database.connection import (
    get_db
)

from app.database.models.patient import (
    Patient
)

from app.database.models.doctor import (
    Doctor
)

from app.database.models.billing import (
    Billing
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get(
    "/dashboard"
)
def admin_dashboard(
    db: Session = Depends(get_db)
):

    patient_count = (
        db.query(
            func.count(Patient.id)
        ).scalar()
        or 0
    )

    doctor_count = (
        db.query(
            func.count(Doctor.id)
        ).scalar()
        or 0
    )

    revenue = (
        db.query(
            func.coalesce(
                func.sum(
                    Billing.total_amount
                ),
                0
            )
        ).scalar()
        or 0
    )

    return {
        "patients": patient_count,
        "doctors": doctor_count,
        "appointments_today": 0,
        "revenue": revenue
    }