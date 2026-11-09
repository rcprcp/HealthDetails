import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Box, Group, Paper, Text, Title } from '@mantine/core';
import type { ChartPoint } from '../chart';
import { formatAxisTime, formatDateTime } from '../format';

const BASELINE = 40;
const ABOVE_COLOR = 'var(--mantine-color-teal-6)';
const BELOW_COLOR = 'var(--mantine-color-orange-6)';

interface PulseBar {
  x: string;
  base: number;
  delta: number;
  pulse: number;
  above: boolean;
  systolic?: number;
  diastolic?: number;
}

interface PulsePressureChartProps {
  points: ChartPoint[];
}

export function PulsePressureChart({ points }: PulsePressureChartProps) {
  const data: PulseBar[] = points
    .filter((point) => typeof point.pulse_pressure === 'number')
    .map((point) => {
      const pulse = point.pulse_pressure as number;
      const above = pulse >= BASELINE;
      return {
        x: point.x,
        base: Math.min(pulse, BASELINE),
        delta: Math.abs(pulse - BASELINE),
        pulse,
        above,
        systolic: typeof point.bp_sys === 'number' ? point.bp_sys : undefined,
        diastolic: typeof point.bp_dia === 'number' ? point.bp_dia : undefined,
      };
    });

  if (data.length === 0) {
    return (
      <Paper withBorder p="lg" radius="md">
        <Title order={4}>Pulse pressure over time</Title>
        <Text c="dimmed" size="sm" mt="sm">
          No pulse pressure data yet.
        </Text>
      </Paper>
    );
  }

  const values = data.map((entry) => entry.pulse);
  const domainMin = Math.max(0, Math.min(BASELINE, ...values) - 5);
  const domainMax = Math.max(BASELINE, ...values) + 5;
  const tickInterval = Math.max(0, Math.ceil(data.length / 8) - 1);

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="flex-start" mb="md" gap="sm">
        <div>
          <Title order={4}>Pulse pressure over time</Title>
          <Text size="xs" c="dimmed">
            {data.length.toLocaleString()} readings, bars extend from the {BASELINE} mmHg line
            (systolic − diastolic)
          </Text>
        </div>
        <Badge variant="light" color="teal">
          Pulse pressure (mmHg)
        </Badge>
      </Group>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }} barCategoryGap={0} barGap={0}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="x"
            interval={tickInterval}
            angle={-25}
            textAnchor="end"
            height={56}
            tickFormatter={(value: string) => formatAxisTime(value)}
          />
          <YAxis domain={[domainMin, domainMax]} width={48} />
          <ReferenceLine
            y={BASELINE}
            stroke="var(--mantine-color-gray-6)"
            strokeDasharray="4 4"
            label={{ value: String(BASELINE), position: 'insideRight' }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) {
                return null;
              }
              const datum = payload[0].payload as PulseBar;
              return (
                <Paper withBorder p="xs" radius="sm" shadow="sm">
                  <Text size="xs" c="dimmed">
                    {formatDateTime(datum.x)}
                  </Text>
                  <Text size="sm" fw={700}>
                    Pulse pressure {datum.pulse} mmHg
                  </Text>
                  {datum.systolic !== undefined && datum.diastolic !== undefined ? (
                    <Text size="xs" c="dimmed">
                      {datum.systolic} / {datum.diastolic} mmHg
                    </Text>
                  ) : null}
                </Paper>
              );
            }}
          />
          <Bar dataKey="base" stackId="pulse" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="delta" stackId="pulse" isAnimationActive={false}>
            {data.map((entry) => (
              <Cell
                key={`${entry.x}-${entry.pulse}`}
                fill={entry.above ? ABOVE_COLOR : BELOW_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Group gap="md" mt="sm" wrap="wrap">
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, backgroundColor: ABOVE_COLOR }} />
          <Text size="xs">{BASELINE} or above</Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box w={10} h={10} style={{ borderRadius: 2, backgroundColor: BELOW_COLOR }} />
          <Text size="xs">Below {BASELINE}</Text>
        </Group>
      </Group>
    </Paper>
  );
}
