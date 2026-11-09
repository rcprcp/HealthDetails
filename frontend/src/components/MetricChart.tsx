import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from '@mantine/charts';
import { Badge, Box, Group, Modal, Paper, Text, TextInput, Title } from '@mantine/core';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { applyMovingAverage } from '../chart';
import type { ChartPoint } from '../chart';
import { formatAxisTime, formatDateTime } from '../format';
import type { ChartSpec, TableData } from '../types';

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

interface StageDatum {
  x: string;
  base: number;
  height: number;
  stage: number;
  stageLabel: string;
}

function mantineColor(color: string): string {
  const [name, shade = '6'] = color.split('.');
  return `var(--mantine-color-${name}-${shade})`;
}

function numericValues(points: ChartPoint[], keys: string[]): number[] {
  return points.flatMap((point) =>
    keys
      .map((key) => point[key])
      .filter((value): value is number => typeof value === 'number'),
  );
}

function SleepStageChart({ chart, points }: { chart: ChartSpec; points: ChartPoint[] }) {
  const stages = [...chart.stages].sort((left, right) => left.level - right.level);
  const stageByLevel = new Map(stages.map((stage) => [stage.level, stage]));
  const data: StageDatum[] = points
    .filter((point) => typeof point.stage === 'number')
    .map((point) => {
      const level = Number(point.stage);
      return {
        x: point.x,
        base: level - 0.2,
        height: 0.4,
        stage: level,
        stageLabel: String(point.stageLabel ?? stageByLevel.get(level)?.label ?? ''),
      };
    });

  if (data.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No stage data yet.
      </Text>
    );
  }

  const maxLevel = Math.max(...stages.map((stage) => stage.level), 1);
  const tickInterval = Math.max(0, Math.ceil(data.length / 8) - 1);

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          barCategoryGap={0}
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            interval={tickInterval}
            angle={-25}
            textAnchor="end"
            height={56}
            tickFormatter={(value: string) => formatAxisTime(value)}
          />
          <YAxis
            type="number"
            domain={[0.5, maxLevel + 0.5]}
            ticks={stages.map((stage) => stage.level)}
            width={64}
            tickFormatter={(value: number) =>
              stageByLevel.get(Number(value))?.label ?? ''
            }
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }
              const datum = payload[0].payload as StageDatum;
              return (
                <Paper withBorder p="xs" radius="sm" shadow="sm">
                  <Text size="xs" c="dimmed">
                    {formatDateTime(String(label))}
                  </Text>
                  <Text size="sm" fw={600}>
                    {datum.stageLabel}
                  </Text>
                </Paper>
              );
            }}
          />
          <Bar
            dataKey="base"
            stackId="stage"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar dataKey="height" stackId="stage" isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={`${entry.x}-${entry.stage}`}
                fill={mantineColor(stageByLevel.get(entry.stage)?.color ?? 'gray.6')}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>

      <Group gap="md" mt="sm" wrap="wrap">
        {stages.map((stage) => (
          <Group key={stage.code} gap={6} wrap="nowrap">
            <Box
              w={10}
              h={10}
              style={{ borderRadius: 2, backgroundColor: mantineColor(stage.color) }}
            />
            <Text size="xs">{stage.label}</Text>
          </Group>
        ))}
      </Group>
    </>
  );
}

