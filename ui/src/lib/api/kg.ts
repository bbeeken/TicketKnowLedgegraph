import { z } from 'zod';

export const knowledgeGraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  properties: z.record(z.unknown())
});

export const knowledgeGraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  properties: z.record(z.unknown())
});

export const knowledgeGraphSchema = z.object({
  nodes: z.array(knowledgeGraphNodeSchema),
  edges: z.array(knowledgeGraphEdgeSchema)
});

export type KnowledgeGraphNode = z.infer<typeof knowledgeGraphNodeSchema>;
export type KnowledgeGraphEdge = z.infer<typeof knowledgeGraphEdgeSchema>;
export type KnowledgeGraph = z.infer<typeof knowledgeGraphSchema>;

export interface GraphFilters {
  siteId?: number;
  assetType?: string;
  depth?: number;
}

export async function getKnowledgeGraph(filters: GraphFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value.toString());
  });
  
  const response = await fetch(`/api/kg/graph?${params}`);
  if (!response.ok) throw new Error('Failed to fetch knowledge graph');
  
  const data = await response.json();
  return knowledgeGraphSchema.parse(data);
}

export async function getNodeDetails(nodeId: string) {
  const response = await fetch(`/api/kg/nodes/${nodeId}`);
  if (!response.ok) throw new Error('Failed to fetch node details');
  
  const data = await response.json();
  return knowledgeGraphNodeSchema.parse(data);
}

export async function getNodeNeighbors(nodeId: string, depth: number = 1) {
  const response = await fetch(`/api/kg/nodes/${nodeId}/neighbors?depth=${depth}`);
  if (!response.ok) throw new Error('Failed to fetch node neighbors');
  
  const data = await response.json();
  return knowledgeGraphSchema.parse(data);
}

export async function getBlastRadius(nodeId: string, type: 'network' | 'power' | 'food-safety') {
  const response = await fetch(`/api/kg/nodes/${nodeId}/blast-radius?type=${type}`);
  if (!response.ok) throw new Error('Failed to fetch blast radius');
  
  const data = await response.json();
  return knowledgeGraphSchema.parse(data);
}

export async function getCofailures(nodeId: string, windowMinutes: number = 120) {
  const response = await fetch(`/api/kg/nodes/${nodeId}/cofailures?window=${windowMinutes}`);
  if (!response.ok) throw new Error('Failed to fetch co-failures');
  
  const data = await response.json();
  return knowledgeGraphSchema.parse(data);
}
