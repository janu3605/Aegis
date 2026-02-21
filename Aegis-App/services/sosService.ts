// SOS Service - Handles emergency alerts

import Constants from 'expo-constants';
import { PermissionsAndroid, Linking, Platform } from 'react-native';
import { sendSMS as sendNativeSMS } from '../modules/expo-sos-module';

// expo-notifications triggers a fatal console.error in Expo Go SDK 53+
// (side-effect in DevicePushTokenAutoRegistration.fx.js).
// We skip loading it entirely in Expo Go and use stubs instead.
let Notifications: any;
if (Constants.appOwnership !== 'expo') {
  Notifications = require('expo-notifications');
} else {
  Notifications = {
    setNotificationHandler: () => { },
    scheduleNotificationAsync: async (opts: any) => console.log('[Notification]', opts?.content?.title),
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    AndroidNotificationPriority: { MAX: 'max' },
  };
}
import * as SMS from 'expo-sms';
import LocationService from './locationService';
import StorageService from './storageService';
import NearbyService from './nearbyService';
import { SOS_CONFIG } from '../utils/constants';
import type { SOSAlert, EmergencyContact, Location as LocationType, BLESOSPayload } from '../types';

export type SOSPhase = 'idle' | 'countdown' | 'sending' | 'ble-broadcasting' | 'alert-mode' | 'active' | 'resolved';

export class SOSService {
  private static instance: SOSService;
  private activeAlert: SOSAlert | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private currentPhase: SOSPhase = 'idle';
  private onPhaseChange: ((phase: SOSPhase) => void) | null = null;

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
   * Send SMS using fallback (Linking API) if Native fails or permissions denied
   */
  private async fallbackToSMSApp(phoneNumbers: string[], message: string): Promise<boolean> {
    try {
      console.log('Falling back to default SMS app');
      // Use ; or , depending on the device. Linking to multiple numbers 
      // is most robust with ; separator on Android typically
      const numberString = phoneNumbers.join(';');
      const url = `sms:${numberString}?body=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error opening SMS app:', error);
      return false;
    }
  }

  /**
   * Send resolution SMS using native module with fallback (same pattern as sendSMSAlerts)
   */
  private async sendResolutionSMS(phoneNumbers: string[], message: string): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.SEND_SMS
        );

        if (granted) {
          try {
            const result = await sendNativeSMS(phoneNumbers, message);
            if (result) return true;
          } catch (nativeError) {
            console.error('Native SMS failed for resolution:', nativeError);
          }
        }

        return await this.fallbackToSMSApp(phoneNumbers, message);
      } else {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) return false;
        const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
        return result === 'sent';
      }
    } catch (error) {
      console.error('Error sending resolution SMS:', error);
      return false;
    }
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

      // Build SMS message directly (no Vercel dependency)
      const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `EMERGENCY! I need help. This is my current location:\n\nLocation: ${address || 'Address unavailable'
        }\n\nMap: ${mapsUrl}\n\nTimestamp: ${new Date().toLocaleString()}\n\nI'm in danger. Please help!`;
      const phoneNumbers = contacts.map((contact) => contact.phoneNumber);

      if (Platform.OS === 'android') {
        // 1. Request Runtime Permission for SEND_SMS
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
          {
            title: 'Emergency SMS Permission',
            message: 'Aegis needs to send automatic SMS to your emergency contacts when SOS is triggered.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // 2. Call our Expo Native Module
          console.log('SEND_SMS permission granted, sending Native SMS silently...');
          try {
            const result = await sendNativeSMS(phoneNumbers, message);
            if (result) {
              console.log('Native SMS sent successfully.');
              return true;
            }
          } catch (nativeError) {
            console.error('Native SMS sending failed:', nativeError);
            // Fallthrough to fallback
          }
        } else {
          console.log('SEND_SMS permission denied.');
        }

        // 3. Fallback to SMS App via Linking if permissions denied or Native Module fails
        return await this.fallbackToSMSApp(phoneNumbers, message);
      } else {
        // Non-Android environments (web/ios) - fallback to expo-sms if available
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
          console.warn('SMS not available on this device');
          return false;
        }
        const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
        return result === 'sent';
      }
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

  // ═══════════════════════════════════════════
  // PHASE MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * Set a callback for phase changes (UI listens to this)
   */
  setOnPhaseChange(callback: (phase: SOSPhase) => void): void {
    this.onPhaseChange = callback;
  }

  /**
   * Get the current SOS phase
   */
  getCurrentPhase(): SOSPhase {
    return this.currentPhase;
  }

  /**
   * Update SOS phase and notify listeners
   */
  private setPhase(phase: SOSPhase): void {
    this.currentPhase = phase;
    this.onPhaseChange?.(phase);
  }

  // ═══════════════════════════════════════════
  // INTERNET CHECK
  // ═══════════════════════════════════════════

  /**
   * Check if the device has internet connectivity
   */
  async checkInternetConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('https://clients3.google.com/generate_204', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      console.warn('Internet check failed, assuming no internet:', error);
      return false;
    }
  }

  // ═══════════════════════════════════════════
  // MAIN SOS TRIGGER
  // ═══════════════════════════════════════════

