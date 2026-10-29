from app.llm.llama import llama_service


def analyze_symptoms(
    age: int,
    gender: str,
    symptoms: str,
    duration: str,
    severity: str
):

    if severity.lower() in {
        "severe",
        "critical"
    }:
        urgency = "urgent"

    else:
        urgency = "routine"

    prompt = f"""
Patient age: {age}

Gender: {gender}

Symptoms:
{symptoms}

Duration:
{duration}

Severity:
{severity}

Provide cautious medical information.
Do not diagnose.
"""

    response = llama_service.generate(
        prompt
    )

    return {
        "assessment": response,
        "urgency": urgency,
        "disclaimer": (
            "This information is not a diagnosis "
            "and does not replace professional medical care."
        )
    }