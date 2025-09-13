import { z } from 'zod';
import { apiFetch } from './client';

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
  
  const data = await apiFetch(`/api/kg/graph?${params}`);
  return knowledgeGraphSchema.parse(data);
}

export async function getNodeDetails(nodeId: string) {
  const data = await apiFetch(`/api/kg/nodes/${nodeId}`);
  return data;
}

// Advanced KG API functions
class KGApi {
  private baseUrl = '/api/kg';

  async getFullGraph() {
    return apiFetch(`${this.baseUrl}`);
  }

  async getSiteGraph(siteId: number) {
    return apiFetch(`${this.baseUrl}/nodes?siteId=${siteId}`);
  }

  async getTicketGraph(ticketId: number) {
    return apiFetch(`${this.baseUrl}/ticket/${ticketId}/context`);
  }

  async getAssetNeighborhood(assetId: number, depth: number = 2) {
    return apiFetch(`${this.baseUrl}/neighbors/${assetId}?type=Asset&depth=${depth}`);
  }

  async getBlastRadius(assetId: number, type: 'network' | 'power' | 'both' = 'both', maxHops: number = 3) {
    return apiFetch(`${this.baseUrl}/blast-radius/${assetId}?type=${type}&maxHops=${maxHops}`);
  }

  async getCentrality(siteId?: number) {
    const url = siteId 
      ? `${this.baseUrl}/centrality?siteId=${siteId}`
      : `${this.baseUrl}/centrality`;
    return apiFetch(url);
  }

  async getCoFailures(siteId: number, windowMinutes: number = 120, minOccurrences: number = 2) {
    return apiFetch(`${this.baseUrl}/co-failure/${siteId}?windowMinutes=${windowMinutes}&minOccurrences=${minOccurrences}`);
  }

  async getAdvancedAnalytics() {
    return apiFetch(`${this.baseUrl}/advanced-analytics`);
  }

  async getGraphAnalytics() {
    return apiFetch(`${this.baseUrl}/analytics`);
  }

  async semanticSearch(query: string, entityType: string = 'asset', limit: number = 20) {
    return apiFetch(`${this.baseUrl}/semantic-search?q=${encodeURIComponent(query)}&type=${entityType}&limit=${limit}`);
  }
}

export const kgApi = new KGApi();

// Export standalone functions for backward compatibility
export const getBlastRadius = (assetId: number, type: 'network' | 'power' | 'both' = 'both', maxHops: number = 3) => 
  kgApi.getBlastRadius(assetId, type, maxHops);

export const getCentrality = (siteId?: number) => 
  kgApi.getCentrality(siteId);

export const getCoFailures = (siteId: number, windowMinutes: number = 120, minOccurrences: number = 2) => 
  kgApi.getCoFailures(siteId, windowMinutes, minOccurrences);

export const getAdvancedAnalytics = () => 
  kgApi.getAdvancedAnalytics();

export const getGraphAnalytics = () => 
  kgApi.getGraphAnalytics();

export const semanticSearch = (query: string, entityType: string = 'asset', limit: number = 20) => 
  kgApi.semanticSearch(query, entityType, limit);
