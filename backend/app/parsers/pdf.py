from __future__ import annotations

from pathlib import Path

import fitz


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract plain text from a PDF payload using PyMuPDF."""
    document = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages = [page.get_text("text").strip() for page in document]
        return "\n\n".join(page for page in pages if page)
    finally:
        document.close()


def extract_text_from_pdf_file(pdf_path: str | Path) -> str:
    """Extract plain text from a local PDF file path."""
    path = Path(pdf_path)
    pdf_bytes = path.read_bytes()
    return extract_text_from_pdf_bytes(pdf_bytes)
