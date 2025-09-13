// Clean, single implementation matching component expectations
import { useState, useCallback } from 'react';

interface GraphData { nodes: any[]; edges: any[]; metadata?: any }
interface GraphMetrics { nodeCount: number; edgeCount: number; criticalHubs: number; isolatedNodes: number; avgNodeDegree: number }
interface BlastRadiusData { sourceAsset: any; networkBlastRadius: any[]; powerBlastRadius: any[]; networkAffectedCount: number; powerAffectedCount: number }
interface CentralityData { asset_id: number; asset_type: string; site_id: number; outbound_connections: number; inbound_connections: number; total_degree: number; centrality_classification: string }
interface UseKnowledgeGraphOptions { ticketId?: number; assetId?: number; siteId?: number }

export const useKnowledgeGraph = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphMetrics, setGraphMetrics] = useState<GraphMetrics | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusData | null>(null);
  const [centrality, setCentrality] = useState<CentralityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setIsLoading(true); setError(null);
    try { return await fn(); } catch (e: any) { setError(e?.message || 'Request failed'); } finally { setIsLoading(false); }
  };

  const fetchGraphData = useCallback(async (options: UseKnowledgeGraphOptions = {}) => {
    await withLoading(async () => {
      const qs = new URLSearchParams();
      if (options.siteId) qs.set('siteId', String(options.siteId));
      const res = await fetch(`/api/kg?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch KG');
      const data = await res.json();
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [], metadata: data.metadata });
      const metrics: GraphMetrics = {
        nodeCount: data.nodes?.length || 0,
        edgeCount: data.edges?.length || 0,
        criticalHubs: (data.analytics?.critical_hubs) ?? 0,
        isolatedNodes: (data.analytics?.isolated_nodes) ?? 0,
        avgNodeDegree: (data.analytics?.avg_node_degree) ?? 0
      };
      setGraphMetrics(metrics);
    });
  }, []);

  const fetchBlastRadius = useCallback(async (assetId: number, type: 'network' | 'power' | 'both' = 'both', maxHops: number = 3) => {
    await withLoading(async () => {
      const qs = new URLSearchParams({ type, maxHops: String(maxHops) });
      const res = await fetch(`/api/kg/blast-radius/${assetId}?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch blast radius');
      const data = await res.json();
      setBlastRadius({
        sourceAsset: data.sourceAsset,
        networkBlastRadius: data.networkBlastRadius || [],
        powerBlastRadius: data.powerBlastRadius || [],
        networkAffectedCount: data.metadata?.networkAffectedCount || 0,
        powerAffectedCount: data.metadata?.powerAffectedCount || 0
      });
    });
  }, []);

  const fetchCentrality = useCallback(async (siteId?: number) => {
    await withLoading(async () => {
      const qs = new URLSearchParams(); if (siteId) qs.set('siteId', String(siteId));
      const res = await fetch(`/api/kg/centrality?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch centrality');
      const data = await res.json();
      setCentrality(data.centrality || []);
    });
  }, []);

  const fetchAdvancedAnalytics = useCallback(async () => {
    await withLoading(async () => {
      const res = await fetch(`/api/kg/advanced-analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setGraphMetrics(prev => ({
        nodeCount: data.globalMetrics?.total_nodes || prev?.nodeCount || 0,
        edgeCount: data.globalMetrics?.total_edges || prev?.edgeCount || 0,
        criticalHubs: data.globalMetrics?.critical_hubs || prev?.criticalHubs || 0,
        isolatedNodes: data.globalMetrics?.isolated_nodes || prev?.isolatedNodes || 0,
        avgNodeDegree: data.globalMetrics?.avg_node_degree || prev?.avgNodeDegree || 0
      }));
    });
  }, []);

  const clearData = useCallback(() => {
    setGraphData(null); setGraphMetrics(null); setBlastRadius(null); setCentrality([]); setError(null);
  }, []);

  return { graphData, graphMetrics, blastRadius, centrality, isLoading, error, fetchGraphData, fetchBlastRadius, fetchCentrality, fetchAdvancedAnalytics, clearData };
};

export default useKnowledgeGraph;
