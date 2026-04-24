from pydantic import BaseModel, Field


class PDFTextResponse(BaseModel):
    filename: str = Field(..., description="Uploaded PDF file name")
    text: str = Field(..., description="Extracted plain text")
    character_count: int = Field(..., description="Number of extracted characters")


class KnowledgeGraphNode(BaseModel):
    id: str = Field(..., description="Unique node identifier")
    label: str = Field(..., description="Display label for the node")
    type: str = Field(default="entity", description="Node category")
    level: int | None = Field(default=None, description="Hierarchical depth, with 0 as the document root")
    parent_id: str | None = Field(default=None, description="Parent node identifier in the hierarchy")
    page: int | None = Field(default=None, description="Optional source page number")
    description: str | None = Field(default=None, description="Optional node description")


class KnowledgeGraphEdge(BaseModel):
    source: str = Field(..., description="Source node identifier")
    target: str = Field(..., description="Target node identifier")
    relation: str = Field(..., description="Relation label")
    evidence: str | None = Field(default=None, description="Optional supporting text for the relation")
    description: str | None = Field(default=None, description="Optional edge description")


class KnowledgeGraphData(BaseModel):
    nodes: list[KnowledgeGraphNode] = Field(default_factory=list, description="Graph nodes")
    edges: list[KnowledgeGraphEdge] = Field(default_factory=list, description="Graph edges")


class PDFKnowledgeGraphResponse(PDFTextResponse):
    summary: str = Field(..., description="LLM-generated summary of the PDF")
    knowledge_graph: KnowledgeGraphData = Field(..., description="Structured knowledge graph")
    llm_model: str = Field(..., description="Model used to generate the graph")
