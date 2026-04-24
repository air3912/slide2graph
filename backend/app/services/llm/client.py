from __future__ import annotations

from dataclasses import dataclass
import json
import re

import httpx

from app.core.config import load_settings, settings
from app.schemas.pdf import KnowledgeGraphData
from app.services.llm.prompts import build_knowledge_graph_prompt


class LLMConfigurationError(RuntimeError):
    pass


class LLMUpstreamError(RuntimeError):
    pass


class LLMModelNotFoundError(LLMUpstreamError):
    pass


@dataclass(slots=True)
class LLMAnalysisResult:
    summary: str
    knowledge_graph: KnowledgeGraphData
    raw_content: str


def _extract_json_payload(content: str) -> str:
    stripped_content = content.strip()
    fenced_match = re.search(r"```(?:json)?\s*(.*?)```", stripped_content, flags=re.IGNORECASE | re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()

    start_index = stripped_content.find("{")
    end_index = stripped_content.rfind("}")
    if start_index >= 0 and end_index > start_index:
        return stripped_content[start_index : end_index + 1]

    raise ValueError("LLM response does not contain a JSON object")


class OpenAICompatibleLLMClient:
    def __init__(self, api_base: str, api_key: str, model: str, chat_path: str, timeout_seconds: float) -> None:
        self.api_base = api_base.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.chat_path = chat_path
        self.timeout_seconds = timeout_seconds

    @classmethod
    def from_settings(cls) -> "OpenAICompatibleLLMClient":
        current_settings = load_settings()

        if not current_settings.llm_api_base:
            raise LLMConfigurationError("LLM API base is not configured")

        if not current_settings.llm_api_key:
            raise LLMConfigurationError("LLM API key is not configured")

        return cls(
            api_base=current_settings.llm_api_base,
            api_key=current_settings.llm_api_key,
            model=current_settings.llm_model,
            chat_path=current_settings.llm_chat_path,
            timeout_seconds=current_settings.llm_timeout_seconds,
        )

    async def analyze_pdf_text(self, pdf_text: str) -> LLMAnalysisResult:
        prompt = build_knowledge_graph_prompt(pdf_text)
        request_payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You turn PDF content into concise knowledge graph JSON."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.api_base}{self.chat_path}"

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(url, headers=headers, json=request_payload)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text.strip()
                message = f"LLM API returned {exc.response.status_code} {exc.response.reason_phrase}"
                if detail:
                    message = f"{message}: {detail}"
                if "model_not_found" in detail:
                    raise LLMModelNotFoundError(message) from exc
                raise LLMUpstreamError(message) from exc
            response_data = response.json()

        try:
            raw_content = response_data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError("Unexpected LLM response shape") from exc

        parsed_json = json.loads(_extract_json_payload(raw_content))
        summary = str(parsed_json.get("summary", ""))
        knowledge_graph = KnowledgeGraphData.model_validate(parsed_json.get("knowledge_graph", {}))

        return LLMAnalysisResult(
            summary=summary,
            knowledge_graph=knowledge_graph,
            raw_content=raw_content,
        )