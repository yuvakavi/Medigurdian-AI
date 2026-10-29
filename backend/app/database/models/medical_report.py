from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id"),
        nullable=False
    )

    file_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    report_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="uploaded"
    )

    ai_explanation: Mapped[str | None] = mapped_column(
        String(5000),
        nullable=True
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    patient = relationship(
        "Patient",
        back_populates="reports"
    )

    values = relationship(
        "ReportValue",
        back_populates="report",
        cascade="all, delete-orphan"
    )


class ReportValue(Base):
    __tablename__ = "report_values"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    report_id: Mapped[int] = mapped_column(
        ForeignKey("medical_reports.id"),
        nullable=False
    )

    parameter: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    value: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    unit: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    reference_min: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    reference_max: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="Unknown"
    )

    report = relationship(
        "MedicalReport",
        back_populates="values"
    )