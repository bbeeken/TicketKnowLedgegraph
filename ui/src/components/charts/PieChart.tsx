import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';

interface PieChartProps {
  data: Array<{ status: string; count: number; color: string }>;
}

export const PieChart: FC<PieChartProps> = ({ data }) => {
  const option: EChartsOption = {
    series: [
      {
        type: 'pie',
        data: data.map(item => ({
          name: item.status,
          value: item.count,
          itemStyle: { color: item.color },
        })),
        radius: ['40%', '70%'],
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold',
          },
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
  };

  return (
    <Box w="100%" h="300px">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default PieChart;
