from sqlalchemy.orm import Session

from app.database.models.medicine import (
    Medicine
)


def search(
    db: Session,
    query: str
):

    return (
        db.query(Medicine)
        .filter(
            Medicine.name.ilike(
                f"%{query}%"
            )
        )
        .limit(20)
        .all()
    )