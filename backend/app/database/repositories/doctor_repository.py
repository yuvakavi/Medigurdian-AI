from sqlalchemy.orm import Session

from app.database.models.doctor import (
    Doctor,
    Department,
)


def list_doctors(
    db: Session,
    department: str | None = None,
):
    query = db.query(Doctor)

    if department:
        query = (
            query
            .join(Department)
            .filter(
                Department.name.ilike(
                    f"%{department}%"
                )
            )
        )

    return query.all()


def get_doctor(
    db: Session,
    doctor_id: int,
):
    return (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id
        )
        .first()
    )