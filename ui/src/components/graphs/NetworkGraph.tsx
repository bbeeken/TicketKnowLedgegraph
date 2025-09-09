import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ReactFlowProvider,
  NodeProps,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import useStore from '@/lib/store';

interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
}

// Custom node components
const SiteNode: FC<NodeProps> = ({ data }) => (
  <div style={{ background: '#4299E1', color: 'white', padding: '10px', borderRadius: '5px' }}>
    <Handle type="target" position={Position.Top} />
    {data.label}
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const AssetNode: FC<NodeProps> = ({ data }) => (
  <div style={{ background: '#48BB78', color: 'white', padding: '10px', borderRadius: '5px' }}>
    <Handle type="target" position={Position.Top} />
    {data.label}
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const AlertNode: FC<NodeProps> = ({ data }) => (
  <div style={{ background: '#F56565', color: 'white', padding: '10px', borderRadius: '5px' }}>
    <Handle type="target" position={Position.Top} />
    {data.label}
    <Handle type="source" position={Position.Bottom} />
  </div>
);

const TicketNode: FC<NodeProps> = ({ data }) => (
  <div style={{ background: '#9F7AEA', color: 'white', padding: '10px', borderRadius: '5px' }}>
    <Handle type="target" position={Position.Top} />
    {data.label}
    <Handle type="source" position={Position.Bottom} />
  </div>
);

// Node types mapping
const nodeTypes = {
  site: SiteNode,
  asset: AssetNode,
  alert: AlertNode,
  ticket: TicketNode
};

const NetworkGraph: FC<Props> = ({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick
}) => {
  const layout = useStore((state) => state.graphLayout);

  // Calculate layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
    nodes,
    edges,
    layout
  );

  return (
    <Box height="100%" minHeight="600px">
      <ReactFlowProvider>
        <ReactFlow
          nodes={layoutedNodes}
          edges={layoutedEdges}
          onNodeClick={(_, node) => onNodeClick?.(node)}
          onEdgeClick={(_, edge) => onEdgeClick?.(edge)}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
};

// Helper function to calculate graph layout
function getLayoutedElements(nodes: Node[], edges: Edge[], layout: string) {
  if (layout === 'force') {
    return { nodes, edges }; // ReactFlow handles force layout internally
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = layout === 'hierarchical';
  dagreGraph.setGraph({ rankdir: isHorizontal ? 'LR' : 'TB' });

  // Add nodes to dagre
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 150, height: 50 });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Get positioned nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 75,
        y: nodeWithPosition.y - 25
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}

export default NetworkGraph;
