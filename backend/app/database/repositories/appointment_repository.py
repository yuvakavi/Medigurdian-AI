from sqlalchemy.orm import Session

from app.database.models.appointment import Appointment


def get_patient_appointments(
    db: Session,
    patient_id: int,
):
    return (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id
        )
        .order_by(
            Appointment.appointment_date.asc(),
            Appointment.appointment_time.asc(),
        )
        .all()
    )


def get_appointment(
    db: Session,
    appointment_id: int,
):
    return (
        db.query(Appointment)
        .filter(
            Appointment.id == appointment_id
        )
        .first()
    )


def create_appointment(
    db: Session,
    appointment: Appointment,
):
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment