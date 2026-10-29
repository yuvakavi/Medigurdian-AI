from datetime import date

from app.database.connection import (
    SessionLocal,
    engine
)

from app.database.base import Base

from app.database.models import (
    Patient,
    Department,
    Doctor,
    Medicine
)


# Create tables
Base.metadata.create_all(
    bind=engine
)


db = SessionLocal()


try:

    # ------------------------------------------
    # Patient
    # ------------------------------------------

    if db.query(Patient).count() == 0:

        patient = Patient(
            patient_code="MG-0001",
            full_name="Demo Patient",
            date_of_birth=date(
                1998,
                5,
                12
            ),
            gender="Female",
            phone="+91-0000000000",
            email="demo@example.com",
            blood_group="O+"
        )

        db.add(patient)


    # ------------------------------------------
    # Departments
    # ------------------------------------------

    department_names = [
        "General Medicine",
        "Cardiology",
        "Neurology",
        "Dermatology",
        "Orthopedics",
        "Pediatrics"
    ]

    departments = {}

    for name in department_names:

        department = (
            db.query(Department)
            .filter(
                Department.name == name
            )
            .first()
        )

        if not department:

            department = Department(
                name=name,
                description=(
                    f"{name} department"
                )
            )

            db.add(department)

        departments[name] = department


    db.commit()


    # ------------------------------------------
    # Doctors
    # ------------------------------------------

    if db.query(Doctor).count() == 0:

        doctors = [

            Doctor(
                doctor_code="DOC001",
                name="Dr. Kavya Menon",
                department_id=departments[
                    "Cardiology"
                ].id,
                qualification="MD Cardiology",
                experience_years=12,
                rating=4.9,
                consultation_fee=1200,
                available=True
            ),

            Doctor(
                doctor_code="DOC002",
                name="Dr. Arjun Verma",
                department_id=departments[
                    "Neurology"
                ].id,
                qualification="MD Neurology",
                experience_years=9,
                rating=4.8,
                consultation_fee=1000,
                available=True
            ),

            Doctor(
                doctor_code="DOC003",
                name="Dr. Meera Rao",
                department_id=departments[
                    "General Medicine"
                ].id,
                qualification="MD General Medicine",
                experience_years=10,
                rating=4.7,
                consultation_fee=800,
                available=True
            )
        ]

        db.add_all(
            doctors
        )


    # ------------------------------------------
    # Medicines
    # ------------------------------------------

    if db.query(Medicine).count() == 0:

        medicines = [

            Medicine(
                name="Paracetamol",
                generic_name="Paracetamol",
                category="Analgesic/Antipyretic",
                prescription_required=False,
                description=(
                    "Demo medicine record. "
                    "Verify clinical information "
                    "using an approved medical source."
                )
            ),

            Medicine(
                name="Amoxicillin",
                generic_name="Amoxicillin",
                category="Antibiotic",
                prescription_required=True,
                description=(
                    "Prescription medicine. "
                    "Clinical use must be determined "
                    "by a qualified professional."
                )
            )
        ]

        db.add_all(
            medicines
        )


    db.commit()

    print(
        "Medigurdian AI database "
        "seed completed successfully."
    )


finally:

    db.close()