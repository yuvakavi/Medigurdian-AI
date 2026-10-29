from datetime import datetime, date, time

from sqlalchemy import (
    String,
    Date,
    Time,
    DateTime,
    ForeignKey
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from app.database.base import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    appointment_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id"),
        nullable=False
    )

    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("doctors.id"),
        nullable=False
    )

    appointment_date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )

    appointment_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    appointment_type: Mapped[str] = mapped_column(
        String(50),
        default="In-person"
    )

    reason: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="Confirmed"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    patient = relationship(
        "Patient",
        back_populates="appointments"
    )

    doctor = relationship(
        "Doctor",
        back_populates="appointments"
    )

    bill = relationship(
        "Billing",
        back_populates="appointment",
        uselist=False
    )