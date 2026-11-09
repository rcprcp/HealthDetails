import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { getLiveRecent, getLiveSnapshot } from '../api';
import { formatDateTime, formatElapsed, formatSecondsOld } from '../format';
import type { LiveReading } from '../types';

type LiveState = 'connecting' | 'live' | 'stale' | 'waiting';
type MetricKey = 'hr' | 'spo2' | 'bpSys' | 'bpDia';

interface MetricSnapshot {
  value: number;
  ts: string;
}

type MetricSnapshots = Partial<Record<MetricKey, MetricSnapshot>>;

interface Metric {
  key: MetricKey;
  label: string;
  value: number | null | undefined;
  ts: string | null | undefined;
  unit: string;
  color: string;
}

const STALE_AFTER_MS = 5_000;
const MAX_ROWS = 100;
const METRIC_KEYS: MetricKey[] = ['hr', 'spo2', 'bpSys', 'bpDia'];

function readingKey(reading: LiveReading): string {
  return `${reading.deviceId}|${reading.ts}`;
}

function hasValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0;
}

export function LivePage() {
  const [rows, setRows] = useState<LiveReading[]>([]);
  const [metrics, setMetrics] = useState<MetricSnapshots>({});
  const [state, setState] = useState<LiveState>('connecting');
  const [now, setNow] = useState(() => Date.now());
  const lastMessageAt = useRef(0);

  const applyReading = useCallback((next: LiveReading) => {
    setRows((previous) => {
      const key = readingKey(next);
      if (previous.some((row) => readingKey(row) === key)) {
        return previous;
      }
      const merged = [next, ...previous];
      merged.sort((left, right) => Date.parse(right.ts) - Date.parse(left.ts));
      return merged.slice(0, MAX_ROWS);
    });

    setMetrics((previous) => {
      const updated = { ...previous };
      let changed = false;

      for (const metricKey of METRIC_KEYS) {
        const value = next[metricKey];
        if (!hasValue(value)) {
          continue;
        }

        const current = previous[metricKey];
        if (current && Date.parse(current.ts) > Date.parse(next.ts)) {
          continue;
        }

        if (!current || current.value !== value || current.ts !== next.ts) {
          updated[metricKey] = { value, ts: next.ts };
          changed = true;
        }
      }

      return changed ? updated : previous;
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const accept = (next: LiveReading) => {
      applyReading(next);
      lastMessageAt.current = Date.now();
      setState('live');
    };

    getLiveSnapshot(controller.signal)
      .then((snapshot) => {
        if (!mounted || !snapshot) {
          return;
        }
        setMetrics((previous) => {
          const seeded = { ...previous };
          for (const metricKey of METRIC_KEYS) {
            const metric = snapshot[metricKey];
            if (!metric) {
              continue;
            }
            const current = seeded[metricKey];
            if (!current || Date.parse(metric.ts) >= Date.parse(current.ts)) {
              seeded[metricKey] = { value: metric.value, ts: metric.ts };
            }
          }
          return seeded;
        });
      })
      .catch(() => {
        // The cards fill in as soon as the stream delivers a non-zero reading.
      });

    getLiveRecent(50, controller.signal)
      .then((recent) => {
        if (!mounted) {
          return;
        }
        if (recent.length === 0) {
          setState('waiting');
          return;
        }
        recent.forEach(applyReading);
        const newest = recent[0];
        setState(Date.now() - Date.parse(newest.ts) > STALE_AFTER_MS ? 'stale' : 'live');
      })
      .catch(() => {
        if (mounted) {
          setState('waiting');
        }
      });

    const source = new EventSource('/api/live/stream');

    source.onmessage = (event) => {
      if (!mounted) {
        return;
      }
      try {
        accept(JSON.parse(event.data) as LiveReading);
      } catch {
        // Ignore malformed events and keep the last good reading.
      }
    };

    source.onerror = () => {
      if (!mounted) {
        return;
      }
      setState((previous) => (previous === 'live' ? 'stale' : 'waiting'));
    };

    const staleTimer = setInterval(() => {
      if (!mounted || lastMessageAt.current === 0) {
        return;
      }
      if (Date.now() - lastMessageAt.current > STALE_AFTER_MS) {
        setState('stale');
      }
    }, 1_000);

    return () => {
      mounted = false;
      controller.abort();
      source.close();
      clearInterval(staleTimer);
    };
  }, [applyReading]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const statusColor =
    state === 'live' ? 'teal' : state === 'stale' ? 'orange' : state === 'waiting' ? 'gray' : 'blue';
  const statusLabel =
    state === 'live'
      ? 'Live'
      : state === 'stale'
        ? 'Stale'
        : state === 'waiting'
          ? 'Waiting for data'
          : 'Connecting';

  const cards: Metric[] = [
    {
      key: 'hr',
      label: 'Heart rate',
      value: metrics.hr?.value,
      ts: metrics.hr?.ts,
      unit: 'bpm',
      color: 'red.7',
    },
    {
      key: 'spo2',
      label: 'SpO2',
      value: metrics.spo2?.value,
      ts: metrics.spo2?.ts,
      unit: '%',
      color: 'blue.7',
    },
    {
      key: 'bpSys',
      label: 'Systolic',
      value: metrics.bpSys?.value,
      ts: metrics.bpSys?.ts,
      unit: 'mmHg',
      color: 'grape.7',
    },
    {
      key: 'bpDia',
      label: 'Diastolic',
      value: metrics.bpDia?.value,
      ts: metrics.bpDia?.ts,
      unit: 'mmHg',
      color: 'grape.7',
    },
  ];

  const latest = rows[0];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="md">
        <div>
          <Title order={2}>Live vitals</Title>
          <Text c="dimmed" size="sm">
            Streaming from j2208.live
          </Text>
        </div>
        <Group gap="sm">
          <Badge variant="light" color={statusColor}>
            {statusLabel}
          </Badge>
          <Text size="sm" c="dimmed">
            {latest ? formatDateTime(latest.ts) : 'No reading yet'}
          </Text>
        </Group>
      </Group>

      {rows.length === 0 ? (
        <Alert color="blue" title="Waiting for live data">
          Start the Stream collector to populate <code>j2208.live</code>. This page will
          update automatically when readings arrive.
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        {cards.map((metric) => (
          <Paper key={metric.key} withBorder p="xl" radius="md">
            <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
              {metric.label}
            </Text>
            <Group align="baseline" gap={6} mt="sm" wrap="nowrap">
              <Text fw={800} lh={1} c={metric.color} fz={{ base: 48, sm: 72, md: 88 }}>
                {hasValue(metric.value) ? metric.value : '—'}
              </Text>
              <Text size="sm" c="dimmed">
                {metric.unit}
              </Text>
            </Group>
            <Text size="sm" c="dimmed" mt={6}>
              {metric.ts ? formatSecondsOld(metric.ts, now) : 'No value yet'}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Paper withBorder radius="md">
        <Group justify="space-between" align="center" p="md" gap="sm">
          <Group gap="sm">
            <Text fw={600}>Readings</Text>
            <Badge variant="light" color="gray">
              {rows.length}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            Newest first
          </Text>
        </Group>

        <div className="table-scroll live-table-scroll">
          <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>HR</Table.Th>
                <Table.Th>SpO2</Table.Th>
                <Table.Th>BP sys</Table.Th>
                <Table.Th>BP dia</Table.Th>
                <Table.Th>Age</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="lg">
                      Waiting for live readings.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows.map((row) => (
                  <Table.Tr key={readingKey(row)}>
                    <Table.Td>
                      <Text size="sm">{formatDateTime(row.ts)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <LiveCell value={row.hr} />
                    </Table.Td>
                    <Table.Td>
                      <LiveCell value={row.spo2} />
                    </Table.Td>
                    <Table.Td>
                      <LiveCell value={row.bpSys} />
                    </Table.Td>
                    <Table.Td>
                      <LiveCell value={row.bpDia} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatElapsed(row.ts, now)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Paper>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Device: {latest?.deviceId ?? '—'}
        </Text>
        <Text size="xs" c="dimmed">
          {state === 'live'
            ? 'Receiving updates'
            : state === 'stale'
              ? 'No recent updates'
              : 'Waiting for the collector'}
        </Text>
      </Group>
    </Stack>
  );
}

function LiveCell({ value }: { value: number | null | undefined }) {
  const present = hasValue(value);
  return (
    <Text size="sm" c={present ? undefined : 'dimmed'}>
      {present ? value : '—'}
    </Text>
  );
}
