def route_message(
    message: str
) -> str:

    text = message.lower()

    emergency_terms = [
        "chest pain",
        "difficulty breathing",
        "can't breathe",
        "severe bleeding",
        "unconscious",
        "stroke",
        "seizure"
    ]

    report_terms = [
        "cbc",
        "blood report",
        "lab report",
        "thyroid",
        "wbc",
        "hemoglobin"
    ]

    medicine_terms = [
        "medicine",
        "tablet",
        "drug",
        "medication",
        "side effect"
    ]

    doctor_terms = [
        "doctor",
        "specialist",
        "department",
        "appointment",
        "book"
    ]

    billing_terms = [
        "bill",
        "billing",
        "invoice",
        "payment"
    ]

    if any(
        term in text
        for term in emergency_terms
    ):
        return "emergency"

    if any(
        term in text
        for term in report_terms
    ):
        return "report"

    if any(
        term in text
        for term in medicine_terms
    ):
        return "medicine"

    if any(
        term in text
        for term in doctor_terms
    ):
        return "doctor"

    if any(
        term in text
        for term in billing_terms
    ):
        return "billing"

    return "symptom"