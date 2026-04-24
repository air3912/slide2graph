import type { KnowledgeGraphData, KnowledgeGraphNode } from '../types/graph';

export type PositionedNode = KnowledgeGraphNode & {
  x: number;
  y: number;
  radius: number;
};

export type PositionedEdge = {
  source: PositionedNode;
  target: PositionedNode;
  relation: string;
  description?: string | null;
};

export type GraphLayout = {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
};

type RawEdge = {
  source: KnowledgeGraphNode;
  target: KnowledgeGraphNode;
  relation: string;
  description?: string | null;
  evidence?: string | null;
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getNodeRadius(label: string): number {
  return Math.max(22, Math.min(42, 14 + label.length * 1.6));
}

function inferNodeLevel(node: KnowledgeGraphNode, indexById: Map<string, KnowledgeGraphNode>, incoming: Map<string, number>): number {
  if (typeof node.level === 'number' && Number.isFinite(node.level)) {
    return Math.max(0, node.level);
  }

  if (node.type === 'document') {
    return 0;
  }

  if (node.parent_id && indexById.has(node.parent_id)) {
    const parent = indexById.get(node.parent_id);
    if (parent) {
      return inferNodeLevel(parent, indexById, incoming) + 1;
    }
  }

  if ((incoming.get(node.id) ?? 0) === 0) {
    return 0;
  }

  return 1;
}

export function buildGraphLayout(graph: KnowledgeGraphData): GraphLayout {
  const width = 720;
  const height = 600;
  const layeredNodes = [...graph.nodes];

  if (layeredNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const byId = new Map(layeredNodes.map((node) => [node.id, node]));
  const incoming = new Map<string, number>();
  for (const edge of graph.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  const levelById = new Map<string, number>();
  const getLevel = (node: KnowledgeGraphNode): number => {
    const cached = levelById.get(node.id);
    if (cached !== undefined) {
      return cached;
    }

    const inferred = inferNodeLevel(node, byId, incoming);
    levelById.set(node.id, inferred);
    return inferred;
  };

  const nodesByLevel = new Map<number, KnowledgeGraphNode[]>();
  for (const node of layeredNodes) {
    const level = getLevel(node);
    const bucket = nodesByLevel.get(level) ?? [];
    bucket.push(node);
    nodesByLevel.set(level, bucket);
  }

  const levelXs = (count: number, level: number): number[] => {
    if (count <= 1) {
      return [width / 2];
    }

    const usableWidth = level === 0 ? width * 0.5 : width * 0.84;
    const startX = (width - usableWidth) / 2;
    const step = usableWidth / (count - 1);
    return Array.from({ length: count }, (_unused, index) => startX + step * index);
  };

  const nodes: PositionedNode[] = [];
  const sortedLevels = [...nodesByLevel.keys()].sort((left, right) => left - right);

  for (const level of sortedLevels) {
    const levelNodes = nodesByLevel.get(level) ?? [];
    const sortedNodes = [...levelNodes].sort((left, right) => {
      const leftParent = left.parent_id ? byId.get(left.parent_id) : undefined;
      const rightParent = right.parent_id ? byId.get(right.parent_id) : undefined;
      const leftAnchor = leftParent ? nodes.find((node) => node.id === leftParent.id)?.x ?? 0 : hashString(left.id);
      const rightAnchor = rightParent ? nodes.find((node) => node.id === rightParent.id)?.x ?? 0 : hashString(right.id);
      return leftAnchor - rightAnchor || left.label.localeCompare(right.label);
    });

    const xs = levelXs(sortedNodes.length, level);
    const y = level === 0 ? 96 : Math.min(height - 80, 160 + level * 118);

    sortedNodes.forEach((node, index) => {
      nodes.push({
        ...node,
        x: xs[index],
        y,
        radius: level === 0 ? getNodeRadius(node.label) + 8 : getNodeRadius(node.label),
      });
    });
  }

  const edgesWithNulls: Array<RawEdge | null> = graph.edges
    .map((edge) => {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) {
        return null;
      }

      return {
        source,
        target,
        relation: edge.relation,
        description: edge.description ?? edge.evidence ?? null,
      };
    })
    ;

  const edges = edgesWithNulls.filter((edge): edge is PositionedEdge => edge !== null);

  return { nodes, edges };
}