import { FC } from 'react';
import { Box } from '@chakra-ui/react';
import { EChartsOption } from 'echarts';
import ReactECharts from 'echarts-for-react';

interface LineChartProps {
  data: Array<{ date: string; avgHours: number }>;
}

export const LineChart: FC<LineChartProps> = ({ data }) => {
  const option: EChartsOption = {
    xAxis: {
      type: 'category',
      data: data.map(d => new Date(d.date).toLocaleDateString()),
    },
    yAxis: {
      type: 'value',
      name: 'Hours',
    },
    series: [
      {
        data: data.map(d => d.avgHours),
        type: 'line',
        smooth: true,
        itemStyle: { color: '#3182CE' },
        areaStyle: { opacity: 0.1 },
      },
    ],
    tooltip: {
      trigger: 'axis',
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

export default LineChart;
