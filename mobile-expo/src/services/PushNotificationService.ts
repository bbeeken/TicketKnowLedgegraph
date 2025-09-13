import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface PushNotificationData {
  type: 'alert' | 'ticket' | 'maintenance' | 'system';
  title: string;
  body: string;
  data?: any;
  priority?: 'default' | 'high';
}

class PushNotificationService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return;
    }

    // Get push token
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const token = await this.getPushToken();
    if (token) {
      await this.registerPushToken(token);
    }

    this.isInitialized = true;
  }

  async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  async registerPushToken(token: string): Promise<void> {
    try {
      // Register token with backend
      const response = await fetch('/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: Constants.deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register push token');
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
    }
  }

  async sendLocalNotification(data: PushNotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: data.priority === 'high' ? 'default' : undefined,
          priority: data.priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  async scheduleNotification(data: PushNotificationData, secondsFromNow: number): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
        },
        trigger: {
          seconds: secondsFromNow,
        },
      });
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  // Alert-specific notifications
  async notifyCriticalAlert(alertId: number, siteName: string, alertType: string): Promise<void> {
    await this.sendLocalNotification({
      type: 'alert',
      title: '🚨 Critical Alert',
      body: `${alertType} at ${siteName} - Immediate attention required`,
      data: { alertId, type: 'alert' },
      priority: 'high',
    });
  }

  async notifyTicketUpdate(ticketId: number, ticketNo: string, status: string): Promise<void> {
    await this.sendLocalNotification({
      type: 'ticket',
      title: '📋 Ticket Update',
      body: `Ticket ${ticketNo} status changed to ${status}`,
      data: { ticketId, type: 'ticket' },
      priority: 'default',
    });
  }

  async notifyMaintenanceReminder(siteName: string, equipment: string, dueDate: string): Promise<void> {
    await this.sendLocalNotification({
      type: 'maintenance',
      title: '🔧 Maintenance Due',
      body: `${equipment} at ${siteName} requires maintenance by ${dueDate}`,
      data: { siteName, equipment, type: 'maintenance' },
      priority: 'default',
    });
  }

  async notifySystemAlert(message: string, severity: 'info' | 'warning' | 'error'): Promise<void> {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
    };

    await this.sendLocalNotification({
      type: 'system',
      title: `${icons[severity]} System Alert`,
      body: message,
      data: { type: 'system', severity },
      priority: severity === 'error' ? 'high' : 'default',
    });
  }

  // Batch notifications for multiple alerts
  async notifyMultipleAlerts(alerts: Array<{ id: number; siteName: string; type: string }>): Promise<void> {
    if (alerts.length === 0) return;

    if (alerts.length === 1) {
      await this.notifyCriticalAlert(alerts[0].id, alerts[0].siteName, alerts[0].type);
      return;
    }

    await this.sendLocalNotification({
      type: 'alert',
      title: '🚨 Multiple Critical Alerts',
      body: `${alerts.length} critical alerts require attention`,
      data: { alerts, type: 'multiple_alerts' },
      priority: 'high',
    });
  }

  // Get notification history
  async getNotificationHistory(): Promise<Notifications.Notification[]> {
    try {
      return await Notifications.getPresentedNotificationsAsync();
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  // Set notification categories for interactive notifications
  async setNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('alert_actions', [
        {
          identifier: 'acknowledge',
          buttonTitle: 'Acknowledge',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'create_ticket',
          buttonTitle: 'Create Ticket',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('ticket_actions', [
        {
          identifier: 'view_details',
          buttonTitle: 'View Details',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'update_status',
          buttonTitle: 'Update Status',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    } catch (error) {
      console.error('Failed to set notification categories:', error);
    }
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();

// type is declared above as interface
