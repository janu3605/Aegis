// Automatic SMS Service - Sends SMS via backend without user interaction
// Uses Vercel serverless function with a provider (Twilio, etc.)
// This replaces expo-sms for automatic sending

import type { EmergencyContact, Location as LocationType } from '../types';

// Vercel endpoint - replace with your deployed Vercel URL
const VERCEL_ENDPOINT = process.env.EXPO_PUBLIC_VERCEL_ENDPOINT || 'https://aegis-app.vercel.app/api/sendSOS';
const SOS_AUTH_TOKEN = process.env.EXPO_PUBLIC_SOS_AUTH_TOKEN || '';



type AutomaticSMSResult = {
  success: boolean;
  sent: string[];
  failed: string[];
  message?: string;
};

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
  ): Promise<AutomaticSMSResult> {
    try {
      if (!contacts || contacts.length === 0) {
        console.warn('No emergency contacts to send SMS to');
        return { success: false, sent: [], failed: [], message: 'No contacts' };
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
        return {
          success: false,
          sent: [],
          failed: phoneNumbers,
          message: response.statusText,
        };
      }

      const data: any = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      const sent = results
        .filter((r: any) => r.status === 'sent')
        .map((r: any) => r.phoneNumber || r.normalizedPhone)
        .filter(Boolean);
      const sentSet = new Set(sent);
      const failed = phoneNumbers.filter((phone) => !sentSet.has(phone));

      if (data.success) {
        console.log(
          `SOS SMS sent to ${sent.length}/${phoneNumbers.length} contacts via provider`
        );
      } else {
        console.error('Failed to send SOS SMS:', data.message);
      }

      return {
        success: !!data.success,
        sent,
        failed,
        message: data.message,
      };
    } catch (error) {
      console.error('Error sending automatic SOS SMS:', error);
      return { success: false, sent: [], failed: [], message: 'Unexpected error' };
    }
  }

}

export default AutomaticSMSService.getInstance();
