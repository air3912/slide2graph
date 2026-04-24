import type { KnowledgeGraphData } from '../types/graph';
import { buildGraphLayout } from '../utils/graphLayout';

type GraphCanvasProps = {
  graph: KnowledgeGraphData;
};

export function GraphCanvas({ graph }: GraphCanvasProps) {
  const layout = buildGraphLayout(graph);

  if (layout.nodes.length === 0) {
    return <div className="graph-empty">上传 PDF 并完成分析后，这里会显示知识网络。</div>;
  }

  return (
    <svg className="graph-canvas" viewBox="0 0 720 600" role="img" aria-label="Knowledge graph visualization">
      <defs>
        <filter id="nodeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.06 0 1 0 0 0.25 0 0 1 0 0.45 0 0 0 0.6 0"
          />
        </filter>
      </defs>

      <g className="graph-links">
        {layout.edges.map((edge) => (
          <g key={`${edge.source.id}-${edge.target.id}-${edge.relation}`}>
            <line x1={edge.source.x} y1={edge.source.y} x2={edge.target.x} y2={edge.target.y} />
            <text
              x={(edge.source.x + edge.target.x) / 2}
              y={(edge.source.y + edge.target.y) / 2 - 6}
              className="graph-edge-label"
            >
              {edge.relation}
            </text>
          </g>
        ))}
      </g>

      <g className="graph-nodes">
        {layout.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <circle className="graph-node-glow" r={node.radius + 8} filter="url(#nodeGlow)" />
            <circle className={`graph-node graph-node-${node.type}`} r={node.radius} />
            <text className="graph-node-label" y={node.radius + 18}>
              {node.label}
            </text>
            {node.description ? <title>{node.description}</title> : null}
          </g>
        ))}
      </g>
    </svg>
  );
}