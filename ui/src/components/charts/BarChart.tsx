import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';

interface BarChartProps {
  data: Array<{ type: string; count: number; color: string }>;
}

export const BarChart: FC<BarChartProps> = ({ data }) => {
  const option: EChartsOption = {
    xAxis: {
      type: 'category',
      data: data.map(d => d.type),
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: data.map(d => ({
          value: d.count,
          itemStyle: { color: d.color },
        })),
        type: 'bar',
        barWidth: '60%',
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  };

  return (
    <Box w="100%" h="300px">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default BarChart;
