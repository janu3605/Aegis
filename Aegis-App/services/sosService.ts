// SOS Service - Handles emergency alerts

import * as Notifications from 'expo-notifications';
import LocationService from './locationService';
import StorageService from './storageService';
import AutomaticSMSService from './automaticSMSService';
import { SOS_CONFIG } from '../utils/constants';
import type { SOSAlert, EmergencyContact, Location as LocationType } from '../types';

export class SOSService {
  private static instance: SOSService;
  private activeAlert: SOSAlert | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.setupNotifications();
  }

  static getInstance(): SOSService {
    if (!SOSService.instance) {
      SOSService.instance = new SOSService();
    }
    return SOSService.instance;
  }

  /**
   * Setup notification handler
   */
  private setupNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }

  /**
   * Check if SMS is available (for backward compatibility)
   */
  async isSMSAvailable(): Promise<boolean> {
    // Automatic SMS is always available if Firebase is configured
    return true;
  }

  /**
   * Send SMS to emergency contacts automatically
   */
  private async sendSMSAlerts(
    contacts: EmergencyContact[],
    location: LocationType,
    address?: string
  ): Promise<boolean> {
    try {
      if (!contacts || contacts.length === 0) {
        console.warn('No emergency contacts to send SMS to');
        return false;
      }

      // Use automatic SMS service (no user interaction required)
      const success = await AutomaticSMSService.sendSOSAutomatically(
        contacts,
        location,
        address
      );

      return success;
    } catch (error) {
      console.error('Error sending automatic SMS alerts:', error);
      return false;
    }
  }

  /**
   * Send local notification
   */
  private async sendLocalNotification(
    title: string,
    body: string
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Trigger SOS Alert
   */
  async triggerSOS(
    type: 'manual' | 'auto' | 'voice-triggered' | 'pattern-detected' = 'manual',
    userId: string = 'default-user'
  ): Promise<SOSAlert | null> {
    try {
      // Get current location
      const location = await LocationService.getCurrentLocation();
      
      if (!location) {
        throw new Error('Unable to get current location');
      }

      // Get emergency contacts
      const contacts = await StorageService.getEmergencyContacts();
      
      if (contacts.length === 0) {
        throw new Error('No emergency contacts configured');
      }

      // Get address
      const address = await LocationService.getAddressFromCoordinates(
        location.latitude,
        location.longitude
      );

      // Create SOS alert
      const alert: SOSAlert = {
        id: `sos_${Date.now()}`,
        userId,
        location,
        timestamp: new Date(),
        status: 'active',
        type,
        contacts: contacts.map((c) => c.id),
        evidenceUrls: [],
      };

      this.activeAlert = alert;

      // Send SMS alerts
      const smsSent = await this.sendSMSAlerts(contacts, location, address || undefined);

      if (smsSent) {
        await this.sendLocalNotification(
          '🚨 SOS Alert Sent',
          `Emergency alerts sent to ${contacts.length} contact(s)`
        );
      }

      // Save to history
      await StorageService.saveSOSAlert(alert);

      // Start location tracking during active SOS
      await LocationService.startBackgroundTracking();

      return alert;
    } catch (error) {
      console.error('Error triggering SOS:', error);
      await this.sendLocalNotification(
        '⚠️ SOS Alert Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }

  /**
   * Trigger SOS with countdown
   */
  async triggerSOSWithCountdown(
    onCountdown: (seconds: number) => void,
    onComplete: () => void,
    type: 'manual' | 'auto' | 'voice-triggered' | 'pattern-detected' = 'manual'
  ): Promise<void> {
    let countdown = SOS_CONFIG.COUNTDOWN_DURATION;

    this.countdownTimer = setInterval(() => {
      countdown -= 1;
      onCountdown(countdown);

      if (countdown <= 0) {
        this.clearCountdown();
        this.triggerSOS(type).then(() => {
          onComplete();
        });
      }
    }, 1000);
  }

  /**
   * Cancel SOS countdown
   */
  cancelCountdown(): void {
    this.clearCountdown();
  }

  /**
   * Clear countdown timer
   */
  private clearCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Resolve active SOS
   */
  async resolveActiveAlert(): Promise<boolean> {
    if (!this.activeAlert) {
      return false;
    }

    try {
      this.activeAlert.status = 'resolved';
      await StorageService.saveSOSAlert(this.activeAlert);
      
      // Stop background tracking
      await LocationService.stopBackgroundTracking();

      // Send update to contacts
      const contacts = await StorageService.getEmergencyContacts();
      if (contacts.length > 0) {
        const location = await LocationService.getCurrentLocation();
        if (location) {
          await AutomaticSMSService.sendSOSAutomatically(
            contacts,
            location,
            '✅ SafeAlert Resolved - I\'m safe now. Thank you for your concern.'
          );
        }
      }

      await this.sendLocalNotification(
        '✅ Alert Resolved',
        'Emergency contacts have been notified that you are safe'
      );

      this.activeAlert = null;
      return true;
    } catch (error) {
      console.error('Error resolving SOS alert:', error);
      return false;
    }
  }

  /**
   * Cancel active SOS
   */
  async cancelActiveAlert(): Promise<boolean> {
    if (!this.activeAlert) {
      return false;
    }

    try {
      this.activeAlert.status = 'cancelled';
      await StorageService.saveSOSAlert(this.activeAlert);
      
      // Stop background tracking
      await LocationService.stopBackgroundTracking();

      this.activeAlert = null;
      return true;
    } catch (error) {
      console.error('Error cancelling SOS alert:', error);
      return false;
    }
  }

  /**
   * Get active alert
   */
  getActiveAlert(): SOSAlert | null {
    return this.activeAlert;
  }

  /**
   * Check if there's an active alert
   */
  hasActiveAlert(): boolean {
    return this.activeAlert !== null && this.activeAlert.status === 'active';
  }

  /**
   * Request notification permissions
   */
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Test SOS (for development)
   */
  async testSOS(): Promise<void> {
    console.log('Testing SOS alert...');
    await this.sendLocalNotification(
      '🧪 Test SOS Alert',
      'This is a test emergency alert'
    );
  }
}

export default SOSService.getInstance();
