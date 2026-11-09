import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { getLiveLatest } from '../api';
import { formatDateTime } from '../format';
import type { LiveReading } from '../types';

type LiveState = 'connecting' | 'live' | 'stale' | 'waiting';

const STALE_AFTER_MS = 5_000;

interface Metric {
  label: string;
  value: number | null | undefined;
  unit: string;
  color: string;
}

export function LivePage() {
  const [reading, setReading] = useState<LiveReading | null>(null);
  const [state, setState] = useState<LiveState>('connecting');
  const lastMessageAt = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    getLiveLatest(controller.signal)
      .then((latest) => {
        if (!mounted) {
          return;
        }
        if (latest) {
          setReading(latest);
          lastMessageAt.current = Date.now();
          setState('live');
        } else {
          setState('waiting');
        }
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
        const next = JSON.parse(event.data) as LiveReading;
        setReading(next);
        lastMessageAt.current = Date.now();
        setState('live');
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

  const metrics: Metric[] = [
    { label: 'Heart rate', value: reading?.hr, unit: 'bpm', color: 'red.7' },
    { label: 'SpO2', value: reading?.spo2, unit: '%', color: 'blue.7' },
    { label: 'Systolic', value: reading?.bpSys, unit: 'mmHg', color: 'grape.7' },
    { label: 'Diastolic', value: reading?.bpDia, unit: 'mmHg', color: 'grape.7' },
  ];

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
            {reading ? formatDateTime(reading.ts) : 'No reading yet'}
          </Text>
        </Group>
      </Group>

      {!reading ? (
        <Alert color="blue" title="Waiting for live data">
          Start the Stream collector to populate <code>j2208.live</code>. This page will
          update automatically when readings arrive.
        </Alert>
      ) : null}

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        {metrics.map((metric) => (
          <Paper key={metric.label} withBorder p="xl" radius="md">
            <Text size="sm" c="dimmed" tt="uppercase" fw={600}>
              {metric.label}
            </Text>
            <Group align="baseline" gap={6} mt="sm" wrap="nowrap">
              <Text
                fw={800}
                lh={1}
                c={metric.color}
                fz={{ base: 48, sm: 72, md: 88 }}
              >
                {metric.value ?? '—'}
              </Text>
              <Text size="sm" c="dimmed">
                {metric.unit}
              </Text>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          Device: {reading?.deviceId ?? '—'}
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
