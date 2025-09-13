import React, { useEffect, useState } from 'react';
import { Alert, Card, CardContent, Spinner } from '../ui';
import NetworkGraph from '../graphs/NetworkGraph';
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph';
import { useRealTimeKG } from '@/hooks/useRealTimeKG';

interface KnowledgeGraphPanelProps {
  ticketId?: number;
  assetId?: number;
  siteId?: number;
  className?: string;
}

interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  criticalHubs: number;
  isolatedNodes: number;
  avgNodeDegree: number;
}

export const KnowledgeGraphPanel: React.FC<KnowledgeGraphPanelProps> = ({
  ticketId,
  assetId,
  siteId,
  className = ''
}) => {
  const { 
    graphData, 
    graphMetrics, 
    blastRadius, 
    centrality,
    isLoading, 
    error, 
    fetchGraphData,
    fetchBlastRadius,
    fetchCentrality 
  } = useKnowledgeGraph();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(assetId || null);
  const [showBlastRadius, setShowBlastRadius] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  // Real-time updates
  const { isConnected } = useRealTimeKG({
    enabled: realTimeEnabled,
    ticketId,
    assetId,
    siteId
  });

  useEffect(() => {
    if (ticketId || assetId || siteId) {
      fetchGraphData({ ticketId, assetId, siteId });
    }
  }, [ticketId, assetId, siteId, fetchGraphData]);

  useEffect(() => {
    if (selectedAssetId && showBlastRadius) {
      fetchBlastRadius(selectedAssetId, 'both', 3);
    }
  }, [selectedAssetId, showBlastRadius, fetchBlastRadius]);

  const handleNodeClick = (node: any) => {
    const nodeId = node.id;
    const nodeType = node.type;
    const data = node.data;
    
    setSelectedNodeId(nodeId);
    
    if (nodeType === 'Asset' && data.asset_id) {
      setSelectedAssetId(data.asset_id);
      fetchCentrality(data.site_id);
    }
  };

  const handleBlastRadiusToggle = () => {
    setShowBlastRadius(!showBlastRadius);
  };

  if (error) {
    return (
      <Alert type="error" className={className}>
        <strong>Knowledge Graph Error:</strong> {error}
      </Alert>
    );
  }

  return (
    <div className={`kg-panel ${className}`}>
      <Card>
        <CardContent>
          <div className="kg-header flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Knowledge Graph</h3>
            <div className="kg-controls flex gap-2 items-center">
              {/* Real-time status indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                {isConnected ? 'Live' : 'Offline'}
              </div>
              
              <button
                onClick={() => setRealTimeEnabled(!realTimeEnabled)}
                className={`px-2 py-1 rounded text-xs ${
                  realTimeEnabled 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                Real-time {realTimeEnabled ? 'ON' : 'OFF'}
              </button>
              
              {selectedAssetId && (
                <button
                  onClick={handleBlastRadiusToggle}
                  className={`px-3 py-1 rounded text-sm ${
                    showBlastRadius 
                      ? 'bg-red-100 text-red-700 border border-red-300' 
                      : 'bg-blue-100 text-blue-700 border border-blue-300'
                  }`}
                >
                  {showBlastRadius ? 'Hide Blast Radius' : 'Show Blast Radius'}
                </button>
              )}
              <button
                onClick={() => fetchGraphData({ ticketId, assetId, siteId })}
                disabled={isLoading}
                className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                {isLoading ? <Spinner size="sm" /> : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Graph Metrics Summary */}
          {graphMetrics && (
            <div className="kg-metrics grid grid-cols-5 gap-4 mb-4 p-3 bg-gray-50 rounded">
              <div className="metric">
                <div className="text-2xl font-bold text-blue-600">{graphMetrics.nodeCount}</div>
                <div className="text-xs text-gray-600">Nodes</div>
              </div>
              <div className="metric">
                <div className="text-2xl font-bold text-green-600">{graphMetrics.edgeCount}</div>
                <div className="text-xs text-gray-600">Edges</div>
              </div>
              <div className="metric">
                <div className="text-2xl font-bold text-orange-600">{graphMetrics.criticalHubs || 0}</div>
                <div className="text-xs text-gray-600">Critical Hubs</div>
              </div>
              <div className="metric">
                <div className="text-2xl font-bold text-red-600">{graphMetrics.isolatedNodes || 0}</div>
                <div className="text-xs text-gray-600">Isolated</div>
              </div>
              <div className="metric">
                <div className="text-2xl font-bold text-purple-600">{graphMetrics.avgNodeDegree?.toFixed(1) || '0.0'}</div>
                <div className="text-xs text-gray-600">Avg Degree</div>
              </div>
            </div>
          )}

          {/* Knowledge Graph Visualization */}
          <div className="kg-graph-container" style={{ height: '400px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="lg" />
                <span className="ml-2">Loading knowledge graph...</span>
              </div>
            ) : graphData ? (
              <NetworkGraph
                nodes={graphData.nodes}
                edges={graphData.edges}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No graph data available
              </div>
            )}
          </div>

          {/* Node Details Panel */}
          {selectedNodeId && graphData && (
            <KnowledgeNodeDetails
              nodeId={selectedNodeId}
              nodeData={graphData.nodes.find(n => n.id === selectedNodeId)}
              centrality={centrality?.find(c => c.asset_id.toString() === selectedNodeId)}
              blastRadius={blastRadius}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface KnowledgeNodeDetailsProps {
  nodeId: string;
  nodeData: any;
  centrality?: any;
  blastRadius?: any;
}

const KnowledgeNodeDetails: React.FC<KnowledgeNodeDetailsProps> = ({
  nodeId,
  nodeData,
  centrality,
  blastRadius
}) => {
  if (!nodeData) return null;

  return (
    <div className="kg-node-details mt-4 p-4 bg-blue-50 rounded border">
      <h4 className="font-semibold mb-2">Node Details</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <strong>Type:</strong> {nodeData.node_type}
        </div>
        <div>
          <strong>Label:</strong> {nodeData.label}
        </div>
        
        {nodeData.site_name && (
          <div>
            <strong>Site:</strong> {nodeData.site_name}
          </div>
        )}
        
        {nodeData.status && (
          <div>
            <strong>Status:</strong> 
            <span className={`ml-1 px-2 py-1 rounded text-xs ${
              nodeData.status === 'active' ? 'bg-green-100 text-green-700' :
              nodeData.status === 'inactive' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {nodeData.status}
            </span>
          </div>
        )}
      </div>

      {/* Centrality Metrics */}
      {centrality && (
        <div className="mt-3 pt-3 border-t">
          <h5 className="font-medium mb-2">Network Centrality</h5>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <strong>In:</strong> {centrality.inbound_connections}
            </div>
            <div>
              <strong>Out:</strong> {centrality.outbound_connections}
            </div>
            <div>
              <strong>Total:</strong> {centrality.total_degree}
            </div>
          </div>
          <div className="mt-2">
            <span className={`px-2 py-1 rounded text-xs ${
              centrality.centrality_classification === 'critical_hub' ? 'bg-red-100 text-red-700' :
              centrality.centrality_classification === 'important_node' ? 'bg-orange-100 text-orange-700' :
              centrality.centrality_classification === 'isolated' ? 'bg-gray-100 text-gray-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {centrality.centrality_classification}
            </span>
          </div>
        </div>
      )}

      {/* Blast Radius */}
      {blastRadius && (
        <div className="mt-3 pt-3 border-t">
          <h5 className="font-medium mb-2">Blast Radius Impact</h5>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <strong>Network:</strong> {blastRadius.networkAffectedCount || 0} assets
            </div>
            <div>
              <strong>Power:</strong> {blastRadius.powerAffectedCount || 0} assets
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphPanel;
