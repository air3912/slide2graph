export type KnowledgeGraphNode = {
  id: string;
  label: string;
  type: string;
  level?: number | null;
  parent_id?: string | null;
  page?: number | null;
  description?: string | null;
};

export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  relation: string;
  evidence?: string | null;
  description?: string | null;
};

export type KnowledgeGraphData = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export type PDFAnalysisResponse = {
  filename: string;
  text: string;
  character_count: number;
  summary: string;
  knowledge_graph: KnowledgeGraphData;
  llm_model: string;
};