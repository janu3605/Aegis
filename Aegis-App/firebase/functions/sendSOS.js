// Firebase Cloud Function to send SOS SMS automatically
// Deploy with: firebase deploy --only functions:sendSOSAlert

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Initialize Firebase Admin
admin.initializeApp();

// Twilio client - requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

/**
 * Cloud Function to send SOS alerts via SMS
 * Triggered by the mobile app when SOS is activated
 */
exports.sendSOSAlert = functions
  .region('asia-south1') // Use closest region to India
  .https.onCall(async (data, context) => {
    try {
      // Verify user is authenticated
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const {
        phoneNumbers = [],
        location = {},
        address = 'Address unavailable',
        timestamp = new Date().toISOString(),
      } = data;

      if (!phoneNumbers || phoneNumbers.length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Phone numbers are required'
        );
      }

      const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `🚨 EMERGENCY! I need help. This is my current location:\n\n📍 Location: ${address}\n\n🗺️ Map: ${mapsUrl}\n\nTimestamp: ${new Date(timestamp).toLocaleString()}\n\nI'm in danger. Please help!`;

      // Send SMS to all emergency contacts
      const results = [];
      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await twilioClient.messages.create({
            from: TWILIO_PHONE_NUMBER,
            to: phoneNumber,
            body: message,
          });

          results.push({
            phoneNumber,
            status: 'sent',
            messageSid: result.sid,
          });

          console.log(`SMS sent to ${phoneNumber}:`, result.sid);
        } catch (error) {
          console.error(`Failed to send SMS to ${phoneNumber}:`, error);
          results.push({
            phoneNumber,
            status: 'failed',
            error: error.message,
          });
        }
      }

      // Log SOS event to Firestore
      await admin.firestore().collection('sos_alerts').add({
        userId: context.auth.uid,
        location,
        address,
        phoneNumbers,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        smsResults: results,
        status: 'sent',
      });

      return {
        success: true,
        message: `SMS sent to ${results.filter(r => r.status === 'sent').length} contact(s)`,
        results,
      };
    } catch (error) {
      console.error('Error in sendSOSAlert:', error);
      throw new functions.https.HttpsError(
        error.code || 'internal',
        error.message || 'Failed to send SOS alert'
      );
    }
  });

/**
 * Alternative: HTTP endpoint for sending SOS (if Cloud Functions callable not available)
 */
exports.sendSOSAlertHTTP = functions
  .region('asia-south1')
  .https.onRequest(async (request, response) => {
    // Enable CORS
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed');
      return;
    }

    try {
      const {
        phoneNumbers = [],
        location = {},
        address = 'Address unavailable',
        timestamp = new Date().toISOString(),
        authToken,
      } = request.body;

      // Simple authentication check (replace with proper Firebase token validation)
      const expectedToken = process.env.SOS_AUTH_TOKEN;
      if (!authToken || authToken !== expectedToken) {
        return response.status(401).json({ error: 'Unauthorized' });
      }

      if (!phoneNumbers || phoneNumbers.length === 0) {
        return response.status(400).json({ error: 'Phone numbers are required' });
      }

      const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      const message = `🚨 EMERGENCY! I need help. This is my current location:\n\n📍 Location: ${address}\n\n🗺️ Map: ${mapsUrl}\n\nTimestamp: ${new Date(timestamp).toLocaleString()}\n\nI'm in danger. Please help!`;

      const results = [];
      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await twilioClient.messages.create({
            from: TWILIO_PHONE_NUMBER,
            to: phoneNumber,
            body: message,
          });

          results.push({
            phoneNumber,
            status: 'sent',
            messageSid: result.sid,
          });
        } catch (error) {
          results.push({
            phoneNumber,
            status: 'failed',
            error: error.message,
          });
        }
      }

      response.json({
        success: true,
        results,
      });
    } catch (error) {
      console.error('Error:', error);
      response.status(500).json({ error: error.message });
    }
  });
