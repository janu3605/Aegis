# Automatic SMS Setup for SOS Alerts

This document explains how to set up automatic SMS sending for SOS alerts (without requiring manual confirmation).

## Problem Statement

The default approach using `expo-sms` opens the native messaging interface, requiring users to manually click "send". For true 24-hour emergency response, you need **automatic SMS sending** without user interaction.

## Solution: Firebase Cloud Functions + Twilio

We've implemented a solution that sends SMS automatically via Firebase Cloud Functions and Twilio.

## Setup Steps

### 1. Install Twilio Account & Get Credentials

1. Sign up for Twilio: https://www.twilio.com/console/sms/getting-started
2. Verify your phone number (for trial account)
3. Get your credentials:
   - **Account SID**: Found in Twilio Console (https://www.twilio.com/console)
   - **Auth Token**: Found in Twilio Console
   - **Phone Number**: Assigned to your Twilio account (e.g., +1 (415) 523-8886)

### 2. Configure Twilio Phone Number

In Twilio Console:
1. Go to Phone Numbers → Manage Phone Numbers
2. Select your phone number
3. Enable "Inbound Webhooks for SMS"
4. Set capabilities to support SMS

### 3. Deploy Firebase Cloud Functions

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize Firebase in your project (if not already done):
   ```bash
   firebase login
   cd /path/to/Aegis-App
   firebase init functions
   ```

3. Copy the function to Firebase functions directory:
   ```bash
   cp firebase/functions/sendSOS.js functions/
   ```

4. Install dependencies in functions folder:
   ```bash
   cd functions
   npm install firebase-functions firebase-admin twilio
   cd ..
   ```

5. Set Twilio credentials in Firebase:
   ```bash
   firebase functions:config:set twilio.account_sid="your-twilio-account-sid"
   firebase functions:config:set twilio.auth_token="your-twilio-auth-token"
   firebase functions:config:set twilio.phone_number="your-twilio-phone-number"
   ```

6. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

### 4. Verify Deployment

After deployment, you should see:
```
✓ sendSOSAlert (HTTP endpoint)
✓ sendSOSAlertHTTP (HTTP endpoint)
```

### 5. Test SMS Sending

**Via Cloud Functions Console:**
1. Go to Firebase Console > Functions > sendSOSAlert
2. Click "Testing" tab
3. Create a test event:
```json
{
  "phoneNumbers": ["+919876543210"],
  "location": {
    "latitude": 37.4219,
    "longitude": -122.084
  },
  "address": "Mountain View, CA 94043",
  "timestamp": "2026-02-20T15:36:39Z"
}
```
4. Click "Create" to send test SMS

**Via App:**
1. Enable voice detection or press manual SOS
2. SOS alert will be sent to all emergency contacts automatically
3. Check the SMS app on a contact's phone - they'll receive the message!

## Cost Considerations

- **Twilio**: ~$0.0075 per SMS to India (varies by country)
- **Firebase Cloud Functions**: Free tier includes 125,000 invocations/month
- For low-usage emergency app: ~$0.50-1.00 per month for SMS

## Alternative SMS Providers

If Twilio doesn't work for you, alternatives include:

1. **AWS SNS** (Amazon Simple Notification Service)
   - Good for batch sending
   - ~$0.00645 per SMS to India

2. **Nexmo/Vonage**
   - Global SMS support
   - API-based with better documentation

3. **msg91** (Indian SMS Service)
   - Specifically for Indian market
   - Much cheaper for India (+91)
   - ~₹0.30-0.50 per SMS

4. **Firebase Remote Config** + Custom Backend
   - Use Firebase to store SMS provider choice
   - Switch providers without app update

## Troubleshooting

### SMS not sending
1. Check Cloud Function logs:
   ```bash
   firebase functions:log
   ```
2. Verify Twilio credentials are correct:
   ```bash
   firebase functions:config:get
   ```
3. Check your Twilio account has credits (trial accounts are free)
4. Verify phone number format (+91XXXXXXXXXX for India)

### Function deployment fails
1. Ensure Node.js 16+ is installed:
   ```bash
   node --version
   ```
2. Update firebase-tools:
   ```bash
   npm install -g firebase-tools@latest
   ```
3. Check Firebase project is correctly set:
   ```bash
   firebase projects:list
   ```

### Authentication errors
1. Ensure Cloud Function can access Firestore:
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable "Anonymous" (for dev) or "Email/Password"
2. Update app.json with Firebase project credentials

## Security Considerations

1. **Phone Number Format**: Always normalize to +91 format for India
2. **Rate Limiting**: Cloud Functions automatically rate-limit per user
3. **SMS Content**: Don't include sensitive personal info in SMS
4. **Cost Control**: Set Twilio account limits to prevent runaway costs
5. **Logging**: SMS delivery is logged in Firestore for audit trail

## Architecture Diagram

```
┌─────────────────┐
│  Aegis App      │
│  (Android/iOS)  │
└────────┬────────┘
         │
         │ 1. SOS Triggered
         │
┌────────▼─────────────────┐
│ FirebaseService          │
│ (automaticSMSService)    │
└────────┬─────────────────┘
         │
         │ 2. Call Cloud Function
         │
┌────────▼──────────────────────┐
│ Firebase Cloud Function       │
│ (sendSOSAlert)              │
└────────┬─────────────────────┘
         │
         │ 3. Call Twilio API
         │
┌────────▼──────────────────────┐
│ Twilio SMS Gateway            │
└────────┬─────────────────────┘
         │
         │ 4. Send SMS
         │
    ┌────▼────────────────────┐
    │ Emergency Contacts      │
    │ (via SMS carrier)       │
    └────────────────────────┘
```

## Next Steps

1. Sign up for Twilio account
2. Deploy Cloud Functions
3. Set Twilio credentials in Firebase
4. Test with emergency contacts
5. Monitor Cloud Function logs for issues

For questions or issues, check:
- [Twilio Documentation](https://www.twilio.com/docs/sms)
- [Firebase Functions Guide](https://firebase.google.com/docs/functions)
- [App Code: automaticSMSService.ts](../services/automaticSMSService.ts)
