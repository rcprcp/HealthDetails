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
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getViews } from './api';
import { ViewPage } from './pages/ViewPage';
import type { ViewSummary } from './types';

export function App() {
  const [views, setViews] = useState<ViewSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 48em)');

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
                >
                  {view.label}
                </Button>
              ))}
            </Group>
          </nav>

          <Badge variant="light" color="teal" visibleFrom="md" className="schema-badge">
            schema <Code bg="transparent" c="teal">j2208</Code>
          </Badge>
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
              <Route path="/view/:name" element={<ViewPage />} />
              <Route path="*" element={<Navigate to="/view/v_hr" replace />} />
            </Routes>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
