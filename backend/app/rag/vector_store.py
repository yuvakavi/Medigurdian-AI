from typing import List, Dict, Any, Optional

import chromadb


# =========================================================
# CHROMADB CONFIGURATION
# =========================================================

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "medigurdian_knowledge"


# =========================================================
# CHROMADB CLIENT
# =========================================================

client = chromadb.PersistentClient(
    path=CHROMA_DIR
)


# =========================================================
# COLLECTION
# =========================================================

collection = client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={
        "description": "Medigurdian AI healthcare knowledge base"
    }
)


# =========================================================
# ADD DOCUMENT CHUNKS
# =========================================================

def add_documents(
    documents: List[str],
    embeddings: List[List[float]],
    metadatas: Optional[List[Dict[str, Any]]] = None,
    ids: Optional[List[str]] = None
):
    """
    Store document chunks and their embeddings in ChromaDB.
    """

    if not documents:
        return

    if len(documents) != len(embeddings):
        raise ValueError(
            "Documents and embeddings must have the same length."
        )

    if ids is None:
        ids = [
            f"document_{i}"
            for i in range(len(documents))
        ]

    if len(ids) != len(documents):
        raise ValueError(
            "IDs and documents must have the same length."
        )

    if metadatas is None:
        metadatas = [
            {}
            for _ in documents
        ]

    if len(metadatas) != len(documents):
        raise ValueError(
            "Metadatas and documents must have the same length."
        )

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )


# =========================================================
# SEARCH DOCUMENTS
# =========================================================

def search_documents(
    query_embedding: List[float],
    top_k: int = 5
):
    """
    Search ChromaDB for the most relevant document chunks.
    """

    if not query_embedding:
        return {
            "documents": [],
            "metadatas": [],
            "distances": [],
            "ids": []
        }

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    return results


# =========================================================
# GET COLLECTION COUNT
# =========================================================

def get_document_count() -> int:
    """
    Return the number of stored document chunks.
    """

    return collection.count()


# =========================================================
# DELETE ALL DOCUMENTS
# =========================================================

def clear_collection():
    """
    Delete and recreate the knowledge collection.
    """

    global collection

    try:
        client.delete_collection(
            name=COLLECTION_NAME
        )
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "description": "Medigurdian AI healthcare knowledge base"
        }
    )