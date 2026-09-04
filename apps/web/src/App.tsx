import {
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { BrowserRouter, NavLink as RouterNavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useUiStore } from './store';
import { HeatingDashboard } from './dashboards/heating';
import { HeatingCanvas } from './canvas';
import './app.css';

const navigation = [
  { label: 'Overview', path: '/' },
  { label: 'Floor heating', path: '/heating' },
  { label: 'Electrical', path: '/electrical' },
  { label: 'Water + sewage', path: '/water-sewage' },
  { label: 'Exports', path: '/exports' },
];

function Navigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Stack gap={4}>
      <Text className="eyebrow">Workspace</Text>
      {navigation.map((item) => (
        <NavLink
          key={item.path}
          component={RouterNavLink}
          to={item.path}
          label={item.label}
          onClick={onNavigate}
          end={item.path === '/'}
          className="navigation-link"
        />
      ))}
    </Stack>
  );
}

function PagePlaceholder({ title, code, description }: { title: string; code: string; description: string }) {
  return (
    <Stack gap="xl" className="page-content">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text className="eyebrow">Dashboard / {code}</Text>
          <Title order={1}>{title}</Title>
        </div>
        <Badge variant="light" color="gray">Phase 0 shell</Badge>
      </Group>
      <Paper className="canvas-placeholder" p="xl" withBorder>
        <Stack align="center" justify="center" gap="xs">
          <Text className="placeholder-mark">[ ]</Text>
          <Title order={3}>Canvas placeholder</Title>
          <Text c="dimmed" ta="center" maw={420}>{description}</Text>
          <Text size="xs" c="dimmed" tt="uppercase">Geometry arrives in Phase 1</Text>
        </Stack>
      </Paper>
    </Stack>
  );
}

function RoutedApp() {
  const [opened, setOpened] = useState(false);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
      className="app-shell"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={() => setOpened((value) => !value)} hiddenFrom="sm" aria-label="Toggle navigation" />
            <Text className="brand">BYLDER<span>/</span></Text>
            <Badge className="local-badge" variant="dot" color="teal">LOCAL MODE</Badge>
          </Group>
          <Button variant="subtle" color="gray" size="sm" onClick={toggleTheme} aria-label="Toggle color theme">
            {theme === 'light' ? 'Dark theme' : 'Light theme'}
          </Button>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Navigation onNavigate={() => setOpened(false)} />
        </AppShell.Section>
        <Divider my="md" />
        <AppShell.Section>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">PROJECT</Text>
            <Text size="xs" c="teal">READY</Text>
          </Group>
          <Text size="sm">Untitled project</Text>
          <Text size="xs" c="dimmed">Changes stay on this device</Text>
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <Box className="route-frame" key={location.pathname}>
          <Routes>
            <Route path="/" element={<PagePlaceholder title="Project overview" code="OVR-00" description="Start a local building project and its installation dashboards will appear here." />} />
            <Route path="/heating" element={<HeatingDashboard />} />
            <Route path="/heating/canvas" element={<HeatingCanvas />} />
            <Route path="/electrical" element={<PagePlaceholder title="Electrical" code="ELC-01" description="Electrical loads, circuits, and distribution planning will be available here." />} />
            <Route path="/water-sewage" element={<PagePlaceholder title="Water + sewage" code="WTR-01" description="Water supply and sewage routing will be available here." />} />
            <Route path="/exports" element={<PagePlaceholder title="Exports" code="EXP-01" description="Generated project documents and schedules will be available here." />} />
            <Route path="*" element={<PagePlaceholder title="Page not found" code="404" description="This project route does not exist." />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}
