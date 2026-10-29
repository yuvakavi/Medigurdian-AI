from pathlib import Path

from pypdf import PdfReader


def extract_text(
    file_path: str
) -> str:

    path = Path(file_path)

    if path.suffix.lower() != ".pdf":
        return ""

    reader = PdfReader(
        str(path)
    )

    text_parts = []

    for page in reader.pages:

        text_parts.append(
            page.extract_text() or ""
        )

    return "\n".join(text_parts)


def analyze_report_text(
    text: str
) -> str:

    if not text.strip():

        return (
            "No extractable text was found "
            "in the uploaded document."
        )

    return (
        "The report text was extracted successfully. "
        "Detailed interpretation will be added after "
        "the medical RAG and Llama 3 layers are connected."
    )