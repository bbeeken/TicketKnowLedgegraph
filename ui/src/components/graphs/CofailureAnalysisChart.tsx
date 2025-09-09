import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import { Card, CardHeader, CardBody } from '@chakra-ui/react';
import { getCofailures } from '@/lib/api/kg';

interface Props {
  nodeId: string;
  windowMinutes?: number;
}

const CofailureAnalysisChart: FC<Props> = ({ nodeId, windowMinutes = 120 }) => {
  const { data, isLoading, error } = useQuery(
    ['cofailures', nodeId, windowMinutes],
    () => getCofailures(nodeId, windowMinutes)
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading co-failure data</div>;
  if (!data) return null;

  const option = {
    title: {
      text: 'Co-Failure Analysis',
      subtext: `${windowMinutes} minute window`,
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} co-failures'
    },
    series: [
      {
        name: 'Co-Failures',
        type: 'graph',
        layout: 'circular',
        data: transformToGraphData(data).nodes,
        links: transformToGraphData(data).links,
        categories: [
          { name: 'Target' },
          { name: 'Co-Fail' }
        ],
        roam: true,
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        force: {
          repulsion: 100
        }
      }
    ]
  };

  return (
    <Card>
      <CardHeader>
        <h3>Co-Failure Pattern Analysis</h3>
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

// Helper function to transform graph data to ECharts format
function transformToGraphData(graphData: any) {
  const nodes = graphData.nodes.map((node: any) => ({
    id: node.id,
    name: node.label,
    value: 1, // Size based on number of connections
    category: node.id === graphData.rootId ? 0 : 1,
    symbolSize: node.id === graphData.rootId ? 50 : 30
  }));

  const links = graphData.edges.map((edge: any) => ({
    source: edge.source,
    target: edge.target,
    value: edge.properties?.weight || 1
  }));

  return { nodes, links };
}

export default CofailureAnalysisChart;
