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
  yAxisId?: 'left' | 'right';
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

  const isStageChart = chart.stageKey !== null && chart.stages.length > 0;
  const singleSeries = chart.series.length === 1 ? chart.series[0] : null;
  const hasRightAxis = chart.series.some((series) => series.yAxisId === 'right');
  const leftSeries = chart.series.find((series) => series.yAxisId !== 'right');
  const rightSeries = chart.series.find((series) => series.yAxisId === 'right');
  const chartTitle = isStageChart
    ? `${data.label} stages over time`
    : chart.cumulative
      ? `Cumulative ${data.label.toLowerCase()} over time`
      : singleSeries
        ? `${singleSeries.label} over time`
        : `${data.label} over time`;
  const units = [...new Set(chart.series.map((series) => series.unit).filter(Boolean))];
  const unitLabel = units.length === 1 ? units[0] : '';
  const badgeText = isStageChart
    ? `${data.label} stages`
    : chart.cumulative
      ? 'Cumulative'
      : singleSeries
        ? `${singleSeries.label} (${singleSeries.unit})`
        : `${data.label}${unitLabel ? ` (${unitLabel})` : ''}`;
  const badgeColor =
    isStageChart || chart.cumulative
      ? 'teal'
      : singleSeries
        ? singleSeries.color.split('.')[0]
        : 'gray';
  const yAxisLabel = leftSeries
    ? `${leftSeries.label}${leftSeries.unit ? ` (${leftSeries.unit})` : ''}`
    : undefined;
  const rightYAxisLabel = rightSeries
    ? `${rightSeries.label}${rightSeries.unit ? ` (${rightSeries.unit})` : ''}`
    : undefined;

  const values = isStageChart
    ? []
    : numericValues(
        points,
        chart.series.map((series) => series.key),
      );
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;
  const padding = Math.max(2, Math.round((maximum - minimum) * 0.1));
  const average =
    !isStageChart && singleSeries
      ? (points[0]?.[`${singleSeries.key}_average`] as number | undefined)
      : undefined;

  const series: Series[] = chart.series.map((item) => ({
    name: item.key,
    label: item.unit ? `${item.label} (${item.unit})` : item.label,
    color: item.color,
    ...(item.yAxisId ? { yAxisId: item.yAxisId } : {}),
  }));

  if (!isStageChart && chart.averageLine) {
    for (const item of chart.series) {
      series.push({
        name: `${item.key}_average`,
        label: `${item.label} overall average`,
        color: 'orange.6',
      });
    }
  }

  if (!isStageChart && chart.movingAveragePeriod > 1) {
    for (const item of chart.series) {
      series.push({
        name: `${item.key}_movingAverage`,
        label: `${item.label} ${chart.movingAveragePeriod}-period moving average`,
        color: 'grape.6',
      });
    }
  }

  const stageLevels = chart.stages.map((stage) => stage.level);
  const stageLabelByLevel = new Map(chart.stages.map((stage) => [stage.level, stage.label]));
  const yAxisProps = isStageChart
    ? {
        domain: [0.5, Math.max(...stageLevels) + 0.5],
        ticks: stageLevels,
        width: 64,
        tickFormatter: (value: number) => stageLabelByLevel.get(Number(value)) ?? '',
      }
    : hasRightAxis
      ? { width: 64 }
      : { domain: [minimum - padding, maximum + padding], width: 48 };

  const pointLabel = isStageChart ? 'stage-minutes' : 'points';

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="flex-start" mb="md" gap="sm">
        <div>
          <Title order={4}>{chartTitle}</Title>
          <Text size="xs" c="dimmed">
            {points.length.toLocaleString()} {pointLabel} from {data.name}, oldest to newest
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
        curveType={chart.type === 'step' ? 'stepAfter' : 'linear'}
        withDots={points.length <= 80}
        withLegend={!isStageChart && series.length > 1}
        connectNulls={!isStageChart}
        yAxisProps={yAxisProps}
        withRightYAxis={hasRightAxis}
        yAxisLabel={yAxisLabel}
        rightYAxisLabel={rightYAxisLabel}
        rightYAxisProps={hasRightAxis ? { width: 64 } : undefined}
        xAxisProps={{
          minTickGap: 48,
          angle: -25,
          textAnchor: 'end',
          height: 56,
          tickFormatter: (value: string) => formatAxisTime(value),
        }}
        tooltipProps={{
          labelFormatter: (value) => formatDateTime(String(value)),
          formatter: (value) => {
            if (isStageChart) {
              const stage = chart.stages.find((item) => item.level === Number(value));
              return stage?.label ?? String(value);
            }
            return value;
          },
        }}
      />
    </Paper>
  );
}
