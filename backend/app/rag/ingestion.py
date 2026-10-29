from pathlib import Path
from typing import List

from pypdf import PdfReader


RAG_DATA_DIR = Path("rag_data")


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"PDF file not found: {file_path}"
        )

    reader = PdfReader(str(path))

    pages_text = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages_text.append(text)

    return "\n\n".join(pages_text).strip()


def load_text_file(file_path: str) -> str:
    """
    Load text from a TXT file.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Text file not found: {file_path}"
        )

    return path.read_text(
        encoding="utf-8"
    ).strip()


def load_document(file_path: str) -> str:
    """
    Load a supported document and return its text.
    """

    path = Path(file_path)

    if path.suffix.lower() == ".pdf":
        return extract_text_from_pdf(file_path)

    if path.suffix.lower() == ".txt":
        return load_text_file(file_path)

    raise ValueError(
        "Unsupported file type. "
        "Only PDF and TXT files are supported."
    )


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[str]:
    """
    Split document text into overlapping chunks.
    """

    if not text:
        return []

    if chunk_size <= 0:
        raise ValueError(
            "chunk_size must be greater than 0."
        )

    if chunk_overlap < 0:
        raise ValueError(
            "chunk_overlap cannot be negative."
        )

    if chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be smaller than chunk_size."
        )

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - chunk_overlap

    return chunks


def prepare_document(
    file_path: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> List[str]:
    """
    Load a document and split it into chunks.
    """

    text = load_document(file_path)

    return chunk_text(
        text,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )