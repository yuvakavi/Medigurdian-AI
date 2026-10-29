def recommend_department(
    message: str
) -> str:

    text = message.lower()

    mapping = {
        "heart": "Cardiology",
        "chest": "Cardiology",
        "skin": "Dermatology",
        "rash": "Dermatology",
        "bone": "Orthopedics",
        "joint": "Orthopedics",
        "headache": "Neurology",
        "migraine": "Neurology",
        "child": "Pediatrics"
    }

    for keyword, department in mapping.items():

        if keyword in text:
            return department

    return "General Medicine"