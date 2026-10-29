from pathlib import Path


def validate_pdf_path(
    path: str
) -> bool:

    return (
        Path(path)
        .suffix
        .lower()
        == ".pdf"
    )