// Storage Service - Handles AsyncStorage operations

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';
import type {
  UserProfile,
  EmergencyContact,
  DeviceSettings,
  GeofenceRegion,
  SOSAlert,
  Location as LocationType,
} from '../types';

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Save data to AsyncStorage
   */
  private async saveData<T>(key: string, data: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get data from AsyncStorage
   */
  private async getData<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting data for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove data from AsyncStorage
   */
  private async removeData(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Save sensitive data to SecureStore
   */
  private async saveSecureData(key: string, value: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value);
      return true;
    } catch (error) {
      console.error(`Error saving secure data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get sensitive data from SecureStore
   */
  private async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error getting secure data for key ${key}:`, error);
      return null;
    }
  }

  // User Profile
  async saveUserProfile(profile: UserProfile): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.USER_PROFILE, profile);
  }

  async getUserProfile(): Promise<UserProfile | null> {
    return this.getData<UserProfile>(STORAGE_KEYS.USER_PROFILE);
  }

  // Emergency Contacts
  async saveEmergencyContacts(contacts: EmergencyContact[]): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.EMERGENCY_CONTACTS, contacts);
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    const contacts = await this.getData<EmergencyContact[]>(
      STORAGE_KEYS.EMERGENCY_CONTACTS
    );
    return contacts || [];
  }

  async addEmergencyContact(contact: EmergencyContact): Promise<boolean> {
    const contacts = await this.getEmergencyContacts();
    contacts.push(contact);
    return this.saveEmergencyContacts(contacts);
  }

  async updateEmergencyContact(contact: EmergencyContact): Promise<boolean> {
    const contacts = await this.getEmergencyContacts();
    const index = contacts.findIndex((c) => c.id === contact.id);
    
    if (index !== -1) {
      contacts[index] = contact;
      return this.saveEmergencyContacts(contacts);
    }
    
    return false;
  }

  async deleteEmergencyContact(contactId: string): Promise<boolean> {
    const contacts = await this.getEmergencyContacts();
    const filtered = contacts.filter((c) => c.id !== contactId);
    return this.saveEmergencyContacts(filtered);
  }

  // Device Settings
  async saveDeviceSettings(settings: DeviceSettings): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.DEVICE_SETTINGS, settings);
  }

  async getDeviceSettings(): Promise<DeviceSettings | null> {
    return this.getData<DeviceSettings>(STORAGE_KEYS.DEVICE_SETTINGS);
  }

  // Geofence Regions
  async saveGeofenceRegions(regions: GeofenceRegion[]): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.GEOFENCE_REGIONS, regions);
  }

  async getGeofenceRegions(): Promise<GeofenceRegion[]> {
    const regions = await this.getData<GeofenceRegion[]>(
      STORAGE_KEYS.GEOFENCE_REGIONS
    );
    return regions || [];
  }

  // SOS History
  async saveSOSAlert(alert: SOSAlert): Promise<boolean> {
    const history = await this.getSOSHistory();
    history.unshift(alert);
    
    // Keep only last 50 alerts
    const trimmed = history.slice(0, 50);
    return this.saveData(STORAGE_KEYS.SOS_HISTORY, trimmed);
  }

  async getSOSHistory(): Promise<SOSAlert[]> {
    const history = await this.getData<SOSAlert[]>(STORAGE_KEYS.SOS_HISTORY);
    return history || [];
  }

  // Last Location
  async saveLastLocation(location: LocationType): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.LAST_LOCATION, location);
  }

  async getLastLocation(): Promise<LocationType | null> {
    return this.getData<LocationType>(STORAGE_KEYS.LAST_LOCATION);
  }

  // Chat History
  async saveChatHistory(messages: any[]): Promise<boolean> {
    return this.saveData(STORAGE_KEYS.CHAT_HISTORY, messages);
  }

  async getChatHistory(): Promise<any[]> {
    const history = await this.getData<any[]>(STORAGE_KEYS.CHAT_HISTORY);
    return history || [];
  }

  // Stealth Mode PIN (secure)
  async saveStealthPin(pin: string): Promise<boolean> {
    return this.saveSecureData('stealth_pin', pin);
  }

  async getStealthPin(): Promise<string | null> {
    return this.getSecureData('stealth_pin');
  }

  // API Keys (secure)
  async saveApiKey(service: string, key: string): Promise<boolean> {
    return this.saveSecureData(`api_key_${service}`, key);
  }

  async getApiKey(service: string): Promise<string | null> {
    return this.getSecureData(`api_key_${service}`);
  }

  // Clear all data (for testing or logout)
  async clearAllData(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  // Clear sensitive data only
  async clearSensitiveData(): Promise<boolean> {
    try {
      const keysToRemove = [
        STORAGE_KEYS.EMERGENCY_CONTACTS,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.CHAT_HISTORY,
        STORAGE_KEYS.SOS_HISTORY,
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      return true;
    } catch (error) {
      console.error('Error clearing sensitive data:', error);
      return false;
    }
  }
}

export default StorageService.getInstance();
