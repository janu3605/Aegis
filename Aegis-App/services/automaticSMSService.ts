// Automatic SMS Service - Sends SMS via backend without user interaction
// This replaces expo-sms for automatic sending

import { initializeApp, getApps } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { EmergencyContact, Location as LocationType } from '../types';

// Get Firebase app instance
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-auth-domain',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'your-database-url',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-storage-bucket',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const functions = getFunctions(app, 'asia-south1');

interface SendSOSResponse {
  success: boolean;
  message: string;
  results: Array<{
    phoneNumber: string;
    status: 'sent' | 'failed';
    messageSid?: string;
    error?: string;
  }>;
}

class AutomaticSMSService {
  private static instance: AutomaticSMSService;

  private constructor() {}

  static getInstance(): AutomaticSMSService {
    if (!AutomaticSMSService.instance) {
      AutomaticSMSService.instance = new AutomaticSMSService();
    }
    return AutomaticSMSService.instance;
  }

  /**
   * Send SOS SMS automatically via Firebase Cloud Function
   * No user interaction required
   */
  async sendSOSAutomatically(
    contacts: EmergencyContact[],
    location: LocationType,
    address?: string
  ): Promise<boolean> {
    try {
      if (!contacts || contacts.length === 0) {
        console.warn('No emergency contacts to send SMS to');
        return false;
      }

      // Format phone numbers (ensure +91 prefix for India)
      const phoneNumbers = contacts.map((contact) => {
        let phone = contact.phoneNumber;
        // Remove any existing country code or special characters
        phone = phone.replace(/[^\d]/g, '');
        // Add India country code if not present
        if (!phone.startsWith('91')) {
          phone = '91' + phone;
        }
        return '+' + phone;
      });

      // Call Firebase Cloud Function
      const sendSOSAlert = httpsCallable(functions, 'sendSOSAlert');
      
      const response = await sendSOSAlert({
        phoneNumbers,
        location,
        address: address || 'Address unavailable',
        timestamp: new Date().toISOString(),
      }) as any;

      const data: SendSOSResponse = response.data;
      
      if (data.success) {
        const sentCount = data.results.filter(r => r.status === 'sent').length;
        console.log(`SOS SMS sent to ${sentCount}/${phoneNumbers.length} contacts`);
        return true;
      } else {
        console.error('Failed to send SOS SMS:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error sending automatic SOS SMS:', error);
      return false;
    }
  }

  /**
   * Alternative: Send SOS via HTTP endpoint (without Firebase callable)
   * Use this if Cloud Functions callable is unavailable
   */
  async sendSOSViaHTTP(
    contacts: EmergencyContact[],
    location: LocationType,
    address?: string
  ): Promise<boolean> {
    try {
      if (!contacts || contacts.length === 0) {
        console.warn('No emergency contacts to send SMS to');
        return false;
      }

      const phoneNumbers = contacts.map((contact) => {
        let phone = contact.phoneNumber;
        phone = phone.replace(/[^\d]/g, '');
        if (!phone.startsWith('91')) {
          phone = '91' + phone;
        }
        return '+' + phone;
      });

      const firebaseConfig = require('../types')?.FIREBASE_CONFIG;
      if (!firebaseConfig?.projectId) {
        console.error('Firebase config not found');
        return false;
      }

      const endpoint = `https://asia-south1-${firebaseConfig.projectId}.cloudfunctions.net/sendSOSAlertHTTP`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SOS_AUTH_TOKEN || ''}`,
        },
        body: JSON.stringify({
          phoneNumbers,
          location,
          address: address || 'Address unavailable',
          timestamp: new Date().toISOString(),
          authToken: process.env.EXPO_PUBLIC_SOS_AUTH_TOKEN,
        }),
      });

      if (!response.ok) {
        console.error('HTTP request failed:', response.statusText);
        return false;
      }

      const data: SendSOSResponse = await response.json();
      
      if (data.success) {
        const sentCount = data.results.filter(r => r.status === 'sent').length;
        console.log(`SOS SMS sent to ${sentCount}/${phoneNumbers.length} contacts`);
        return true;
      } else {
        console.error('Failed to send SOS SMS');
        return false;
      }
    } catch (error) {
      console.error('Error sending SOS via HTTP:', error);
      return false;
    }
  }

  /**
   * Send generic SMS automatically
   */
  async sendSMSAutomatically(
    phoneNumbers: string[],
    message: string
  ): Promise<boolean> {
    try {
      if (!phoneNumbers || phoneNumbers.length === 0) {
        console.warn('No phone numbers provided');
        return false;
      }

      // Format phone numbers
      const formattedNumbers = phoneNumbers.map((phone) => {
        phone = phone.replace(/[^\d]/g, '');
        if (!phone.startsWith('91')) {
          phone = '91' + phone;
        }
        return '+' + phone;
      });

      // Would call a generic SMS function here
      // For now, we'll log it
      console.warn(
        'Generic SMS sending not yet implemented. Use sendSOSAutomatically() for SOS messages.'
      );

      return false;
    } catch (error) {
      console.error('Error sending automatic SMS:', error);
      return false;
    }
  }
}

export default AutomaticSMSService.getInstance();
