import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { Card, CardHeader, CardBody } from '@chakra-ui/react';
import { getBlastRadius } from '@/lib/api/kg';

interface Props {
  nodeId: string;
  type: 'network' | 'power' | 'food-safety';
}

const BlastRadiusChart: FC<Props> = ({ nodeId, type }) => {
  const { data, isLoading, error } = useQuery(
    ['blast-radius', nodeId, type],
    () => getBlastRadius(nodeId, type)
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading blast radius data</div>;
  if (!data) return null;

  const option = {
    title: {
      text: `${type.toUpperCase()} Impact Analysis`,
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c}'
    },
    series: [
      {
        name: 'Impact Level',
        type: 'tree',
        orient: 'vertical',
        data: [transformToTreeData(data)],
        top: '10%',
        bottom: '10%',
        layout: 'radial',
        symbol: 'emptyCircle',
        symbolSize: 7,
        initialTreeDepth: 3,
        animationDurationUpdate: 750,
        emphasis: {
          focus: 'descendant'
        }
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <h3>Blast Radius Analysis</h3>
      </CardHeader>
      <CardBody>
        <ReactECharts 
          option={option}
          style={{ height: '500px', width: '100%' }}
        />
      </CardBody>
    </Card>
  );
};

// Helper function to transform graph data to tree format
function transformToTreeData(graphData: any) {
  const { nodes, edges } = graphData;
  
  // Create nodes with children array
  interface TreeNode {
    id: any;
    name: any;
    value?: any;
    children: TreeNode[];
    [key: string]: any;
  }
  
  const nodesMap = new Map<any, TreeNode>(nodes.map((n: any) => [n.id, { ...n, children: [] } as TreeNode]));
  
  edges.forEach((e: any) => {
    const source = nodesMap.get(e.source);
    const target = nodesMap.get(e.target);
    if (source && target) {
      source.children.push(target);
    }
  });
  
  // Find root node (node with no incoming edges)
  const hasIncoming = new Set(edges.map((e: any) => e.target));
  const rootNode = nodes.find((n: any) => !hasIncoming.has(n.id));
  
  return nodesMap.get(rootNode.id);
}

export default BlastRadiusChart;
