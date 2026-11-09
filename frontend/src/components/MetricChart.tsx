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

function numericValues(points: ChartPoint[], keys: string[]): number[] {
  return points.flatMap((point) =>
    keys
      .map((key) => point[key])
      .filter((value): value is number => typeof value === 'number'),
  );
}

export function MetricChart({ data, points }: MetricChartProps) {
  const chart = data.chart;

  if (!chart) {
    return null;
  }

  if (points.length === 0) {
    return (
      <Paper withBorder p="lg" radius="md">
        <Title order={4}>{data.label} over time</Title>
        <Text c="dimmed" size="sm" mt="sm">
          No chartable data yet.
        </Text>
      </Paper>
    );
  }

  const singleSeries = chart.series.length === 1 ? chart.series[0] : null;
  const chartTitle = singleSeries
    ? `${singleSeries.label} over time`
    : `${data.label} over time`;
  const units = [...new Set(chart.series.map((series) => series.unit).filter(Boolean))];
  const unitLabel = units.length === 1 ? units[0] : '';
  const badgeText = singleSeries
    ? `${singleSeries.label} (${singleSeries.unit})`
    : `${data.label}${unitLabel ? ` (${unitLabel})` : ''}`;
  const badgeColor = singleSeries ? singleSeries.color.split('.')[0] : 'gray';

  const values = numericValues(
    points,
    chart.series.map((series) => series.key),
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(2, Math.round((maximum - minimum) * 0.1));
  const average = singleSeries
    ? (points[0]?.[`${singleSeries.key}_average`] as number | undefined)
    : undefined;

  const series: Series[] = chart.series.map((item) => ({
    name: item.key,
    label: item.unit ? `${item.label} (${item.unit})` : item.label,
    color: item.color,
  }));

  if (chart.averageLine) {
    for (const item of chart.series) {
      series.push({
        name: `${item.key}_average`,
        label: `${item.label} overall average`,
        color: 'orange.6',
      });
    }
  }

  if (chart.movingAveragePeriod > 1) {
    for (const item of chart.series) {
      series.push({
        name: `${item.key}_movingAverage`,
        label: `${item.label} ${chart.movingAveragePeriod}-period moving average`,
        color: 'grape.6',
      });
    }
  }

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="flex-start" mb="md" gap="sm">
        <div>
          <Title order={4}>{chartTitle}</Title>
          <Text size="xs" c="dimmed">
            {points.length.toLocaleString()} points from {data.name}, oldest to newest
            {average !== undefined
              ? ` · overall average ${average}${singleSeries?.unit ?? ''}`
              : ''}
          </Text>
        </div>
        <Badge variant="light" color={badgeColor}>
          {badgeText}
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
