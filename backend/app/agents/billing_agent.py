def calculate_total(
    consultation: float,
    lab: float,
    medicine: float,
    facility: float,
    insurance: float = 0.0,
    tax: float = 0.0
) -> float:

    subtotal = (
        consultation
        + lab
        + medicine
        + facility
        + tax
    )

    return max(
        0.0,
        subtotal - insurance
    )