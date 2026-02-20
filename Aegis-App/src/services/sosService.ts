import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { SOSEvent } from '../types';
import ContactManager from './contactManager';

export class SOSService {
  /**
   * Trigger SOS alert
   */
  static async triggerSOS(message?: string): Promise<SOSEvent> {
    try {
      const contacts = await ContactManager.getAllContacts();
      
      // In production: Get actual location via expo-location
      const latitude = 0; // Placeholder
      const longitude = 0; // Placeholder

      const sosEvent: SOSEvent = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        latitude,
        longitude,
        contactsNotified: contacts.map(c => c.id),
        message,
      };

      // Log SOS event
      await this.logSOSEvent(sosEvent);

      // In production: Send SMS/push notifications to contacts
      await this.notifyContacts(contacts, sosEvent);

      return sosEvent;
    } catch (error) {
      console.error('Error triggering SOS:', error);
      throw error;
    }
  }

  /**
   * Log SOS event to storage
   */
  private static async logSOSEvent(event: SOSEvent): Promise<void> {
    try {
      const history = await this.getSOSHistory();
      history.push(event);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SOS_HISTORY,
        JSON.stringify(history)
      );
    } catch (error) {
      console.error('Error logging SOS event:', error);
    }
  }

  /**
   * Get SOS history
   */
  static async getSOSHistory(): Promise<SOSEvent[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.SOS_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error retrieving SOS history:', error);
      return [];
    }
  }

  /**
   * Notify contacts about SOS
   * In production: Use SMS/push notification services
   */
  private static async notifyContacts(
    contacts: any[],
    event: SOSEvent
  ): Promise<void> {
    try {
      // Placeholder for SMS/push notification logic
      // In production: Integrate with Twilio, Firebase Cloud Messaging, etc.
      console.log('Notifying contacts:', contacts.map(c => c.phoneNumber));
      console.log('SOS Location:', `${event.latitude}, ${event.longitude}`);
    } catch (error) {
      console.error('Error notifying contacts:', error);
    }
  }

  /**
   * Get recent SOS events
   */
  static async getRecentSOSEvents(limit: number = 10): Promise<SOSEvent[]> {
    try {
      const history = await this.getSOSHistory();
      return history.slice(-limit).reverse();
    } catch (error) {
      console.error('Error retrieving recent SOS events:', error);
      return [];
    }
  }

  /**
   * Clear emergency state
   */
  static async clearSOS(): Promise<void> {
    try {
      // In production: Update backend/emergency services
      console.log('SOS cleared');
    } catch (error) {
      console.error('Error clearing SOS:', error);
    }
  }
}

export default SOSService;
