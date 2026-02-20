# Vercel + msg91 SMS Setup for Aegis App

This guide explains how to set up **automatic SMS sending without Firebase**, using **Vercel** (free serverless platform) and **msg91** (cheap Indian SMS service).

## Why This Setup?

✅ **Free tier:** Vercel has unlimited free tier for serverless functions
✅ **Cheap SMS:** msg91 costs ~₹0.30-0.50 per SMS (70% cheaper than Twilio)
✅ **India-optimized:** Built for Indian market (+91 numbers)
✅ **No Firebase needed:** Simple REST API instead of Firebase complexity

---

## Setup Steps

### Step 1: Get msg91 Credentials

1. Sign up: https://msg91.com
2. Get free trial SMS credits (usually 100+ free SMS)
3. Go to Dashboard → API Key
4. Copy your **Auth Key** (looks like: `abcd1234efgh5678ijkl`)
5. Note the SMS **Route** (usually: `4` for transactional)
6. Set a **Sender ID** (max 6 characters, e.g., `AEGIS`)

### Step 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Create `vercel.json` config** (already done in repo at root)

4. **Deploy the function:**
   ```bash
   vercel deploy
   ```

5. **After deployment**, you'll get a URL like:
   ```
   https://aegis-app-xyz.vercel.app
   ```

### Step 3: Set Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your Aegis app
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value |
|----------|-------|
| `MSG91_AUTH_KEY` | Your msg91 Auth Key |
| `MSG91_ROUTE` | `4` (for transactional SMS) |
| `MSG91_SENDER_ID` | `AEGIS` (or your sender ID) |
| `SOS_AUTH_TOKEN` | Generate a secure random token |

**Example:**
```
MSG91_AUTH_KEY=abcd1234efgh5678ijkl
MSG91_ROUTE=4
MSG91_SENDER_ID=AEGIS
SOS_AUTH_TOKEN=super_secure_random_token_12345
```

5. **Redeploy after adding env vars:**
   ```bash
   vercel deploy --prod
   ```

### Step 4: Update App `.env` File

Copy `.env.example` to `.env` and update:

```env
# Vercel endpoint (replace with your deployed URL)
EXPO_PUBLIC_VERCEL_ENDPOINT=https://aegis-app-xyz.vercel.app/api/sendSOS

# Same secure token as Vercel
EXPO_PUBLIC_SOS_AUTH_TOKEN=super_secure_random_token_12345

# Keep your Firebase and Google API keys too
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
```

### Step 5: Test SMS Sending

**Via API Tester (cURL):**
```bash
curl -X POST https://aegis-app-xyz.vercel.app/api/sendSOS \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["+919876543210"],
    "location": {"latitude": 37.4219, "longitude": -122.084},
    "address": "Mountain View, CA 94043",
    "timestamp": "2026-02-20T15:36:39Z",
    "authToken": "super_secure_random_token_12345"
  }'
```

**Via App:**
1. Add an emergency contact with your phone number
2. Open Aegis app on Android
3. Press SOS button or say "help help help"
4. Check your phone for the SMS! 📱

---

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| **Vercel** | FREE | Unlimited functions |
| **msg91** | ₹0.30-0.50/SMS | Free trial: 100 SMS |
| **Monthly** | ₹15-25 | ~50-60 SOS alerts |

**Total:** < ₹30/month for 50+ SMSes!

---

## Troubleshooting

### SMS Not Sending?

1. **Check logs:**
   ```bash
   vercel logs https://aegis-app-xyz.vercel.app/api/sendSOS
   ```

2. **Verify auth token matches:**
   - Vercel env var: `SOS_AUTH_TOKEN`
   - App `.env`: `EXPO_PUBLIC_SOS_AUTH_TOKEN`
   - Both must match exactly!

3. **Check msg91 balance:**
   - Go to msg91 dashboard
   - Make sure you have SMS credits

4. **Verify phone number format:**
   - Must be +91XXXXXXXXXX format
   - But Vercel converts to 91XXXXXXXXXX (no +)
   - This is handled automatically ✓

### "Unauthorized" Error?

- Auth token mismatch between app and Vercel
- Regenerate a new secure token and update both places

### "SMS service not configured"?

- `MSG91_AUTH_KEY` not set in Vercel environment variables
- Add it in Vercel Settings → Environment Variables
- Redeploy with `vercel deploy --prod`

---

## Architecture Diagram

```
┌─────────────────┐
│  Aegis App      │
│  (Android/iOS)  │
└────────┬────────┘
         │
         │ 1. SOS Triggered
         │ (Voice or Button)
         │
┌────────▼──────────────────┐
│ automaticSMSService.ts    │
│ (calls Vercel endpoint)   │
└────────┬──────────────────┘
         │
         │ 2. HTTP POST to Vercel
         │
┌────────▼──────────────────────┐
│ Vercel Serverless Function    │
│ (FREE tier)                   │
│ /api/sendSOS.js              │
└────────┬─────────────────────┘
         │
         │ 3. Call msg91 API
         │
┌────────▼──────────────────────┐
│ msg91 SMS Gateway             │
│ (₹0.30-0.50 per SMS)         │
└────────┬─────────────────────┘
         │
         │ 4. Send SMS
         │
    ┌────▼────────────────────┐
    │ Emergency Contacts      │
    │ (via SMS carrier)       │
    └────────────────────────┘
```

---

## Advanced: Custom SMS Messages

To customize the SOS message, edit `api/sendSOS.js`:

```javascript
const message = `Custom message here...`;
```

---

## Next Steps

1. ✅ Sign up for msg91
2. ✅ Deploy to Vercel
3. ✅ Add environment variables
4. ✅ Update app `.env`
5. ✅ Test with real SMS
6. ✅ Monitor Vercel logs

**Total time:** ~15 minutes

---

## Questions?

- **msg91 help:** https://msg91.com/support
- **Vercel help:** https://vercel.com/docs
- **App issues:** Check logs with `vercel logs`

Happy safe texting! 🚀
