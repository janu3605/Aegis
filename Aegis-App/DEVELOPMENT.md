# 🛡️ Aegis — Development Setup & Implementation Guide

## ✅ Phase 1 Implementation Complete

This document guides you through the Phase 1 features that have been implemented.

### **What's Been Built**

#### Core Features Implemented
1. ✅ **Manual SOS Trigger** — Emergency alert button (Home screen)
2. ✅ **Fake Call/Distraction Mode** — Simulate incoming calls (quick action)
3. ✅ **Stealth/Disguise Mode** — Settings to enable stealth mode with PIN protection
4. ✅ **Contact Management** — Add, edit, delete emergency contacts
5. ✅ **Settings Screen** — Configure stealth PIN, night mode, auto-SOS
6. ✅ **Event History** — View past SOS events and fake calls
7. ✅ **Local Data Persistence** — All data stored via AsyncStorage

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js v18+
- Expo CLI: `npm install -g expo-cli`
- iOS/Android emulator or physical device with Expo Go app

### **Installation & Running**

```bash
# Navigate to project
cd Aegis-App

# Install dependencies (already done)
npm install

# Start the Expo dev server
npx expo start

# Options:
# - Press 'a' for Android emulator
# - Press 'i' for iOS simulator
# - Scan QR code with Expo Go app
```

---

## 📁 Project Structure

```
Aegis-App/
├── src/
│   ├── screens/              # App screens/pages
│   │   ├── HomeScreen.tsx       # Main dashboard with SOS button
│   │   ├── ContactsScreen.tsx   # Emergency contacts management
│   │   ├── SettingsScreen.tsx   # App settings & stealth mode
│   │   ├── HistoryScreen.tsx    # View past events
│   │   └── index.ts             # Screens export
│   ├── services/            # Business logic & data management
│   │   ├── fakeCallService.ts   # Fake call functionality
│   │   ├── contactManager.ts    # Contact CRUD operations
│   │   ├── sosService.ts        # SOS trigger & history
│   │   ├── stealthModeService.ts # Stealth mode config
│   │   └── index.ts             # Services export
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx           # Custom button component
│   │   ├── Header.tsx           # Screen header component
│   │   └── index.ts             # Components export
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts             # Type definitions
│   ├── constants/           # App-wide constants
│   │   └── index.ts             # Colors, storage keys, etc.
│   ├── hooks/               # Custom React hooks (for Phase 2)
│   ├── utils/               # Helper functions (for Phase 2)
│   └── navigation.tsx       # Navigation setup
├── App.tsx                  # App entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React Native + Expo |
| **Language** | TypeScript |
| **Navigation** | React Navigation (Stack Navigator) |
| **Storage** | AsyncStorage |
| **UI Components** | React Native built-in + Custom |
| **Safe Area** | react-native-safe-area-context |

---

## 📱 Implemented Features & How They Work

### **1️⃣ Home Screen**
- **Location**: `src/screens/HomeScreen.tsx`
- **Features**:
  - Large red SOS button — Main emergency trigger
  - Quick action grid — Fake Call, Contacts, Settings, History
  - Status indicator — Shows if stealth mode is active
  - Contact count — Displays number of emergency contacts

**Usage**:
```bash
# Tap SOS → Confirmation alert → Sends alert to all contacts
# Tap "Fake Call" → Simulates incoming call
# Tap "Contacts" → Navigate to contact management
```

---

### **2️⃣ Contact Management**
- **Location**: `src/screens/ContactsScreen.tsx`
- **Service**: `src/services/contactManager.ts`
- **Features**:
  - Add new emergency contacts
  - Edit existing contacts
  - Delete contacts
  - Display name, phone, relationship
  - Persisted in AsyncStorage

**API Usage** (in services):
```typescript
import { ContactManager } from './services';

// Add contact
const contact = await ContactManager.addContact({
  name: 'Mom',
  phoneNumber: '+1234567890',
  relationship: 'Mother',
});

// Get all contacts
const contacts = await ContactManager.getAllContacts();

// Update contact
await ContactManager.updateContact(contactId, { name: 'Mom - Updated' });

