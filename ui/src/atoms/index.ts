import { atomWithStorage } from 'jotai/utils';
import { atom } from 'jotai';

// Theme
export const colorModeAtom = atomWithStorage('colorMode', 'system');

// Layout
export const sidebarWidthAtom = atomWithStorage('sidebarWidth', 280);
export const sidebarCollapsedAtom = atomWithStorage('sidebarCollapsed', false);

// View Settings
export const tablePageSizeAtom = atomWithStorage('tablePageSize', 10);
export const tableDensityAtom = atomWithStorage('tableDensity', 'comfortable');
export const tableColumnsAtom = atomWithStorage('tableColumns', {
  tickets: ['id', 'status', 'priority', 'summary', 'assignedTo', 'createdAt'],
  alerts: ['id', 'level', 'code', 'asset', 'raisedAt', 'status'],
});

// Graph Settings
export const graphLayoutAtom = atomWithStorage('graphLayout', 'force');
export const graphZoomLevelAtom = atomWithStorage('graphZoomLevel', 1);
export const graphPhysicsEnabledAtom = atomWithStorage('graphPhysicsEnabled', true);
export const nodeHighlightAtom = atom<string | null>(null);
export const selectedNodeAtom = atom<string | null>(null);
export const nodeNeighborsAtom = atom<string[]>([]);

// Filter State
export const dateRangeAtom = atomWithStorage('dateRange', {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
  end: new Date().toISOString(),
});

export const ticketFiltersAtom = atomWithStorage('ticketFilters', {
  status: [] as string[],
  priority: [] as number[],
  categories: [] as number[],
  assignedTo: [] as number[],
});

export const alertFiltersAtom = atomWithStorage('alertFilters', {
  level: [] as string[],
  code: [] as string[],
  status: [] as string[],
  assets: [] as number[],
});

export const graphFiltersAtom = atomWithStorage('graphFilters', {
  nodeTypes: [] as string[],
  edgeTypes: [] as string[],
  depth: 2,
});

// Search
export const searchQueryAtom = atom('');
export const searchHistoryAtom = atomWithStorage('searchHistory', [] as string[]);
export const searchResultsAtom = atom<any[]>([]);

// Notifications
export const notificationsAtom = atomWithStorage('notifications', {
  alerts: true,
  tickets: true,
  mentions: true,
  updates: true,
});

// User Preferences
export const userPreferencesAtom = atomWithStorage('userPreferences', {
  notifications: {
    desktop: true,
    email: true,
    sound: true,
  },
  dashboard: {
    defaultView: 'tickets',
    widgets: [
      'openTickets',
      'activeAlerts',
      'recentActivity',
      'teamWorkload',
    ],
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    largeText: false,
  },
});
