from datetime import datetime

from sqlalchemy.orm import Session

from app.database.models.appointment import (
    Appointment
)

from app.database.repositories.doctor_repository import (
    get_doctor
)


def create_appointment(
    db: Session,
    patient_id: int,
    data
):

    doctor = get_doctor(
        db,
        data.doctor_id
    )

    if not doctor:

        raise ValueError(
            "Doctor not found."
        )

    appointment_code = (
        "APT-"
        + datetime.utcnow().strftime(
            "%Y%m%d%H%M%S%f"
        )
    )

    appointment = Appointment(
        appointment_code=appointment_code,
        patient_id=patient_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        appointment_type=data.appointment_type,
        reason=data.reason,
        status="Confirmed"
    )

    db.add(appointment)

    db.commit()

    db.refresh(appointment)

    return appointment