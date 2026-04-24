from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.parsers.pdf import extract_text_from_pdf_bytes
from app.schemas.pdf import PDFKnowledgeGraphResponse, PDFTextResponse
from app.services.llm.client import (
    LLMConfigurationError,
    LLMModelNotFoundError,
    LLMUpstreamError,
    OpenAICompatibleLLMClient,
)

router = APIRouter()


def get_llm_client() -> OpenAICompatibleLLMClient:
    try:
        return OpenAICompatibleLLMClient.from_settings()
    except LLMConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def _extract_pdf_text_from_upload(file: UploadFile) -> str:
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        return extract_text_from_pdf_bytes(pdf_bytes)
    except Exception as exc:  # pragma: no cover - defensive guard for corrupt PDFs
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {exc}") from exc


@router.post("/extract-text", response_model=PDFTextResponse, summary="Extract text from a PDF")
async def extract_pdf_text(file: UploadFile = File(...)) -> PDFTextResponse:
    text = await _extract_pdf_text_from_upload(file)

    return PDFTextResponse(
        filename=file.filename or "uploaded.pdf",
        text=text,
        character_count=len(text),
    )


@router.post(
    "/analyze",
    response_model=PDFKnowledgeGraphResponse,
    summary="Extract PDF text and build a knowledge graph with an LLM",
)
async def analyze_pdf(
    file: UploadFile = File(...),
    llm_client: OpenAICompatibleLLMClient = Depends(get_llm_client),
) -> PDFKnowledgeGraphResponse:
    text = await _extract_pdf_text_from_upload(file)
    try:
        analysis = await llm_client.analyze_pdf_text(text)
    except LLMModelNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail="LLM 模型不可用。请检查 `.env` 中的 LLM_MODEL 是否是当前上游支持的模型，并重启后端。",
        ) from exc
    except LLMUpstreamError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return PDFKnowledgeGraphResponse(
        filename=file.filename or "uploaded.pdf",
        text=text,
        character_count=len(text),
        summary=analysis.summary,
        knowledge_graph=analysis.knowledge_graph,
        llm_model=llm_client.model,
    )
