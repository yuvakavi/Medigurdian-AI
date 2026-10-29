from app.agents.symptom_agent import (
    analyze_symptoms
)


def analyze(request):

    return analyze_symptoms(
        age=request.age,
        gender=request.gender,
        symptoms=request.symptoms,
        duration=request.duration,
        severity=request.severity
    )