// Automatic SMS Service - Sends SMS via backend without user interaction
// Uses Vercel serverless function with msg91 SMS gateway
// This replaces expo-sms for automatic sending

import type { EmergencyContact, Location as LocationType } from '../types';

// Vercel endpoint - replace with your deployed Vercel URL
const VERCEL_ENDPOINT = process.env.EXPO_PUBLIC_VERCEL_ENDPOINT || 'https://aegis-app.vercel.app/api/sendSOS';
const SOS_AUTH_TOKEN = process.env.EXPO_PUBLIC_SOS_AUTH_TOKEN || '';



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
   * Send SOS SMS automatically via Vercel serverless function
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

      // Format phone numbers (ensure 91 prefix for India without +)
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

      // Call Vercel serverless function
      const response = await fetch(VERCEL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumbers,
          location,
          address: address || 'Address unavailable',
          timestamp: new Date().toISOString(),
          authToken: SOS_AUTH_TOKEN,
        }),
      });

      if (!response.ok) {
        console.error(
          'Vercel request failed:',
          response.status,
          response.statusText
        );
        return false;
      }

      const data: any = await response.json();

      if (data.success) {
        const sentCount = data.results.filter(
          (r: any) => r.status === 'sent'
        ).length;
        console.log(`SOS SMS sent to ${sentCount}/${phoneNumbers.length} contacts via msg91`);
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

}

export default AutomaticSMSService.getInstance();
