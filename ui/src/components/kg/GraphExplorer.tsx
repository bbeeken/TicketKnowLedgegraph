import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '../ui';
import NetworkGraph from '../graphs/NetworkGraph';
import { useKnowledgeGraph } from '../../hooks/useKnowledgeGraph';

interface GraphExplorerProps {
  initialSiteId?: number;
  className?: string;
}

interface FilterOptions {
  nodeTypes: string[];
  edgeTypes: string[];
  siteIds: number[];
  searchQuery: string;
  showIsolated: boolean;
  minDegree: number;
  maxDegree: number;
}

const NODE_TYPES = [
  'Site', 'Asset', 'Alert', 'Event', 'Ticket', 
  'UserProfile', 'Team', 'Vendor', 'Document', 
  'Invoice', 'KnowledgeSnippet'
];

const EDGE_TYPES = [
  'HAS_ASSET', 'CONNECTS_TO', 'FEEDS_POWER', 'RELATES_TO',
  'DOCUMENT_FOR', 'SESSION_FOR', 'SNIPPET_REF'
];

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  initialSiteId,
  className = ''
}) => {
  const { 
    graphData, 
    centrality,
    isLoading, 
    error, 
    fetchGraphData,
    fetchCentrality 
  } = useKnowledgeGraph();

  const [filters, setFilters] = useState<FilterOptions>({
    nodeTypes: NODE_TYPES,
    edgeTypes: EDGE_TYPES,
    siteIds: initialSiteId ? [initialSiteId] : [],
    searchQuery: '',
    showIsolated: true,
    minDegree: 0,
    maxDegree: 100
  });

  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [expandedNeighborhood, setExpandedNeighborhood] = useState<Set<string>>(new Set());
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'force' | 'circular'>('hierarchical');

  // Load initial data
  React.useEffect(() => {
    fetchGraphData({ siteId: initialSiteId });
    fetchCentrality(initialSiteId);
  }, [initialSiteId, fetchGraphData, fetchCentrality]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const handleExpandNeighborhood = useCallback(async (nodeId: string) => {
    // Add to expanded set
    const newExpanded = new Set(expandedNeighborhood);
    newExpanded.add(nodeId);
    setExpandedNeighborhood(newExpanded);

    // Fetch additional data for this node's neighborhood
    // This would require an API call to get neighbors
    console.log('Expanding neighborhood for node:', nodeId);
  }, [expandedNeighborhood]);

  const applyFilters = useCallback(() => {
    if (!graphData) return { nodes: [], edges: [] };

    let filteredNodes = graphData.nodes || [];
    let filteredEdges = graphData.edges || [];

    // Filter by node types
    if (filters.nodeTypes.length < NODE_TYPES.length) {
      filteredNodes = filteredNodes.filter(node => 
        filters.nodeTypes.includes(node.node_type || node.type)
      );
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node =>
        node.label?.toLowerCase().includes(query) ||
        node.site_name?.toLowerCase().includes(query) ||
        node.type?.toLowerCase().includes(query)
      );
    }

    // Filter by degree (requires centrality data)
    if (centrality && centrality.length > 0) {
      filteredNodes = filteredNodes.filter(node => {
        const nodeCentrality = centrality.find(c => c.asset_id.toString() === node.id);
        if (!nodeCentrality) return filters.showIsolated;
        
        const degree = nodeCentrality.total_degree;
        return degree >= filters.minDegree && degree <= filters.maxDegree;
      });
    }

    // Filter edges to only include those connecting visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(node => node.id));
    filteredEdges = filteredEdges.filter(edge =>
      visibleNodeIds.has(edge.source_id || edge.source) &&
      visibleNodeIds.has(edge.target_id || edge.target) &&
      filters.edgeTypes.includes(edge.edge_type || edge.type)
    );

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [graphData, centrality, filters]);

  const filteredData = applyFilters();

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`graph-explorer ${className}`}>
      <div className="grid grid-cols-4 gap-4 h-screen">
        {/* Filter Panel */}
        <div className="col-span-1 overflow-y-auto">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Graph Filters</h3>
              
              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Search</label>
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Node Types */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Node Types</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {NODE_TYPES.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.nodeTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.nodeTypes, type]
                            : filters.nodeTypes.filter(t => t !== type);
                          handleFilterChange('nodeTypes', newTypes);
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Edge Types */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Edge Types</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {EDGE_TYPES.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.edgeTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.edgeTypes, type]
                            : filters.edgeTypes.filter(t => t !== type);
                          handleFilterChange('edgeTypes', newTypes);
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Degree Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Connection Degree</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600">Min</label>
                    <input
                      type="number"
                      value={filters.minDegree}
                      onChange={(e) => handleFilterChange('minDegree', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Max</label>
                    <input
                      type="number"
                      value={filters.maxDegree}
                      onChange={(e) => handleFilterChange('maxDegree', parseInt(e.target.value) || 100)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Show Isolated */}
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.showIsolated}
                    onChange={(e) => handleFilterChange('showIsolated', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Show isolated nodes</span>
                </label>
              </div>

              {/* Layout Mode */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Layout</label>
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="hierarchical">Hierarchical</option>
                  <option value="force">Force-directed</option>
                  <option value="circular">Circular</option>
                </select>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Graph Stats</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Nodes: {filteredData.nodes.length}</div>
                  <div>Edges: {filteredData.edges.length}</div>
                  <div>Density: {filteredData.nodes.length > 0 
                    ? (filteredData.edges.length / (filteredData.nodes.length * (filteredData.nodes.length - 1) / 2) * 100).toFixed(1)
                    : 0}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graph Visualization */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardContent className="h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Graph Visualization</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchGraphData({ siteId: initialSiteId })}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-300 rounded text-sm disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="graph-container" style={{ height: 'calc(100% - 80px)' }}>
                {error ? (
                  <div className="flex items-center justify-center h-full text-red-600">
                    Error: {error}
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    Loading graph...
                  </div>
                ) : (
                  <NetworkGraph
                    nodes={filteredData.nodes}
                    edges={filteredData.edges}
                    onNodeClick={handleNodeClick}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Node Details Panel */}
        <div className="col-span-1 overflow-y-auto">
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Node Details</h3>
              
              {selectedNode ? (
                <NodeDetailsPanel 
                  node={selectedNode} 
                  centrality={centrality?.find(c => c.asset_id.toString() === selectedNode.id)}
                  onExpandNeighborhood={handleExpandNeighborhood}
                  isExpanded={expandedNeighborhood.has(selectedNode.id)}
                />
              ) : (
                <div className="text-gray-500 text-sm">
                  Click on a node to view its details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface NodeDetailsPanelProps {
  node: any;
  centrality?: any;
  onExpandNeighborhood: (nodeId: string) => void;
  isExpanded: boolean;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node,
  centrality,
  onExpandNeighborhood,
  isExpanded
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-lg">{node.label}</h4>
        <p className="text-sm text-gray-600">{node.node_type || node.type}</p>
      </div>

      {node.site_name && (
        <div>
          <strong className="text-sm">Site:</strong>
          <p className="text-sm">{node.site_name}</p>
        </div>
      )}

      {node.status && (
        <div>
          <strong className="text-sm">Status:</strong>
          <span className={`ml-1 px-2 py-1 rounded text-xs ${
            node.status === 'active' ? 'bg-green-100 text-green-700' :
            node.status === 'inactive' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {node.status}
          </span>
        </div>
      )}

      {centrality && (
        <div>
          <h5 className="font-medium text-sm mb-2">Network Metrics</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <strong>In:</strong> {centrality.inbound_connections}
            </div>
            <div>
              <strong>Out:</strong> {centrality.outbound_connections}
            </div>
            <div>
              <strong>Total:</strong> {centrality.total_degree}
            </div>
            <div>
              <strong>Class:</strong>
              <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                centrality.centrality_classification === 'critical_hub' ? 'bg-red-100 text-red-700' :
                centrality.centrality_classification === 'important_node' ? 'bg-orange-100 text-orange-700' :
                centrality.centrality_classification === 'isolated' ? 'bg-gray-100 text-gray-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {centrality.centrality_classification}
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => onExpandNeighborhood(node.id)}
          disabled={isExpanded}
          className={`w-full px-3 py-2 rounded text-sm ${
            isExpanded 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          {isExpanded ? 'Neighborhood Expanded' : 'Expand Neighborhood'}
        </button>
      </div>

      {/* Additional node properties */}
      <div>
        <h5 className="font-medium text-sm mb-2">Properties</h5>
        <div className="space-y-1 text-xs">
          {Object.entries(node).map(([key, value]) => {
            if (['id', 'label', 'type', 'node_type', 'site_name', 'status'].includes(key)) return null;
            return (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GraphExplorer;
