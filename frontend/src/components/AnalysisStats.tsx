import type { PDFAnalysisResponse } from '../types/graph';

type AnalysisStatsProps = {
  analysis: PDFAnalysisResponse | null;
};

export function AnalysisStats({ analysis }: AnalysisStatsProps) {
  if (!analysis) {
    return null;
  }

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-label">文件名</span>
        <strong>{analysis.filename}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">字符数</span>
        <strong>{analysis.character_count}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">节点</span>
        <strong>{analysis.knowledge_graph.nodes.length}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">关系</span>
        <strong>{analysis.knowledge_graph.edges.length}</strong>
      </div>
    </div>
  );
}