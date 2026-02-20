import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { EmergencyContact } from '../types';

export class ContactManager {
  /**
   * Add an emergency contact
   */
  static async addContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
    try {
      const contacts = await this.getAllContacts();
      const newContact: EmergencyContact = {
        ...contact,
        id: Date.now().toString(),
      };
      contacts.push(newContact);
      await AsyncStorage.setItem(
        STORAGE_KEYS.EMERGENCY_CONTACTS,
        JSON.stringify(contacts)
      );
      return newContact;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Update an emergency contact
   */
  static async updateContact(id: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact> {
    try {
      const contacts = await this.getAllContacts();
      const index = contacts.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Contact not found');
      
      contacts[index] = { ...contacts[index], ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.EMERGENCY_CONTACTS,
        JSON.stringify(contacts)
      );
      return contacts[index];
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete an emergency contact
   */
  static async deleteContact(id: string): Promise<void> {
    try {
      const contacts = await this.getAllContacts();
      const filtered = contacts.filter(c => c.id !== id);
      await AsyncStorage.setItem(
        STORAGE_KEYS.EMERGENCY_CONTACTS,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get all emergency contacts
   */
  static async getAllContacts(): Promise<EmergencyContact[]> {
    try {
      const contacts = await AsyncStorage.getItem(STORAGE_KEYS.EMERGENCY_CONTACTS);
      return contacts ? JSON.parse(contacts) : [];
    } catch (error) {
      console.error('Error retrieving contacts:', error);
      return [];
    }
  }

  /**
   * Get a single contact by ID
   */
  static async getContact(id: string): Promise<EmergencyContact | null> {
    try {
      const contacts = await this.getAllContacts();
      return contacts.find(c => c.id === id) || null;
    } catch (error) {
      console.error('Error retrieving contact:', error);
      return null;
    }
  }

  /**
   * Clear all contacts
   */
  static async clearAllContacts(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EMERGENCY_CONTACTS, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing contacts:', error);
      throw error;
    }
  }
}

export default ContactManager;
