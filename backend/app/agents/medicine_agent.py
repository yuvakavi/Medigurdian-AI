def medicine_information(
    medicine_name: str
):

    return {
        "medicine": medicine_name,
        "message": (
            "Medicine information will be retrieved "
            "from the approved medicine database. "
            "The system does not provide personalized "
            "prescription or dosage instructions."
        )
    }