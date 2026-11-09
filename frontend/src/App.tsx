import { useEffect, useState } from 'react';
import {
  Alert,
  AppShell,
  Badge,
  Button,
  Code,
  Container,
  Group,
  Loader,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getBattery, getMonitorStatus, getViews, setMonitorInterval } from './api';
import { BatteryIcon } from './components/BatteryIcon';
import { DistanceIcon } from './components/DistanceIcon';
import { formatDateTime, formatDistance } from './format';
import { LivePage } from './pages/LivePage';
import { ViewPage } from './pages/ViewPage';
import type { BatteryStatus, HeaderStats, MonitorStatus, ViewSummary } from './types';

export function App() {
  const [views, setViews] = useState<ViewSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [battery, setBattery] = useState<BatteryStatus | null>(null);
  const [headerStats, setHeaderStats] = useState<HeaderStats | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [monitorPending, setMonitorPending] = useState<'stream' | '2h' | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const liveMode = monitorStatus?.interval === 'stream';

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    getViews(controller.signal)
      .then(setViews)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') {
          return;
        }
        setError(cause instanceof Error ? cause.message : String(cause));
      });

    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const controller = new AbortController();
    const loadBattery = () => {
      getBattery(controller.signal)
        .then(setBattery)
        .catch(() => {
          // Battery is decorative; keep the last known value on transient errors.
        });
    };

    loadBattery();
    const timer = setInterval(loadBattery, 60_000);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getMonitorStatus(controller.signal)
      .then(setMonitorStatus)
      .catch(() => {
        // The controls remain usable even if the initial status request fails.
      });
    return () => controller.abort();
  }, []);

  const changeMonitorInterval = async (value: 'stream' | '2h') => {
    setMonitorPending(value);
    setMonitorError(null);
    try {
      setMonitorStatus(await setMonitorInterval(value));
      navigate(value === 'stream' ? '/live' : '/view/v_steps');
    } catch (cause: unknown) {
      setMonitorError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setMonitorPending(null);
    }
  };

  return (
    <AppShell header={{ height: isMobile ? 104 : 76 }} padding="lg">
      <AppShell.Header className="app-header">
        <Group h="100%" px="md" gap="lg" className="app-header-inner">
          <Group gap="sm" wrap="nowrap" className="brand">
            <div className="brand-mark" aria-hidden="true">
              HD
            </div>
            <div>
              <Title order={3} className="brand-title">
                HealthDetails
              </Title>
              <Text size="xs" c="dimmed" className="brand-subtitle">
                j2208 band telemetry
              </Text>
            </div>
          </Group>

          <nav className="nav-scroll" aria-label="Schema views">
            <Group gap={4} wrap="nowrap" py={4} className="nav-items">
              {views.map((view) => (
                <Button
                  key={view.name}
                  component={Link}
                  to={`/view/${view.name}`}
                  size="compact-sm"
                  variant={location.pathname === `/view/${view.name}` ? 'light' : 'subtle'}
                  color="teal"
                  data-disabled={liveMode || undefined}
                  aria-disabled={liveMode || undefined}
                  tabIndex={liveMode ? -1 : undefined}
                  title={
                    liveMode
                      ? 'Stop streaming with 2 hr to browse the history views'
                      : undefined
                  }
                  onClick={(event) => {
                    if (liveMode) {
                      event.preventDefault();
                    }
                  }}
                >
                  {view.label}
                </Button>
              ))}
            </Group>
          </nav>

          <Group gap={6} wrap="nowrap" className="monitor-controls">
            <Text
              size="xs"
              c="dimmed"
              visibleFrom="md"
              className="monitor-label"
              title={monitorStatus?.message}
            >
              Monitor
            </Text>
            <Tooltip label="Start the continuous stream collector" withArrow>
              <Button
                size="compact-xs"
                variant={monitorStatus?.interval === 'stream' ? 'filled' : 'default'}
                color="teal"
                loading={monitorPending === 'stream'}
                disabled={monitorPending !== null && monitorPending !== 'stream'}
                onClick={() => changeMonitorInterval('stream')}
              >
                Stream
              </Button>
            </Tooltip>
            <Tooltip
              label="Stop streaming and run the batch collector every 2 hours"
              withArrow
            >
              <Button
                size="compact-xs"
                variant={monitorStatus?.interval === '2h' ? 'filled' : 'default'}
                color="teal"
                loading={monitorPending === '2h'}
                disabled={monitorPending !== null && monitorPending !== '2h'}
                onClick={() => changeMonitorInterval('2h')}
              >
                2 hr
              </Button>
            </Tooltip>
            {monitorError ? (
              <Text size="xs" c="red" visibleFrom="lg" title={monitorError}>
                Monitor error
              </Text>
            ) : null}
          </Group>

          <Group gap="xs" wrap="nowrap" className="status-badges">
            <DistanceBadge stats={headerStats} />
            <BatteryBadge battery={battery} />
            <Badge variant="light" color="teal" visibleFrom="md" className="schema-badge">
              schema <Code bg="transparent" c="teal">j2208</Code>
            </Badge>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" px={0}>
          {error ? (
            <Alert color="red" title="Could not reach the HealthDetails API">
              <Text size="sm">{error}</Text>
              <Button mt="sm" size="compact-sm" onClick={() => setAttempt((value) => value + 1)}>
                Retry
              </Button>
            </Alert>
          ) : views.length === 0 ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to="/view/v_hr" replace />} />
              <Route path="/view/:name" element={<ViewPage onSummary={setHeaderStats} />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="*" element={<Navigate to="/view/v_hr" replace />} />
            </Routes>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

function DistanceBadge({ stats }: { stats: HeaderStats | null }) {
  if (!stats || stats.distanceKm === null) {
    return null;
  }

  return (
    <Tooltip label={`Total distance for ${stats.label}`} withArrow>
      <Badge
        variant="light"
        color="blue"
        leftSection={<DistanceIcon />}
        className="distance-badge"
        tt="none"
      >
        {formatDistance(stats.distanceKm)}
      </Badge>
    </Tooltip>
  );
}

function BatteryBadge({ battery }: { battery: BatteryStatus | null }) {
  if (!battery) {
    return null;
  }

  const color = battery.percent <= 20 ? 'red' : battery.percent <= 50 ? 'yellow' : 'teal';
  const tooltip = `Battery ${battery.percent}% · ${battery.mode} · ${formatDateTime(battery.ts)}`;

  return (
    <Tooltip label={tooltip} withArrow>
      <Badge
        variant="light"
        color={color}
        leftSection={<BatteryIcon percent={battery.percent} />}
        className="battery-badge"
      >
        {battery.percent}%
      </Badge>
    </Tooltip>
  );
}