  /**
   * Trigger SOS Alert
   * Flow: SOS → Check internet → Online: SMS/notify | Offline: BLE broadcast → Alert Mode
   */
  async triggerSOS(
    type: 'manual' | 'auto' | 'voice-triggered' | 'pattern-detected' = 'manual',
    userId: string = 'default-user'
  ): Promise<SOSAlert | null> {
    try {
      this.setPhase('sending');

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

      // ── ALWAYS TRY SMS FIRST (native SMS uses cellular, not internet) ──
      const address = await LocationService.getAddressFromCoordinates(
        location.latitude,
        location.longitude
      );

      const smsSent = await this.sendSMSAlerts(contacts, location, address || undefined);

      if (smsSent) {
        console.log('✅ SMS sent successfully');
        await this.sendLocalNotification(
          '🚨 SOS Alert Sent',
          `Emergency alerts sent to ${contacts.length} contact(s)`
        );
        this.setPhase('active');
      } else {
        // SMS failed — check internet to decide fallback
        console.log('⚠️ SMS failed — checking internet for BLE fallback');
        const hasInternet = await this.checkInternetConnection();

        if (!hasInternet) {
          // ── OFFLINE PATH: BLE broadcast via Nearby Connections ──
          console.log('📵 No internet + SMS failed — switching to BLE broadcast');
          await this.triggerBLEFallback(alert, userId);
        } else {
          // SMS failed but we have internet — still mark as active
          console.log('📶 Internet available but SMS failed — marking active');
          this.setPhase('active');
        }
      }

      // Save to history
      await StorageService.saveSOSAlert(alert);

      // Start location tracking during active SOS
      await LocationService.startBackgroundTracking();

      return alert;
    } catch (error) {
      console.error('Error triggering SOS:', error);
      this.setPhase('idle');
      await this.sendLocalNotification(
        '⚠️ SOS Alert Failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }

  // ═══════════════════════════════════════════
  // BLE FALLBACK (OFFLINE PATH)
  // ═══════════════════════════════════════════

  /**
   * Start BLE broadcast when no internet is available
   * After TIMEOUT_MS with no relay → triggers Alert Mode
   */
  private async triggerBLEFallback(alert: SOSAlert, userId: string): Promise<void> {
    this.setPhase('ble-broadcasting');

    const payload: BLESOSPayload = {
      userId,
      latitude: alert.location.latitude,
      longitude: alert.location.longitude,
      timestamp: Date.now(),
    };

    const success = await NearbyService.startVictimBroadcast(
      payload,
      // onRelayed — bystander picked up and relayed our SOS
      () => {
        console.log('✅ SOS relayed by a bystander!');
        this.setPhase('active');
        this.sendLocalNotification(
          '✅ SOS Relayed',
          'A nearby phone picked up your SOS and relayed it to emergency services'
        );
      },
      // onTimeout — no bystander found within 30s → Alert Mode
      () => {
        console.log('⏰ BLE timeout — entering Alert Mode');
        this.activateAlertMode();
      },
    );

    if (!success) {
      console.warn('BLE broadcast failed — going straight to Alert Mode');
      this.activateAlertMode();
    }
  }

  // ═══════════════════════════════════════════
  // ALERT MODE (Last Resort — Hardware Alarm)
  // ═══════════════════════════════════════════

  /**
   * Activate Alert Mode — the phone itself becomes the distress beacon
   * Flash screen + loud alarm + vibration + flashlight
   */
  activateAlertMode(): void {
    this.setPhase('alert-mode');
    console.log('🚨 ALERT MODE ACTIVATED — phone becoming distress beacon');
    // UI listens to this phase change and renders the Alert Mode overlay
    // (screen flash, audio alarm, haptics, flashlight handled in HomeScreen)
  }

  /**
   * Deactivate Alert Mode
   */
  deactivateAlertMode(): void {
    if (this.currentPhase === 'alert-mode') {
      this.setPhase('active');
      NearbyService.stopVictimBroadcast();
    }
  }

  // ═══════════════════════════════════════════
  // BYSTANDER RELAY (called when this phone relays another's SOS)
  // ═══════════════════════════════════════════

  /**
   * Relay a detected SOS payload (bystander action)
   * Without Firebase: shows alert with victim's location so bystander can call emergency services
   */
  async relayDetectedSOS(payload: BLESOSPayload): Promise<boolean> {
    try {
      const mapsUrl = `https://maps.google.com/?q=${payload.latitude},${payload.longitude}`;
      console.log('📡 Bystander: SOS detected from', payload.userId);
      console.log('📍 Location:', mapsUrl);

      await this.sendLocalNotification(
        '🚨 Nearby SOS Detected!',
        `Someone nearby needs help! Location: ${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)}`
      );
      return true;
    } catch (error) {
      console.error('Error relaying SOS:', error);
      return false;
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

      // Clean up BLE if active
      await NearbyService.stopVictimBroadcast();

      // Stop background tracking
      await LocationService.stopBackgroundTracking();

      // Send resolution SMS to contacts — only if cellular radio is available
      const hasInternet = await this.checkInternetConnection();
      const contacts = await StorageService.getEmergencyContacts();
      if (contacts.length > 0 && hasInternet) {
        const phoneNumbers = contacts.map((c) => c.phoneNumber);
        const message = 'I am safe now. The emergency has been resolved. Thank you for your concern.';
        await this.sendResolutionSMS(phoneNumbers, message);
      } else if (contacts.length > 0 && !hasInternet) {
        console.log('No connectivity — resolution SMS will be skipped (radio off)');
      }

      await this.sendLocalNotification(
        '✅ Alert Resolved',
        hasInternet
          ? 'Emergency contacts have been notified that you are safe'
          : 'Alert resolved. Turn off airplane mode to notify your emergency contacts.'
      );

      this.activeAlert = null;
      this.setPhase('resolved');
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

      // Clean up BLE if active
      await NearbyService.stopVictimBroadcast();

      this.activeAlert = null;
      this.setPhase('idle');
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
