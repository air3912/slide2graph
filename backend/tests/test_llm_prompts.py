from app.services.llm.prompts import build_knowledge_graph_prompt


def test_knowledge_graph_prompt_requests_hierarchy() -> None:
    prompt = build_knowledge_graph_prompt("Sample PDF content")

    assert "layered knowledge graph" in prompt
    assert "parent_id" in prompt
    assert "level 0" in prompt
    assert "section nodes" in prompt