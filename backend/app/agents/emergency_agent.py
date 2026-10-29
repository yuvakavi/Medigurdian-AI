EMERGENCY_TERMS = [
    "chest pain",
    "difficulty breathing",
    "can't breathe",
    "severe bleeding",
    "unconscious",
    "stroke",
    "seizure",
]


def assess_emergency(message: str):

    text = message.lower()

    emergency = any(
        term in text
        for term in EMERGENCY_TERMS
    )

    if emergency:

        guidance = (
            "The information provided may indicate "
            "a medical emergency. Seek urgent professional "
            "medical assistance or go to the nearest "
            "emergency department. Do not rely on this "
            "AI system for emergency diagnosis or treatment."
        )

    else:

        guidance = (
            "No predefined emergency warning phrase "
            "was detected. This does not rule out an "
            "emergency. Seek professional care if symptoms "
            "are severe or worsening."
        )

    return {
        "emergency": emergency,
        "guidance": guidance,
        "disclaimer": (
            "Medigurdian AI is not an emergency service "
            "and cannot replace emergency medical care."
        ),
    }