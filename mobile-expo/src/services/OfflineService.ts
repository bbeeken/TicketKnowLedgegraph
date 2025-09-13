import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface OfflineTicket {
  id: string;
  localId: string;
  category: string;
  subcategory: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  description: string;
  location: string;
  siteId: number;
  assetId?: number;
  photos: OfflinePhoto[];
  contactPhone: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'pending_sync' | 'syncing' | 'synced' | 'sync_failed';
  syncAttempts: number;
  lastSyncAttempt?: string;
  errorMessage?: string;
}

export interface OfflinePhoto {
  id: string;
  uri: string;
  filename: string;
  type: string;
  size: number;
  base64?: string;
  uploaded: boolean;
  uploadUrl?: string;
}

export interface OfflineAssetReading {
  id: string;
  assetId: number;
  readingType: string;
  value: number;
  unit: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  status: 'pending_sync' | 'synced' | 'sync_failed';
}

export interface OfflineWorkLog {
  id: string;
  ticketId?: string;
  description: string;
  hours: number;
  startTime: string;
  endTime?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photos: OfflinePhoto[];
  status: 'active' | 'completed' | 'pending_sync' | 'synced';
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline = true;
  private syncInProgress = false;
  private syncListeners: ((status: string) => void)[] = [];

  private readonly STORAGE_KEYS = {
    OFFLINE_TICKETS: 'offline_tickets',
    OFFLINE_READINGS: 'offline_readings',
    OFFLINE_WORKLOGS: 'offline_worklogs',
    OFFLINE_PHOTOS: 'offline_photos',
    SYNC_QUEUE: 'sync_queue',
    LAST_SYNC: 'last_sync_time',
  };

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private async initializeNetworkListener(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;

      NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        if (!wasOnline && this.isOnline) {
          // Came back online, trigger sync
          this.syncAllData();
        }
      });
    } catch (error) {
      console.error('Failed to initialize network listener:', error);
    }
  }

  // Network status
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }

  // Offline Ticket Management
  async createOfflineTicket(ticketData: Omit<OfflineTicket, 'id' | 'localId' | 'createdAt' | 'updatedAt' | 'status' | 'syncAttempts'>): Promise<OfflineTicket> {
    const ticket: OfflineTicket = {
      ...ticketData,
      id: '', // Will be assigned by server
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      syncAttempts: 0,
    };

    await this.saveOfflineTicket(ticket);
    return ticket;
  }

  async saveOfflineTicket(ticket: OfflineTicket): Promise<void> {
    try {
      const tickets = await this.getOfflineTickets();
      const existingIndex = tickets.findIndex(t => t.localId === ticket.localId);

      if (existingIndex >= 0) {
        tickets[existingIndex] = { ...ticket, updatedAt: new Date().toISOString() };
      } else {
        tickets.push(ticket);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_TICKETS, JSON.stringify(tickets));
    } catch (error) {
      console.error('Failed to save offline ticket:', error);
      throw error;
    }
  }

  async getOfflineTickets(): Promise<OfflineTicket[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_TICKETS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline tickets:', error);
      return [];
    }
  }

  async deleteOfflineTicket(localId: string): Promise<void> {
    try {
      const tickets = await this.getOfflineTickets();
      const filteredTickets = tickets.filter(t => t.localId !== localId);
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_TICKETS, JSON.stringify(filteredTickets));
    } catch (error) {
      console.error('Failed to delete offline ticket:', error);
      throw error;
    }
  }

  // Photo Management
  async saveOfflinePhoto(photo: OfflinePhoto): Promise<void> {
    try {
      const photos = await this.getOfflinePhotos();
      photos.push(photo);
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_PHOTOS, JSON.stringify(photos));
    } catch (error) {
      console.error('Failed to save offline photo:', error);
      throw error;
    }
  }

  async getOfflinePhotos(): Promise<OfflinePhoto[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_PHOTOS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline photos:', error);
      return [];
    }
  }

  // Asset Readings
  async saveOfflineReading(reading: OfflineAssetReading): Promise<void> {
    try {
      const readings = await this.getOfflineReadings();
      readings.push(reading);
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_READINGS, JSON.stringify(readings));
    } catch (error) {
      console.error('Failed to save offline reading:', error);
      throw error;
    }
  }

  async getOfflineReadings(): Promise<OfflineAssetReading[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_READINGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline readings:', error);
      return [];
    }
  }

  // Work Logs
  async createWorkLog(workLog: Omit<OfflineWorkLog, 'id' | 'status'>): Promise<OfflineWorkLog> {
    const log: OfflineWorkLog = {
      ...workLog,
      id: `worklog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active',
    };

    await this.saveWorkLog(log);
    return log;
  }

  async saveWorkLog(workLog: OfflineWorkLog): Promise<void> {
    try {
      const workLogs = await this.getWorkLogs();
      const existingIndex = workLogs.findIndex(w => w.id === workLog.id);

      if (existingIndex >= 0) {
        workLogs[existingIndex] = workLog;
      } else {
        workLogs.push(workLog);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_WORKLOGS, JSON.stringify(workLogs));
    } catch (error) {
      console.error('Failed to save work log:', error);
      throw error;
    }
  }

  async getWorkLogs(): Promise<OfflineWorkLog[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_WORKLOGS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get work logs:', error);
      return [];
    }
  }

  async completeWorkLog(workLogId: string): Promise<void> {
    try {
      const workLogs = await this.getWorkLogs();
      const workLog = workLogs.find(w => w.id === workLogId);

      if (workLog) {
        workLog.status = 'completed';
        workLog.endTime = new Date().toISOString();
        await this.saveWorkLog(workLog);
      }
    } catch (error) {
      console.error('Failed to complete work log:', error);
      throw error;
    }
  }

  // Sync Management
  async syncAllData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.notifySyncListeners('sync_started');

    try {
      // Sync tickets
      await this.syncTickets();

      // Sync readings
      await this.syncReadings();

      // Sync work logs
      await this.syncWorkLogs();

      // Sync photos
      await this.syncPhotos();

      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      this.notifySyncListeners('sync_completed');
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifySyncListeners('sync_failed');
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncTickets(): Promise<void> {
    const tickets = await this.getOfflineTickets();
    const pendingTickets = tickets.filter(t => t.status === 'pending_sync' || t.status === 'sync_failed');

    for (const ticket of pendingTickets) {
      try {
        ticket.status = 'syncing';
        await this.saveOfflineTicket(ticket);

        // Attempt to sync with server
        const response = await this.syncTicketToServer(ticket);

        if (response.success) {
          ticket.status = 'synced';
          ticket.id = String(response.serverId);
          await this.saveOfflineTicket(ticket);
        } else {
          throw new Error(response.error);
        }
      } catch (error) {
        ticket.status = 'sync_failed';
        ticket.syncAttempts++;
        ticket.lastSyncAttempt = new Date().toISOString();
        ticket.errorMessage = (error as Error).message;
        await this.saveOfflineTicket(ticket);
      }
    }
  }

  private async syncTicketToServer(ticket: OfflineTicket): Promise<{ success: boolean; serverId?: string; error?: string }> {
    try {
      // This would be the actual API call
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify({
          category: ticket.category,
          subcategory: ticket.subcategory,
          priority: ticket.priority,
          summary: ticket.summary,
          description: ticket.description,
          location: ticket.location,
          site_id: ticket.siteId,
          asset_id: ticket.assetId,
          contact_phone: ticket.contactPhone,
          contact_email: ticket.contactEmail,
        }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();
      return { success: true, serverId: data.ticket_id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async syncReadings(): Promise<void> {
    const readings = await this.getOfflineReadings();
    const pendingReadings = readings.filter(r => r.status === 'pending_sync');

    // Implementation for syncing readings
    console.log(`Syncing ${pendingReadings.length} readings`);
  }

  private async syncWorkLogs(): Promise<void> {
    const workLogs = await this.getWorkLogs();
    const pendingLogs = workLogs.filter(w => w.status === 'pending_sync');

    // Implementation for syncing work logs
    console.log(`Syncing ${pendingLogs.length} work logs`);
  }

  private async syncPhotos(): Promise<void> {
    const photos = await this.getOfflinePhotos();
    const pendingPhotos = photos.filter(p => !p.uploaded);

    // Implementation for syncing photos
    console.log(`Syncing ${pendingPhotos.length} photos`);
  }

  // Sync listeners
  addSyncListener(listener: (status: string) => void): void {
    this.syncListeners.push(listener);
  }

  removeSyncListener(listener: (status: string) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  private notifySyncListeners(status: string): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Utility methods
  async getStorageStats(): Promise<{
    tickets: number;
    readings: number;
    workLogs: number;
    photos: number;
    totalSize: number;
  }> {
    try {
      const [tickets, readings, workLogs, photos] = await Promise.all([
        this.getOfflineTickets(),
        this.getOfflineReadings(),
        this.getWorkLogs(),
        this.getOfflinePhotos(),
      ]);

      const totalSize = JSON.stringify({ tickets, readings, workLogs, photos }).length;

      return {
        tickets: tickets.length,
        readings: readings.length,
        workLogs: workLogs.length,
        photos: photos.length,
        totalSize,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { tickets: 0, readings: 0, workLogs: 0, photos: 0, totalSize: 0 };
    }
  }

  async clearAllOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEYS.OFFLINE_TICKETS,
        this.STORAGE_KEYS.OFFLINE_READINGS,
        this.STORAGE_KEYS.OFFLINE_WORKLOGS,
        this.STORAGE_KEYS.OFFLINE_PHOTOS,
        this.STORAGE_KEYS.SYNC_QUEUE,
      ]);
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }

  async getLastSyncTime(): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();

// Export types
