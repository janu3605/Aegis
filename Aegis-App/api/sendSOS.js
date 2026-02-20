// Vercel Serverless Function - Send SOS SMS
// Deploy automatically with: vercel deploy

const twilio = require('twilio');

// Twilio SMS configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send SOS alerts via Twilio SMS
 * Endpoint: POST /api/sendSOS
 */
module.exports = async function handler(req, res) {
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

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Twilio SMS not configured in environment variables');
      return res.status(500).json({ 
        error: 'SMS service not configured. Please contact administrator.' 
      });
    }

    const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    const message = `🚨 EMERGENCY! I need help. This is my current location:\n\n📍 Location: ${address}\n\n🗺️ Map: ${mapsUrl}\n\nTimestamp: ${new Date(timestamp).toLocaleString()}\n\nI'm in danger. Please help!`;

    const smsClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const normalizeToE164 = (value) => {
      const digits = value.replace(/[^\d]/g, '').replace(/^0+/, '');
      if (digits.startsWith('91')) {
        return `+${digits}`;
      }
      if (digits.length === 10) {
        return `+91${digits}`;
      }
      return `+${digits}`;
    };

    const normalizedPhones = phoneNumbers.map((phoneNumber) => {
      const normalized = normalizeToE164(phoneNumber);
      console.log(`Sending SMS to ${normalized} (raw: ${phoneNumber})...`);
      return normalized;
    });

    // Send SMS to all contacts via Twilio
    const results = await Promise.all(
      normalizedPhones.map(async (normalizedPhone, index) => {
        const rawPhone = phoneNumbers[index];
        try {
          const response = await smsClient.messages.create({
            from: TWILIO_PHONE_NUMBER,
            to: normalizedPhone,
            body: message,
          });

          return {
            phoneNumber: rawPhone,
            normalizedPhone,
            status: 'sent',
            provider: 'twilio',
            response: {
              messageId: response.sid,
              status: response.status,
            },
          };
        } catch (error) {
          return {
            phoneNumber: rawPhone,
            normalizedPhone,
            status: 'failed',
            provider: 'twilio',
            response: {
              errorMessage: error.message,
            },
          };
        }
      })
    );

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
