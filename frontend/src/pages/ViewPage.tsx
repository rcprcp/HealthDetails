import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { getView } from '../api';
import { buildChartPoints } from '../chart';
import { DataTable } from '../components/DataTable';
import { MetricChart } from '../components/MetricChart';
import type { HeaderStats, TableData } from '../types';

interface ViewPageProps {
  onSummary: (stats: HeaderStats | null) => void;
}

export function ViewPage({ onSummary }: ViewPageProps) {
  const { name = '' } = useParams<{ name: string }>();
  const [data, setData] = useState<TableData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);

    getView(name, controller.signal)
      .then(setData)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [name, attempt]);

  useEffect(() => {
    document.title = data ? `${data.label} · HealthDetails` : 'HealthDetails';
  }, [data]);

  useEffect(() => {
    if (!data) {
      onSummary(null);
      return;
    }

    const hasDistance =
      data.name === 'v_steps' && data.columns.some((column) => column.name === 'distance_km');
    const distanceKm = hasDistance
      ? data.rows.reduce((sum, row) => {
          const value = Number(row.distance_km);
          return Number.isFinite(value) ? sum + value : sum;
        }, 0)
      : null;

    onSummary({ label: data.label, distanceKm });
    return () => onSummary(null);
  }, [data, onSummary]);

  const chartPoints = useMemo(() => (data ? buildChartPoints(data) : []), [data]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (error) {
    return (
      <Alert color="red" title="Could not load this view">
        <Text size="sm">{error}</Text>
        <Button mt="sm" size="compact-sm" onClick={() => setAttempt((value) => value + 1)}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="md">
        <div>
          <Group gap="sm">
            <Title order={2}>{data.label}</Title>
            <Badge variant="light" color="teal">
              {data.kind}
            </Badge>
            <Badge variant="outline" color="gray">
              {data.name}
            </Badge>
          </Group>
          <Text c="dimmed" size="sm" mt={4}>
            {data.description}
          </Text>
        </div>
        <Text size="sm" c="dimmed" className="row-count">
          {data.total.toLocaleString()} {data.total === 1 ? 'row' : 'rows'}
        </Text>
      </Group>

      {data.chart ? (
        <MetricChart key={`chart-${data.name}`} data={data} points={chartPoints} />
      ) : null}
      <DataTable key={`table-${data.name}`} data={data} />

      {data.total > data.rows.length ? (
        <Text size="xs" c="dimmed">
          Showing the newest {data.rows.length.toLocaleString()} of{' '}
          {data.total.toLocaleString()} rows.
        </Text>
      ) : null}
    </Stack>
  );
}
