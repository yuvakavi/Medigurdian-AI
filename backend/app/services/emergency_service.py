from app.agents.emergency_agent import assess_emergency


def assess(message: str):
    """
    Process an emergency assessment request.

    This service delegates the request to the
    emergency safety agent.
    """

    return assess_emergency(message)