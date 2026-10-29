from sqlalchemy.orm import Session

from app.graph.workflow import (
    medical_graph
)

from app.database.models.chat import (
    ChatSession,
    ChatMessage
)


def process_chat(
    db: Session,
    patient_id: int,
    message: str,
    session_id: int | None = None
):

    session = None

    if session_id:

        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == session_id,
                ChatSession.patient_id == patient_id
            )
            .first()
        )

    if session is None:

        session = ChatSession(
            patient_id=patient_id,
            title=message[:60]
        )

        db.add(session)

        db.commit()

        db.refresh(session)

    user_message = ChatMessage(
        session_id=session.id,
        sender="user",
        message=message
    )

    db.add(user_message)

    db.commit()

    result = medical_graph.invoke(
        {
            "message": message
        }
    )

    route = result.get(
        "route",
        "symptom"
    )

    response = result.get(
        "response",
        "Unable to generate a response."
    )

    ai_message = ChatMessage(
        session_id=session.id,
        sender="ai",
        message=response,
        agent_used=route
    )

    db.add(ai_message)

    db.commit()

    return (
        response,
        route,
        session.id
    )