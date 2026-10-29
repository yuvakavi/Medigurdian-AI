from typing import Any, Dict, List

from app.rag.embeddings import embedding_service
from app.rag.vector_store import search_documents


# =========================================================
# RETRIEVE DOCUMENTS
# =========================================================

def retrieve_documents(
    query: str,
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Convert the user question into an embedding
    and retrieve the most relevant documents from ChromaDB.
    """

    if not query or not query.strip():
        return []

    query_embedding = embedding_service.embed_text(
        query.strip()
    )

    results = search_documents(
        query_embedding=query_embedding,
        top_k=top_k
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]
    ids = results.get("ids", [[]])[0]

    retrieved_documents = []

    for index, document in enumerate(documents):

        retrieved_documents.append({
            "id": (
                ids[index]
                if index < len(ids)
                else None
            ),

            "content": document,

            "metadata": (
                metadatas[index]
                if index < len(metadatas)
                else {}
            ),

            "distance": (
                distances[index]
                if index < len(distances)
                else None
            )
        })

    return retrieved_documents


# =========================================================
# BUILD CONTEXT
# =========================================================

def build_context(
    documents: List[Dict[str, Any]]
) -> str:
    """
    Convert retrieved document chunks into
    a single context string for the RAG prompt.
    """

    if not documents:
        return ""

    context_parts = []

    for index, document in enumerate(
        documents,
        start=1
    ):

        content = document.get(
            "content",
            ""
        )

        if not content:
            continue

        context_parts.append(
            f"[Knowledge Chunk {index}]\n{content}"
        )

    return "\n\n".join(context_parts)


# =========================================================
# RETRIEVE CONTEXT
# =========================================================

def retrieve_context(
    query: str,
    top_k: int = 5
) -> str:
    """
    Retrieve relevant documents and directly
    return the combined context.
    """

    documents = retrieve_documents(
        query=query,
        top_k=top_k
    )

    return build_context(documents)