// Delete contact
await ContactManager.deleteContact(contactId);
```

---

### **3️⃣ SOS Service**
- **Location**: `src/services/sosService.ts`
- **Features**:
  - Trigger emergency alert with location
  - Track SOS events in history
  - Notify emergency contacts
  - Store GPS coordinates

**API Usage**:
```typescript
import { SOSService } from './services';

// Trigger SOS
const sosEvent = await SOSService.triggerSOS('Under threat');

// Get history
const history = await SOSService.getSOSHistory();

// Get recent events
const recent = await SOSService.getRecentSOSEvents(5);
```

---

### **4️⃣ Fake Call Service**
- **Location**: `src/services/fakeCallService.ts`
- **Features**:
  - Simulate realistic incoming call
  - Schedule fake calls for later
  - Log call history
  - Support custom caller names

**API Usage**:
```typescript
import { FakeCallService } from './services';

// Start immediate fake call
await FakeCallService.startFakeCall('Mom');

// Schedule call for 30 seconds from now
await FakeCallService.scheduleFakeCall(30, 'Boss');

// Get history
const history = await FakeCallService.getFakeCallHistory();

// End call
await FakeCallService.endFakeCall();
```

---

### **5️⃣ Stealth Mode Service**
- **Location**: `src/services/stealthModeService.ts`
- **Features**:
  - Toggle stealth mode on/off
  - Set custom PIN code
  - Verify PIN for unlock
  - Night mode toggle
  - Auto-SOS configuration

**API Usage**:
```typescript
import { StealthModeService } from './services';

// Check if stealth mode is active
const isActive = await StealthModeService.isStealthModeActive();

// Set new PIN
await StealthModeService.setStealthPin('1234');

// Verify PIN
const isValid = await StealthModeService.verifyStealthPin('1234');

// Toggle stealth mode
await StealthModeService.toggleStealthMode(true);

// Toggle night mode
await StealthModeService.toggleNightMode(true);
```

---

## 🎯 Next Steps — Phase 2 (Weeks 3-4)

### **Priority Features to Implement**

#### **1. AI Distress Detection (High Impact)**
- [ ] Install: `expo-speech`, `expo-background-fetch`, `expo-task-manager`
- [ ] Create `src/services/distressDetectionService.ts`
- [ ] On-device speech recognition for keywords
- [ ] Background microphone monitoring
- [ ] Auto-trigger SOS on distress detection
- [ ] File: Track implementation in `src/services/distressDetectionService.ts`

#### **2. AI Safety Chatbot (High Impact)**
- [ ] Install: `google-generative-ai` (Gemini API)
- [ ] Create `src/screens/ChatbotScreen.tsx`
- [ ] Create `src/services/chatbotService.ts`
- [ ] Real-time chat UI with message history
- [ ] Detect urgency in user messages
- [ ] Provide safety tips and legal guidance
- [ ] Auto-escalate to SOS when needed

#### **3. Basic Mesh Network SOS (Technical)**
- [ ] Install: `react-native-ble-plx` (or use Expo bare workflow)
- [ ] Create `src/services/bleService.ts`
- [ ] BLE broadcast when internet unavailable
- [ ] Message relay between nearby phones
- [ ] Encryption for message security
- [ ] Connection status indicator on home screen

---

## 🔌 Phase 2 Installation Guide

Once you're ready for Phase 2, run:

```bash
# Install speech recognition & background task support
npx expo install expo-speech expo-task-manager expo-background-fetch

# Install for distress detection & microphone
npx expo install expo-av

# Install for AI chatbot (choose one)
npm install google-generative-ai  # For Gemini

# Install for BLE mesh network (requires custom development client)
npx expo install react-native-ble-plx
# Or use:
npx eas build --platform android --profile preview
```

---

## 🔐 Security & Privacy Notes

1. **Data Storage**: All data is stored locally via AsyncStorage. No backend yet.
2. **Encryption**: Currently placeholder. Implement AES encryption for sensitive data in Phase 2.
3. **Location**: Currently hardcoded (0,0). Integrate `expo-location` in Phase 2.
4. **Permissions**: Update `app.json` with platform-specific permissions (already added).

---

## 📊 Storage Schema

### **AsyncStorage Keys** (defined in `src/constants/index.ts`)
```typescript
EMERGENCY_CONTACTS: 'emergency_contacts'        // Array<EmergencyContact>
APP_SETTINGS: 'app_settings'                    // AppSettings object
SOS_HISTORY: 'sos_history'                      // Array<SOSEvent>
FAKE_CALL_HISTORY: 'fake_call_history'          // Array<FakeCallEvent>
STEALTH_PIN: 'stealth_pin'                      // string
USER_LOCATION: 'user_location'                  // {lat, lon}
```

### **Type Definitions** (in `src/types/index.ts`)
```typescript
interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string;
}

