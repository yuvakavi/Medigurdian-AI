from pathlib import Path
from typing import List
import hashlib

from app.rag.ingestion import prepare_document
from app.rag.embeddings import embedding_service
from app.rag.vector_store import add_documents, clear_collection


# =========================================================
# PROJECT ROOT
# =========================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]


# =========================================================
# RAG DOCUMENT DIRECTORY
# =========================================================

RAG_DATA_DIR = PROJECT_ROOT / "rag_data" / "medical_guidelines"


# =========================================================
# FIND DOCUMENTS
# =========================================================

def find_documents() -> List[Path]:
    """
    Find all supported PDF and TXT files inside the
    medical guidelines directory.
    """

    if not RAG_DATA_DIR.exists():
        raise FileNotFoundError(
            f"RAG directory not found: {RAG_DATA_DIR}"
        )

    documents = []

    for file_path in RAG_DATA_DIR.rglob("*"):
        if file_path.is_file() and file_path.suffix.lower() in {
            ".pdf",
            ".txt"
        }:
            documents.append(file_path)

    return sorted(documents)


# =========================================================
# CREATE UNIQUE CHUNK ID
# =========================================================

def create_chunk_id(
    file_path: Path,
    chunk_index: int
) -> str:
    """
    Create a unique ID for each document chunk.
    """

    value = f"{file_path.as_posix()}::{chunk_index}"

    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()


# =========================================================
# INGEST ALL DOCUMENTS
# =========================================================

def ingest_documents():
    """
    Read documents, create chunks, generate embeddings,
    and store everything in ChromaDB.
    """

    documents = find_documents()

    if not documents:
        print(
            "No PDF or TXT documents found."
        )
        return

    print(
        f"Found {len(documents)} document(s)."
    )

    print(
        f"RAG directory: {RAG_DATA_DIR}"
    )

    # Clear old ChromaDB data
    clear_collection()

    all_chunks = []
    all_embeddings = []
    all_metadatas = []
    all_ids = []

    for file_path in documents:

        print(
            f"\nProcessing: {file_path}"
        )

        try:

            chunks = prepare_document(
                str(file_path),
                chunk_size=1000,
                chunk_overlap=200
            )

            if not chunks:
                print(
                    "No text found. Skipping."
                )
                continue

            embeddings = (
                embedding_service.embed_documents(
                    chunks
                )
            )

            relative_path = file_path.relative_to(
                RAG_DATA_DIR
            )

            category = (
                relative_path.parts[0]
                if len(relative_path.parts) > 1
                else "general"
            )

            for index, chunk in enumerate(chunks):

                all_chunks.append(chunk)

                all_embeddings.append(
                    embeddings[index]
                )

                all_metadatas.append({
                    "source": file_path.name,
                    "path": str(relative_path),
                    "category": category,
                    "file_type": file_path.suffix.lower()
                })

                all_ids.append(
                    create_chunk_id(
                        file_path,
                        index
                    )
                )

            print(
                f"Created {len(chunks)} chunk(s)."
            )

        except Exception as e:

            print(
                f"Error processing {file_path}: {e}"
            )

    # =====================================================
    # CHECK CHUNKS
    # =====================================================

    if not all_chunks:

        print(
            "\nNo chunks were created."
        )

        return

    # =====================================================
    # STORE IN CHROMADB
    # =====================================================

    add_documents(
        documents=all_chunks,
        embeddings=all_embeddings,
        metadatas=all_metadatas,
        ids=all_ids
    )

    # =====================================================
    # SUCCESS MESSAGE
    # =====================================================

    print(
        "\n========================================"
    )

    print(
        "RAG INGESTION COMPLETED"
    )

    print(
        "========================================"
    )

    print(
        f"Documents processed: {len(documents)}"
    )

    print(
        f"Chunks stored: {len(all_chunks)}"
    )


# =========================================================
# RUN SCRIPT
# =========================================================

if __name__ == "__main__":
    ingest_documents()