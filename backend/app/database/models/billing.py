from datetime import datetime

from sqlalchemy import (
    String,
    Float,
    DateTime,
    ForeignKey
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from app.database.base import Base


class Billing(Base):

    __tablename__ = "billing"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    bill_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True
    )

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id")
    )

    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id"),
        nullable=True
    )

    consultation_fee: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    lab_fee: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    medicine_fee: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    facility_fee: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    insurance_amount: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    tax: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    total_amount: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    payment_status: Mapped[str] = mapped_column(
        String(30),
        default="Pending"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    patient = relationship(
        "Patient",
        back_populates="bills"
    )

    appointment = relationship(
        "Appointment",
        back_populates="bill"
    )