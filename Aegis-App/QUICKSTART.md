# 🛡️ Aegis Quick Start Guide

## 📦 Installation & Running

```bash
cd Aegis-App
npm install      # Skip if already done
npx expo start   # Start dev server
# Press 'a' for Android or 'i' for iOS
```

**First Load**: Expo will download dependencies (~2-5 min on first run)

---

## 🎯 Core Features Overview

### **Home Screen**
- **SOS Button**: Emergency alert center  
- **Fake Call**: Simulate incoming call instantly
- **Contacts**: Manage emergency contacts
- **Settings**: Configure stealth mode & safety options
- **History**: View past SOS alerts and calls

### **Key Actions**

| Action | Navigation |
|--------|-----------|
| Trigger SOS | Home → SOS button → Confirm |
| Add Contact | Home → Contacts → ➕ Add Contact |
| Set Stealth PIN | Home → Settings → Stealth PIN Code |
| View History | Home → History → Tab view |
| Enable Night Mode | Home → Settings → Toggle |

---

## 📁 Project Structure

```
Aegis-App/src/
├── screens/       # UI screens (4 screens)
├── services/      # Business logic (4 services)
├── components/    # Reusable UI (Button, Header)
├── types/         # TypeScript interfaces
├── constants/     # App-wide config
├── utils/         # Helpers (empty - for Phase 2)
├── hooks/         # Custom hooks (empty - for Phase 2)
└── navigation.tsx # Navigation setup
```

---

## 🔧 Service APIs

### **ContactManager**
```typescript
import { ContactManager } from './services';

await ContactManager.addContact({ name, phoneNumber, relationship })
await ContactManager.getAllContacts()
await ContactManager.updateContact(id, updates)
await ContactManager.deleteContact(id)
```

### **SOSService**
```typescript
import { SOSService } from './services';

await SOSService.triggerSOS(message?)
await SOSService.getSOSHistory()
await SOSService.getRecentSOSEvents(limit)
```

### **FakeCallService**
```typescript
import { FakeCallService } from './services';

await FakeCallService.startFakeCall(callerName)
await FakeCallService.scheduleFakeCall(delaySeconds, callerName)
await FakeCallService.getFakeCallHistory()
await FakeCallService.endFakeCall()
```

### **StealthModeService**
```typescript
import { StealthModeService } from './services';

await StealthModeService.toggleStealthMode(boolean)
await StealthModeService.setStealthPin(pin)
await StealthModeService.verifyStealthPin(pin)
await StealthModeService.isStealthModeActive()
await StealthModeService.toggleNightMode(boolean)
```

---

## 🎨 Component Usage

### **Button Component**
```typescript
<Button
  title="Action"
  onPress={handlePress}
  variant="primary"      // primary|secondary|danger|success
  size="large"           // small|medium|large
  disabled={false}
/>
```

### **Header Component**
```typescript
<Header 
  title="Screen Title"
  subtitle="Optional subtitle"
/>
```

---

## 📱 Screens

| Screen | Purpose | Features |
|--------|---------|----------|
| **Home** | Main dashboard | SOS, quick actions, status |
| **Contacts** | Emergency contact management | Add, edit, delete CRUD |
| **Settings** | App configuration | Stealth PIN, night mode, auto-SOS |
| **History** | Event tracking | View SOS events and calls |

---

## 💾 Local Storage Keys

```typescript
EMERGENCY_CONTACTS: 'emergency_contacts'    // Array<Contact>
APP_SETTINGS: 'app_settings'                // AppSettings object
SOS_HISTORY: 'sos_history'                  // Array<SOSEvent>
FAKE_CALL_HISTORY: 'fake_call_history'      // Array<FakeCallEvent>
```

Access via: `import { STORAGE_KEYS } from './constants'`

---

## 🧪 Testing Commands

```bash
# Start dev server
npx expo start

# Start with Android emulator
npx expo start --android

# Start with iOS simulator
npx expo start --ios

# Start web (non-functional for mobile features)
npx expo start --web
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | Ensure you're in `Aegis-App` directory |
| Port in use | Run: `expo start --clear` |
| Dependencies not installed | Run: `npm install` |
| Navigation not working | Check React Navigation is imported |
| AsyncStorage not persisting | Check app has storage permissions |

---

## 📚 Documentation Files

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Comprehensive dev guide with Phase 2 roadmap
- **[FEATURE_ANALYSIS.md](../FEATURE_ANALYSIS.md)** — Feature breakdown and tech stack
- **[IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)** — What was built summary

---

## 🚀 Next Phase

Phase 2 features (in order of impact):

1. **AI Distress Detection** — Passive microphone monitoring
2. **AI Safety Chatbot** — Real-time safety guidance
3. **Offline Mesh Network** — Bluetooth SOS relay
4. **Buddy System** — Live location tracking
5. **AR Safe Navigation** — Camera-based safety overlay
6. **Silent Evidence Collection** — Auto-record on emergency

See `DEVELOPMENT.md` → "Next Steps — Phase 2" for detailed implementation guide.

---

## 💡 Development Patterns

### **Adding a New Screen**
1. Create `src/screens/MyScreen.tsx`
2. Export from `src/screens/index.ts`
3. Add to navigation in `src/navigation.tsx`
4. Create corresponding service if needed in `src/services/`

### **Adding a New Service**
1. Create `src/services/myService.ts`
2. Import/use AsyncStorage for data persistence
3. Export from `src/services/index.ts`
4. Use in screens via `import { MyService } from '../services'`

### **Using Data in Components**
```typescript
// In screen component
useEffect(() => {
  loadData();
}, [useFocusEffect]);  // Re-load when screen focused

const loadData = async () => {
  try {
    const data = await MyService.getData();
    setState(data);
  } catch (error) {
    Alert.alert('Error', 'Failed to load');
  }
};
```

---

## 🎯 Feature Checklist

### **Implemented (Phase 1)**
- [x] Emergency SOS trigger
- [x] Fake call simulator
- [x] Contact management
- [x] Stealth mode PIN
- [x] Event history
- [x] Night mode toggle
- [x] Auto-SOS config
- [x] Local data persistence

### **Next (Phase 2)**
- [ ] Distress detection
- [ ] AI chatbot
- [ ] Mesh network SOS
- [ ] Buddy system
- [ ] AR overlay
- [ ] Evidence collection

---

## 📞 Quick Links

- [Expo Docs](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [AsyncStorage](https://react-native-async-storage.github.io/)

---

## ✅ Ready?

1. **Run the app**: `npx expo start`
2. **Test a feature**: Add contact → Trigger SOS → Check history
3. **Explore code**: Open `src/screens/HomeScreen.tsx`
4. **Plan Phase 2**: See `DEVELOPMENT.md`

🚀 **Let's build a safer world for women!**
