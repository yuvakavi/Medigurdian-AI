from datetime import datetime, date

from sqlalchemy import String, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    patient_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )

    full_name: Mapped[str] = mapped_column(
        String(120),
        nullable=False
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    gender: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True
    )

    email: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True
    )

    blood_group: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    appointments = relationship(
        "Appointment",
        back_populates="patient"
    )

    reports = relationship(
        "MedicalReport",
        back_populates="patient"
    )

    bills = relationship(
        "Billing",
        back_populates="patient"
    )