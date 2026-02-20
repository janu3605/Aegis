# 🛡️ Aegis - Women Safety App

AI-powered, offline-first women safety application with comprehensive emergency response features.

## 📋 Project Setup Guide

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Physical device with Expo Go app (recommended for testing location features)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env and add your API keys
   # - Firebase configuration
   # - Google Gemini API key
   ```

3. **Firebase Setup** (Required for community features and buddy system)
   - Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Realtime Database
   - Enable Storage
   - Copy your config to `.env` file
   - Set up database rules (see `firebase-rules.json`)

4. **Google Gemini API Setup** (Required for AI chatbot)
   - Visit [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add to `.env` as `EXPO_PUBLIC_GEMINI_API_KEY`

### Running the App

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Clear cache and start
npx expo start --clear
```

### Testing on Physical Device

1. Install Expo Go app on your phone
2. Scan the QR code from `npx expo start`
3. **Note:** Some features (SMS, background location) require building a development client

### Building Development Client

For full feature access (background location, SMS, etc.):

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build development client
eas build --profile development --platform ios
eas build --profile development --platform android
```

## 📁 Project Structure

```
Aegis-App/
├── app/                      # Expo Router navigation
├── services/                # Core services
│   ├── locationService.ts
│   ├── sosService.ts
│   ├── storageService.ts
│   ├── firebaseService.ts
│   └── aiService.ts
├── components/              # Reusable UI components
├── screens/                 # App screens
├── hooks/                   # Custom React hooks
├── utils/                   # Helper functions
│   └── constants.ts
├── types/                   # TypeScript types
│   └── index.ts
├── assets/                  # Images, audio, fonts
├── app.json                 # Expo configuration
├── package.json
└── .env                     # Environment variables
```

## 🎯 Core Features Implemented

### ✅ Foundation (Completed)
- [x] Project structure setup
- [x] Core services implementation
  - Location tracking service
  - SOS alert service
  - Storage service (AsyncStorage + SecureStore)
  - Firebase service (Realtime DB + Storage)
  - AI chatbot service (Google Gemini)
- [x] Type definitions
- [x] Constants and configuration
- [x] Environment setup

### 🚧 In Progress
- [ ] Emergency SOS screen
- [ ] Emergency contacts management
- [ ] Fake call feature
- [ ] Stealth mode
- [ ] AI safety chatbot UI
- [ ] Buddy system
- [ ] Community safety feed

## 🔑 API Keys Required

| Service | Required For | Get It From |
|---------|-------------|-------------|
| Firebase | Community feed, Buddy system, Evidence storage | [Firebase Console](https://console.firebase.google.com) |
| Google Gemini | AI safety chatbot | [Google AI Studio](https://makersuite.google.com/app/apikey) |

## ⚙️ Configuration

### Permissions Required

The app requires these permissions (configured in `app.json`):
- 📍 Location (foreground & background)
- 📷 Camera
- 🎤 Microphone  
- 📱 Contacts
- 💬 SMS
- 🔔 Notifications
- 🔐 Biometric authentication

### Background Modes (iOS)
- Location updates
- Audio (for voice detection)
- Background fetch

## 🧪 Testing Features

### Testing SOS Alerts
```typescript
import SOSService from './src/services/sosService';

// Test notification
await SOSService.testSOS();

// Trigger mock SOS
await SOSService.triggerSOS('manual', 'test-user');
```

### Testing Location Service
```typescript
import LocationService from './src/services/locationService';

// Get current location
const location = await LocationService.getCurrentLocation();
console.log(location);

// Start watching location
await LocationService.startWatching((loc) => {
  console.log('Location update:', loc);
});
```

### Testing AI Service
```typescript
import AIService from './src/services/aiService';

// Start chat
AIService.startChatSession();

// Send message
const response = await AIService.sendMessage('I feel unsafe walking home');
console.log(response);
```

## 🐛 Troubleshooting

### Common Issues

**Location not working:**
- Ensure location permissions are granted
- Test on physical device (simulators have limited GPS)
- Check that location services are enabled in device settings

**Firebase connection failed:**
- Verify `.env` file has correct Firebase config
- Check Firebase project is active
- Ensure Realtime Database is enabled

**AI chatbot not responding:**
- Verify Gemini API key in `.env`
- Check API key is valid and has quota
- Monitor console for error messages

**Build errors:**
- Run `npx expo start --clear` to clear cache
- Delete `node_modules` and run `npm install` again
- Check all dependencies are compatible with Expo SDK 54

## 📦 Key Dependencies

```json
{
  "expo": "~54.0.33",
  "expo-location": "Location tracking & geofencing",
  "expo-camera": "Evidence collection",
  "expo-av": "Fake call audio",
  "expo-sms": "Emergency alerts",
  "expo-notifications": "Push notifications",
  "firebase": "Backend services",
  "@google/generative-ai": "AI chatbot",
  "expo-task-manager": "Background tasks"
}
```

## 🚀 Next Steps

1. **Immediate (Week 1)**
   - [ ] Create SOS screen with countdown button
   - [ ] Build emergency contacts screen
   - [ ] Implement fake call feature
   - [ ] Add basic stealth mode

2. **Short-term (Week 2)**
   - [ ] Build AI chatbot UI
   - [ ] Implement buddy system
   - [ ] Create community safety feed
   - [ ] Add evidence collection

3. **Long-term (Week 3+)**
   - [ ] Voice distress detection
   - [ ] Behavioral pattern recognition
   - [ ] AR safe navigation
   - [ ] Mesh network (requires custom dev client)

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Gemini AI](https://ai.google.dev/docs)

## 🤝 Contributing

This is an active development project. To contribute:
1. Check `FEATURE_ANALYSIS.md` for feature roadmap
2. Pick a feature from "not-started" status
3. Create a feature branch
4. Implement with tests
5. Submit PR with demo video

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for women's safety**
