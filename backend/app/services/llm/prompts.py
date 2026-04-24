from __future__ import annotations


def build_knowledge_graph_prompt(pdf_text: str) -> str:
    return f"""You are given text extracted from a PDF.

First understand the full document structure, then convert the content into a layered knowledge graph and return ONLY valid JSON.

Requirements:
- Return an object with exactly two top-level keys: summary and knowledge_graph.
- summary must be a concise Chinese summary of the PDF content.
- knowledge_graph must contain nodes and edges arrays.
- Each node must have id, label, type, level, parent_id, and optional description, page, evidence.
- Each edge must have source, target, relation, and optional description, evidence.
- Build a clear hierarchy with a document root, section nodes, subsection nodes, and concept/detail nodes when the text supports it.
- Prefer an outline-style graph over a keyword cloud. Nodes should form a tree-like structure where possible.
- Before creating the final JSON, infer the document outline from the text: title, abstract, major sections, subsections, and recurring keywords.
- The returned graph should mirror that outline. Section and subsection nodes should act as anchors for the keywords under them.
- Keep node ids stable and short.
- The document root should use level 0. Section nodes should use level 1. Subsections should use level 2. Deeper detail nodes can continue below that.
- Every non-root node should have a parent_id when a parent can be inferred.
- Add evidence snippets or page references when the source text makes them obvious.
- Prefer concepts, entities, tasks, methods, results, and relationships that help explain the document.
- Do not create unrelated nodes just to increase node count.
- Prefer 8 to 18 nodes total unless the document is very long and clearly structured.
- Do not include markdown fences or any extra commentary.

PDF text:
{pdf_text}
"""