import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Ticket } from '@/lib/api/tickets';
import type { Alert } from '@/lib/api/alerts';
import type { KnowledgeGraphNode } from '@/lib/api/kg';

interface AppState {
  // Selected Site/Context
  selectedSiteId: number | null;
  setSelectedSiteId: (id: number | null) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeView: 'tickets' | 'alerts' | 'graph' | 'analytics';
  setActiveView: (view: 'tickets' | 'alerts' | 'graph' | 'analytics') => void;
  
  // Current Selection State
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  selectedAlert: Alert | null;
  setSelectedAlert: (alert: Alert | null) => void;
  selectedNode: KnowledgeGraphNode | null;
  setSelectedNode: (node: KnowledgeGraphNode | null) => void;

  // Filter State
  ticketFilters: {
    status?: string;
    categoryId?: number;
    assignedToId?: number;
    fromDate?: string;
    toDate?: string;
  };
  setTicketFilters: (filters: {
    status?: string;
    categoryId?: number;
    assignedToId?: number;
    fromDate?: string;
    toDate?: string;
  }) => void;
  
  alertFilters: {
    level?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  };
  setAlertFilters: (filters: {
    level?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }) => void;
  
  graphFilters: {
    assetType?: string;
    depth?: number;
  };
  setGraphFilters: (filters: {
    assetType?: string;
    depth?: number;
  }) => void;
  
  // View Preferences
  graphLayout: 'force' | 'hierarchical' | 'radial';
  setGraphLayout: (layout: 'force' | 'hierarchical' | 'radial') => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial State
        selectedSiteId: null,
        setSelectedSiteId: (id) => set({ selectedSiteId: id }),

        sidebarOpen: true,
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        activeView: 'tickets',
        setActiveView: (view) => set({ activeView: view }),
        
        selectedTicket: null,
        setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
        selectedAlert: null,
        setSelectedAlert: (alert) => set({ selectedAlert: alert }),
        selectedNode: null,
        setSelectedNode: (node) => set({ selectedNode: node }),

        ticketFilters: {},
        setTicketFilters: (filters) => set({ ticketFilters: filters }),
        alertFilters: {},
        setAlertFilters: (filters) => set({ alertFilters: filters }),
        graphFilters: { depth: 2 },
        setGraphFilters: (filters) => set({ graphFilters: filters }),

        graphLayout: 'force',
        setGraphLayout: (layout) => set({ graphLayout: layout }),
        theme: 'system',
        setTheme: (theme) => set({ theme: theme })
      }),
      {
        name: 'opsgraph-storage',
        partialize: (state) => ({
          theme: state.theme,
          graphLayout: state.graphLayout
        })
      }
    )
  )
);

export default useStore;