interface SOSEvent {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  contactsNotified: string[];
  message?: string;
}

interface FakeCallEvent {
  id: string;
  timestamp: number;
  callerName: string;
  duration?: number;
}

interface AppSettings {
  stealthModeEnabled: boolean;
  stealthPinCode: string;
  nightModeEnabled: boolean;
  autoSOSEnabled: boolean;
  emergencyContacts: EmergencyContact[];
}
```

---

## 🧪 Testing the Current Implementation

### **Test Case 1: Add Emergency Contact**
```
1. Tap "Contacts" from home screen
2. Tap "➕ Add Contact"
3. Fill in: Name: "Mom", Phone: "+1234567890", Relationship: "Mother"
4. Tap "Save Contact"
5. Should appear in contacts list ✓
```

### **Test Case 2: Trigger SOS**
```
1. Add at least one contact first
2. From home screen, tap large SOS button
3. Confirm dialog appears
4. Tap "Yes, Send SOS"
5. Alert shows "SOS Sent" ✓
6. Check "History" tab to see event logged ✓
```

### **Test Case 3: Fake Call**
```
1. From home screen, tap "Fake Call" grid item
2. Alert shows "Fake Call Started" ✓
3. Go to History → "📞 Fake Calls" tab
4. Should see event logged ✓
```

### **Test Case 4: Stealth Mode Configuration**
```
1. Tap "Settings"
2. Toggle "Enable Stealth Mode" on
3. Tap "Stealth PIN Code" → "Change"
4. Enter PIN: "1234"
5. Confirm PIN: "1234"
6. Tap "Save PIN"
7. Should show "Success" alert ✓
```

---

## 🐛 Common Issues & Troubleshooting

### **Issue: "Cannot find module 'src/...'"**
- **Solution**: Make sure you're in the `Aegis-App` directory when running `npx expo start`

### **Issue: AsyncStorage data not persisting**
- **Solution**: In emulator, data persists. On physical device, ensure app has storage permissions.

### **Issue: Navigation not working**
- **Solution**: Verify `react-navigation`, `@react-navigation/native`, `react-native-gesture-handler` are installed

### **Issue: Compilation errors in ts**
- **Solution**: Run `npx expo start` in a fresh terminal, or restart your TypeScript server

---

## 📚 Resources & Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [AsyncStorage API](https://react-native-async-storage.github.io/async-storage/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🎯 Checklist for Phase 2 Kickoff

- [ ] Review Phase 2 features in this guide
- [ ] Install additional dependencies listed
- [ ] Create distress detection service
- [ ] Build distress monitoring UI
- [ ] Implement chatbot screen & service
- [ ] Set up Gemini API key (Firebase Console)
- [ ] Test background task on real device
- [ ] Document any new services/screens

---

## 💡 Development Tips

1. **Hot Reload**: Changes auto-reload in Expo. Edit and save to see changes.
2. **Debug**: Use `console.log()` — output appears in terminal running `npx expo start`
3. **Device Testing**: Scan QR code with Expo Go to test on real phone
4. **Storage**: Use `AsyncStorage.getItem()` to inspect data during development
5. **Navigation**: Use React Navigation DevTools for debugging navigation state

---

## 🤝 Contributing

When adding new features:
1. Create service in `src/services/`
2. Create screen in `src/screens/` if UI is needed
3. Export from `index.ts` files
4. Add TypeScript interfaces to `src/types/`
5. Add constants to `src/constants/` if needed
6. Test thoroughly before committing

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Expo error logs
3. Check React Navigation docs for navigation issues
4. Search GitHub issues for similar problems

---

**Happy coding! 🚀 The Aegis team**