export function MetricChart({ data, points }: MetricChartProps) {
  const chart = data.chart;
  const defaultPeriod =
    chart && chart.movingAveragePeriod > 1
      ? Math.min(chart.movingAveragePeriod, Math.max(1, points.length))
      : 0;
  const [movingAveragePeriod, setMovingAveragePeriod] = useState(defaultPeriod);
  const [periodDraft, setPeriodDraft] = useState(String(defaultPeriod));
  const [periodError, setPeriodError] = useState<string | null>(null);
  const periodInputRef = useRef<HTMLInputElement>(null);

  const displayPoints = useMemo(
    () => (chart ? applyMovingAverage(points, chart, movingAveragePeriod) : points),
    [points, chart, movingAveragePeriod],
  );

  useEffect(() => {
    if (points.length > 0 && movingAveragePeriod > points.length) {
      const next = Math.max(1, points.length);
      setMovingAveragePeriod(next);
      setPeriodDraft(String(next));
    }
  }, [points.length, movingAveragePeriod]);

  if (!chart) {
    return null;
  }

  const renderPulsePressureTooltip = ({ active, payload, label }: TooltipContentProps) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0]?.payload as ChartPoint | undefined;
    const pulsePressure =
      typeof point?.pulse_pressure === 'number' ? point.pulse_pressure : undefined;

    return (
      <Paper withBorder p="xs" radius="sm" shadow="sm">
        <Text size="xs" c="dimmed">
          {formatDateTime(String(label))}
        </Text>
        {chart.series.map((item) => (
          <Group key={item.key} justify="space-between" gap="lg" mt={4} wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              <Box
                w={8}
                h={8}
                style={{ borderRadius: '50%', backgroundColor: mantineColor(item.color) }}
              />
              <Text size="sm">{item.label}</Text>
            </Group>
            <Text size="sm" fw={600}>
              {typeof point?.[item.key] === 'number' ? point[item.key] : '—'}
              {item.unit ? ` ${item.unit}` : ''}
            </Text>
          </Group>
        ))}
        <Group
          justify="space-between"
          gap="lg"
          mt="xs"
          pt="xs"
          wrap="nowrap"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="sm" c="dimmed">
            Pulse pressure
          </Text>
          <Text size="sm" fw={700}>
            {pulsePressure !== undefined ? `${pulsePressure} mmHg` : '—'}
          </Text>
        </Group>
      </Paper>
    );
  };

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
        displayPoints,
        chart.series.map((series) => series.key),
      );
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 0;
  const padding = chart.yPadding ?? Math.max(2, Math.round((maximum - minimum) * 0.1));
  const paddingDecimals =
    chart.yPadding == null ? 0 : (String(chart.yPadding).split('.')[1]?.length ?? 0);
  const normalize = (value: number) => {
    if (chart.yPadding == null) {
      return value;
    }
    const factor = 10 ** paddingDecimals;
    return Math.round(value * factor) / factor;
  };
  const domainMin =
    chart.yMinPadding != null
      ? Math.max(0, minimum - chart.yMinPadding)
      : normalize(minimum - padding);
  const domainMax = chart.yMax != null ? chart.yMax : normalize(maximum + padding);
  const average =
    !isStageChart && singleSeries
      ? (displayPoints[0]?.[`${singleSeries.key}_average`] as number | undefined)
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

  if (!isStageChart && chart.movingAveragePeriod > 1 && movingAveragePeriod > 1) {
    for (const item of chart.series) {
      series.push({
        name: `${item.key}_movingAverage`,
        label: `${item.label} ${movingAveragePeriod}-period moving average`,
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
      : {
          domain: [domainMin, domainMax],
          width: 48,
          ...(chart.yPadding != null
            ? { tickFormatter: (value: number) => value.toFixed(paddingDecimals) }
            : {}),
        };

  const pointLabel = isStageChart ? 'stage-minutes' : 'points';

  const supportsMovingAverage =
    !isStageChart && chart.movingAveragePeriod > 1 && points.length > 1;

  const applyPeriod = () => {
    const parsed = Number(periodDraft);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setPeriodError('Enter a whole number of at least 1.');
      return;
    }
    if (parsed > points.length) {
      setPeriodError(
        `The moving average period (${parsed}) cannot exceed the number of points on this chart (${points.length.toLocaleString()}).`,
      );
      return;
    }
    setMovingAveragePeriod(parsed);
    setPeriodDraft(String(parsed));
  };

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
        <Group gap="sm" align="flex-end" justify="flex-end" wrap="wrap">
          {supportsMovingAverage ? (
            <TextInput
              ref={periodInputRef}
              label="Moving average"
              description={`Periods (max ${points.length.toLocaleString()})`}
              type="number"
              min={1}
              max={points.length}
              value={periodDraft}
              onChange={(event) => setPeriodDraft(event.currentTarget.value)}
              onBlur={applyPeriod}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              size="xs"
              w={150}
            />
          ) : null}
          <Badge variant="light" color={badgeColor}>
            {badgeText}
          </Badge>
        </Group>
      </Group>

      {isStageChart ? (
        <SleepStageChart chart={chart} points={displayPoints} />
      ) : (
        <LineChart
          h={300}
          data={displayPoints}
          dataKey="x"
          series={series}
          curveType={chart.type === 'step' ? 'stepAfter' : 'linear'}
          withDots={displayPoints.length <= 80}
          withLegend={series.length > 1}
          connectNulls
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
          tooltipProps={
            chart.pulsePressure
              ? { content: renderPulsePressureTooltip }
              : {
                  labelFormatter: (value) => formatDateTime(String(value)),
                  formatter: (value) => {
                    if (isStageChart) {
                      const stage = chart.stages.find((item) => item.level === Number(value));
                      return stage?.label ?? String(value);
                    }
                    return value;
                  },
                }
          }
        />
      )}

      <Modal
        opened={periodError !== null}
        onClose={() => setPeriodError(null)}
        title="Invalid moving average period"
        centered
        onExitTransitionEnd={() => {
          periodInputRef.current?.focus();
          periodInputRef.current?.select();
        }}
      >
        <Text size="sm">{periodError}</Text>
      </Modal>
    </Paper>
  );
}
