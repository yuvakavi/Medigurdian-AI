from sqlalchemy.orm import Session

from app.database.repositories.doctor_repository import (
    list_doctors,
)


def get_doctors(
    db: Session,
    department: str | None = None,
):
    doctors = list_doctors(
        db=db,
        department=department,
    )

    return [
        {
            "id": doctor.id,
            "doctor_code": doctor.doctor_code,
            "name": doctor.name,
            "department": doctor.department.name,
            "qualification": doctor.qualification,
            "experience_years": doctor.experience_years,
            "rating": doctor.rating,
            "consultation_fee": doctor.consultation_fee,
            "available": doctor.available,
        }
        for doctor in doctors
    ]