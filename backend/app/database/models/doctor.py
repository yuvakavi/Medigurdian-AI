from sqlalchemy import (
    String,
    Float,
    Boolean,
    ForeignKey
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship
)

from app.database.base import Base


class Department(Base):

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    doctors = relationship(
        "Doctor",
        back_populates="department"
    )


class Doctor(Base):

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    doctor_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True
    )

    name: Mapped[str] = mapped_column(
        String(120)
    )

    department_id: Mapped[int] = mapped_column(
        ForeignKey("departments.id")
    )

    qualification: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True
    )

    experience_years: Mapped[int] = mapped_column(
        default=0
    )

    rating: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    consultation_fee: Mapped[float] = mapped_column(
        Float,
        default=0.0
    )

    available: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )

    department = relationship(
        "Department",
        back_populates="doctors"
    )

    appointments = relationship(
        "Appointment",
        back_populates="doctor"
    )