// Vercel Serverless Function - Send SOS SMS
// Deploy automatically with: vercel deploy

const axios = require('axios');

// msg91 API configuration
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_ROUTE = process.env.MSG91_ROUTE || '4'; // Route 4 for transactional SMS
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'AEGIS';

/**
 * Send SOS alerts via msg91 SMS gateway
 * Endpoint: POST /api/sendSOS
 */
export default async function handler(req, res) {
  // Only allow POST and OPTIONS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const {
      phoneNumbers = [],
      location = {},
      address = 'Address unavailable',
      timestamp = new Date().toISOString(),
      authToken,
    } = req.body;

    // Verify auth token
    const expectedToken = process.env.SOS_AUTH_TOKEN;
    if (!authToken || authToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Phone numbers are required' });
    }

    if (!MSG91_AUTH_KEY) {
      console.error('MSG91_AUTH_KEY not configured in environment variables');
      return res.status(500).json({ 
        error: 'SMS service not configured. Please contact administrator.' 
      });
    }

    const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `🚨 EMERGENCY! I need help. This is my current location:\n\n📍 Location: ${address}\n\n🗺️ Map: ${mapsUrl}\n\nTimestamp: ${new Date(timestamp).toLocaleString()}\n\nI'm in danger. Please help!`;

    const results = [];

    // Send SMS to each contact via msg91
    for (const phoneNumber of phoneNumbers) {
      try {
        // Format phone number: remove special chars, ensure +91 for India
        let normalizedPhone = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedPhone.startsWith('+')) {
          normalizedPhone = normalizedPhone.replace(/^91/, ''); // Remove 91 if present
          if (!normalizedPhone.startsWith('91')) {
            normalizedPhone = '91' + normalizedPhone; // Add 91 if not present
          }
        }
        
        // Remove + for msg91 API
        normalizedPhone = normalizedPhone.replace('+', '');

        console.log(`Sending SMS to ${normalizedPhone}...`);

        // Call msg91 API
        const msg91Response = await axios.get('https://api.msg91.com/apisbulk/sendhttp', {
          params: {
            authkey: MSG91_AUTH_KEY,
            mobiles: normalizedPhone,
            message: message,
            sender: MSG91_SENDER_ID,
            route: MSG91_ROUTE,
            unicode: '1', // Support unicode emojis
          },
          timeout: 10000,
        });

        console.log(`SMS response for ${normalizedPhone}:`, msg91Response.data);

        results.push({
          phoneNumber,
          status: 'sent',
          provider: 'msg91',
          response: msg91Response.data,
        });
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error.message);
        results.push({
          phoneNumber,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    
    return res.status(200).json({
      success: sentCount > 0,
      message: `SMS sent to ${sentCount}/${phoneNumbers.length} contact(s)`,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in sendSOS:', error);
    return res.status(500).json({
      error: error.message || 'Failed to send SOS alert',
    });
  }
}
