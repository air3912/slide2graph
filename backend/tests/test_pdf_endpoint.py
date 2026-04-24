from pathlib import Path

import fitz
from fastapi.testclient import TestClient

from app.api.v1.endpoints.pdf import get_llm_client
from app.main import app
from app.schemas.pdf import KnowledgeGraphData
from app.services.llm.client import LLMAnalysisResult, LLMUpstreamError

client = TestClient(app)


def _build_sample_pdf(path: Path, text: str) -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), text)
    document.save(path)
    document.close()


def test_extract_pdf_text_endpoint(tmp_path: Path) -> None:
    pdf_path = tmp_path / "upload.pdf"
    expected_text = "Endpoint extraction"
    _build_sample_pdf(pdf_path, expected_text)

    with pdf_path.open("rb") as file_handle:
        response = client.post(
            "/api/v1/pdf/extract-text",
            files={"file": ("upload.pdf", file_handle, "application/pdf")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "upload.pdf"
    assert expected_text in data["text"]
    assert data["character_count"] >= len(expected_text)


class _FakeLLMClient:
    model = "fake-llm"

    async def analyze_pdf_text(self, pdf_text: str) -> LLMAnalysisResult:
        return LLMAnalysisResult(
            summary="这是一个用于测试的知识图谱摘要。",
            knowledge_graph=KnowledgeGraphData(
                nodes=[
                    {"id": "pdf", "label": "PDF 文档", "type": "document"},
                    {"id": "topic", "label": "测试主题", "type": "topic"},
                ],
                edges=[
                    {"source": "pdf", "target": "topic", "relation": "contains"},
                ],
            ),
            raw_content=pdf_text,
        )


class _FailingLLMClient:
    model = "fake-llm"

    async def analyze_pdf_text(self, pdf_text: str) -> LLMAnalysisResult:
        raise LLMUpstreamError("LLM API returned 503 Service Unavailable")


def test_analyze_pdf_builds_knowledge_graph(tmp_path: Path) -> None:
    pdf_path = tmp_path / "knowledge-graph.pdf"
    expected_text = "Knowledge graph test content"
    _build_sample_pdf(pdf_path, expected_text)

    app.dependency_overrides[get_llm_client] = lambda: _FakeLLMClient()
    try:
        with pdf_path.open("rb") as file_handle:
            response = client.post(
                "/api/v1/pdf/analyze",
                files={"file": ("knowledge-graph.pdf", file_handle, "application/pdf")},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "knowledge-graph.pdf"
    assert expected_text in data["text"]
    assert data["summary"] == "这是一个用于测试的知识图谱摘要。"
    assert data["llm_model"] == "fake-llm"
    assert len(data["knowledge_graph"]["nodes"]) == 2
    assert len(data["knowledge_graph"]["edges"]) == 1


def test_analyze_pdf_returns_503_when_llm_upstream_fails(tmp_path: Path) -> None:
    pdf_path = tmp_path / "llm-error.pdf"
    _build_sample_pdf(pdf_path, "LLM upstream failure test")

    app.dependency_overrides[get_llm_client] = lambda: _FailingLLMClient()
    try:
        with pdf_path.open("rb") as file_handle:
            response = client.post(
                "/api/v1/pdf/analyze",
                files={"file": ("llm-error.pdf", file_handle, "application/pdf")},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert "LLM API returned 503" in response.json()["detail"]
