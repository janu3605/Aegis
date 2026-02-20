import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, STEALTH_MODE_PIN } from '../constants';
import { AppSettings } from '../types';

export class StealthModeService {
  /**
   * Get app settings including stealth mode status
   */
  static async getSettings(): Promise<AppSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (settings) {
        return JSON.parse(settings);
      }
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error retrieving settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Set stealth mode PIN
   */
  static async setStealthPin(pin: string): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.stealthPinCode = pin;
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error setting stealth PIN:', error);
      throw error;
    }
  }

  /**
   * Verify stealth mode PIN
   */
  static async verifyStealthPin(pin: string): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.stealthPinCode === pin;
    } catch (error) {
      console.error('Error verifying stealth PIN:', error);
      return false;
    }
  }

  /**
   * Toggle stealth mode
   */
  static async toggleStealthMode(enabled: boolean): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.stealthModeEnabled = enabled;
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error toggling stealth mode:', error);
      throw error;
    }
  }

  /**
   * Check if stealth mode is active
   */
  static async isStealthModeActive(): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      return settings.stealthModeEnabled;
    } catch (error) {
      console.error('Error checking stealth mode:', error);
      return false;
    }
  }

  /**
   * Toggle night mode
   */
  static async toggleNightMode(enabled: boolean): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.nightModeEnabled = enabled;
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error toggling night mode:', error);
      throw error;
    }
  }

  /**
   * Get default settings
   */
  private static getDefaultSettings(): AppSettings {
    return {
      stealthModeEnabled: false,
      stealthPinCode: STEALTH_MODE_PIN,
      nightModeEnabled: false,
      autoSOSEnabled: false,
      emergencyContacts: [],
    };
  }

  /**
   * Update user settings
   */
  static async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const settings = await this.getSettings();
      const updated = { ...settings, ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(updated)
      );
      return updated;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
}

export default StealthModeService;
