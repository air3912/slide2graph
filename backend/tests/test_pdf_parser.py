from pathlib import Path

import fitz

from app.parsers.pdf import extract_text_from_pdf_bytes, extract_text_from_pdf_file


def _build_sample_pdf(path: Path, text: str) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    document.save(path)
    document.close()


def test_extract_text_from_pdf_file(tmp_path: Path) -> None:
    pdf_path = tmp_path / "sample.pdf"
    expected_text = "Hello slide2graph"
    _build_sample_pdf(pdf_path, expected_text)

    extracted_text = extract_text_from_pdf_file(pdf_path)

    assert expected_text in extracted_text


def test_extract_text_from_pdf_bytes(tmp_path: Path) -> None:
    pdf_path = tmp_path / "sample-bytes.pdf"
    expected_text = "PDF bytes test"
    _build_sample_pdf(pdf_path, expected_text)

    extracted_text = extract_text_from_pdf_bytes(pdf_path.read_bytes())

    assert expected_text in extracted_text
