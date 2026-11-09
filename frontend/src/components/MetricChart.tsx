import { LineChart } from '@mantine/charts';
import { Badge, Group, Paper, Text, Title } from '@mantine/core';
import type { ChartPoint } from '../chart';
import { formatAxisTime, formatDateTime } from '../format';
import type { TableData } from '../types';

interface MetricChartProps {
  data: TableData;
  points: ChartPoint[];
}

interface Series {
  name: string;
  label: string;
  color: string;
}

export function MetricChart({ data, points }: MetricChartProps) {
  const chart = data.chart;

  if (!chart) {
    return null;
  }

  if (points.length === 0) {
    return (
      <Paper withBorder p="lg" radius="md">
        <Title order={4}>{chart.label} over time</Title>
        <Text c="dimmed" size="sm" mt="sm">
          No chartable data yet.
        </Text>
      </Paper>
    );
  }

  const values = points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(2, Math.round((maximum - minimum) * 0.1));
  const colorName = chart.color.split('.')[0];
  const average = points[0]?.average;

  const series: Series[] = [
    { name: 'value', label: `${chart.label} (${chart.unit})`, color: chart.color },
  ];

  if (chart.averageLine) {
    series.push({ name: 'average', label: 'Overall average', color: 'orange.6' });
  }

  if (chart.movingAveragePeriod > 1) {
    series.push({
      name: 'movingAverage',
      label: `${chart.movingAveragePeriod}-period moving average`,
      color: 'grape.6',
    });
  }

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="flex-start" mb="md" gap="sm">
        <div>
          <Title order={4}>{chart.label} over time</Title>
          <Text size="xs" c="dimmed">
            {points.length.toLocaleString()} points from {data.name}, oldest to newest
            {average !== undefined ? ` · overall average ${average}${chart.unit}` : ''}
          </Text>
        </div>
        <Badge variant="light" color={colorName}>
          {chart.label} ({chart.unit})
        </Badge>
      </Group>

      <LineChart
        h={300}
        data={points}
        dataKey="x"
        series={series}
        curveType="linear"
        withDots={points.length <= 80}
        withLegend={series.length > 1}
        connectNulls
        yAxisProps={{ domain: [minimum - padding, maximum + padding], width: 48 }}
        xAxisProps={{
          minTickGap: 48,
          angle: -25,
          textAnchor: 'end',
          height: 56,
          tickFormatter: (value: string) => formatAxisTime(value),
        }}
        tooltipProps={{
          labelFormatter: (value) => formatDateTime(String(value)),
        }}
      />
    </Paper>
  );
}
