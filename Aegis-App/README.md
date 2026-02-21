# Aegis - BLE Branch

AI-powered women safety app with offline-first emergency response, built with React Native (Expo prebuild / bare workflow).

This branch implements the core SOS system with multi-channel emergency dispatch, offline BLE relay via Google Nearby Connections, native Android SMS, and an AI safety chatbot.

---

## What's Implemented

### 1. Multi-Channel SOS System

The SOS system is the core of Aegis. When triggered, it checks connectivity and dispatches alerts through the appropriate channel.

**SOS Flow:**

```
User presses SOS button
        |
  5-second countdown (cancellable)
        |
  Get GPS location + emergency contacts
        |
  Check internet connectivity
       / \
      /   \
 ONLINE    OFFLINE
   |          |
 Send SMS   BLE broadcast via
 to all     Nearby Connections
 contacts      |
   |        Bystander picks up?
   |         /        \
   |       YES         NO (30s timeout)
   |        |            |
   |     Relay to      Alert Mode:
   |     bystander     screen flash,
   |                   vibration,
   |                   haptics
   |
 Save to history + start background location tracking
```

**Key files:**
- `services/sosService.ts` - Orchestrates the full SOS lifecycle and phase management
- `services/nearbyService.ts` - BLE victim broadcast and bystander relay
- `services/locationService.ts` - GPS, reverse geocoding, background tracking
- `modules/expo-sos-module/` - Custom Kotlin native module for silent SMS

### 2. Native SMS (Android) — Implementation Detail

Standard React Native SMS libraries (like `expo-sms`) open the device's SMS app and require the user to press send. In an emergency this is unacceptable — the victim may not be able to interact with the phone. Aegis solves this with a **custom Expo native module written in Kotlin** that sends SMS silently in the background, with no user interaction.

#### Why a custom native module?

React Native has no built-in way to send SMS without opening the SMS app. The `expo-sms` package opens the default SMS app with a pre-filled message — the user still has to press send. For an SOS system, the message must dispatch automatically the moment the countdown ends. This requires direct access to Android's `SmsManager` API, which is only available from native (Kotlin/Java) code.

#### How it works (end to end)

```
sosService.ts                        ExpoSosModule.kt (Kotlin)
     |                                      |
  1. Request SEND_SMS              2. Get SmsManager instance
     runtime permission               (Android 12+ aware)
     |                                      |
  If GRANTED:                      3. divideMessage() to check
     |                                if multipart needed
  Call sendNativeSMS()                      |
     via Expo bridge             4a. Single part:
     |                               sendTextMessage()
  If DENIED or FAILED:                + BroadcastReceiver
     |                               waits for confirmation
  fallbackToSMSApp()                        |
     opens SMS app via           4b. Multi-part:
     Linking.openURL(sms://...)      sendMultipartTextMessage()
                                     + one BroadcastReceiver
                                     per part, all must confirm
                                            |
                                  5. CountDownLatch.await(30s)
                                     blocks until radio confirms
                                     send or 30s timeout
                                            |
                                  6. Repeat for each phone number
                                     (1-second delay between sends)
```

#### Kotlin native module internals (`ExpoSosModule.kt`)

The module is registered as `ExpoSosModule` via Expo Modules API and exposes one async function to JavaScript:

```
sendSMS(phoneNumbers: List<String>, message: String) -> Boolean
```

**SmsManager initialization** — Android 12 (API 31) deprecated the static `SmsManager.getDefault()`. The module handles both paths:
```kotlin
val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    context.getSystemService(SmsManager::class.java)   // Android 12+
} else {
    SmsManager.getDefault()                             // Android 10-11
}
```

**Send confirmation via BroadcastReceiver** — Android's `sendTextMessage()` is asynchronous. The radio dispatches the message but doesn't return a result synchronously. To confirm the message actually sent, the module:
1. Creates a unique broadcast action per message using `System.nanoTime()` (e.g., `SMS_SENT_38291749234`)
2. Registers a `BroadcastReceiver` that listens for that specific action
3. Creates a `PendingIntent` pointing to that action with `FLAG_IMMUTABLE` (required on Android 12+)
4. Calls `smsManager.sendTextMessage(phone, null, message, sentIntent, null)`
5. Blocks using a `CountDownLatch` for up to 30 seconds
6. When the cellular radio fires the intent, the receiver's `onReceive` calls `latch.countDown()`
7. If `resultCode != RESULT_OK`, throws with a descriptive error:
   - `RESULT_ERROR_GENERIC_FAILURE` — generic failure
   - `RESULT_ERROR_RADIO_OFF` — cellular radio is off (airplane mode)
   - `RESULT_ERROR_NULL_PDU` — null PDU (protocol data unit)
   - `RESULT_ERROR_NO_SERVICE` — no cellular service available

**Multi-part messages** — If the message exceeds the SMS character limit (~160 for GSM-7, ~70 for Unicode), `smsManager.divideMessage()` splits it into parts. Each part gets its own `BroadcastReceiver` and `PendingIntent`. The `CountDownLatch` is initialized with `parts.size` so all parts must confirm before returning success. If any part fails, the module reports which parts failed (e.g., "2/3 parts failed").

**Android 13+ receiver registration** — Android 13 (API 33, Tiramisu) requires specifying receiver export behavior for security:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
} else {
    context.registerReceiver(receiver, filter)
}
```

**Multiple phone numbers** — The module iterates through each number with a 1-second `Thread.sleep()` delay between sends. This prevents overwhelming the cellular radio — some devices fail or silently drop messages when dispatched too rapidly back-to-back.

**Error aggregation** — If sending to some numbers fails but others succeed, errors are collected into a list and thrown as a single exception: `"SMS failed for: +1234: radio off; +5678: no service"`. The caller can parse this to know which contacts were reached.

#### TypeScript bridge (`modules/expo-sos-module/index.ts`)

The bridge uses `requireNativeModule` from Expo Modules Core. It gracefully handles the case where the native module isn't available (e.g., running on iOS or before `npx expo prebuild`):

```typescript
let ExpoSosModule = null;
try {
    ExpoSosModule = requireNativeModule('ExpoSosModule');
} catch (e) {
    console.warn('ExpoSosModule not available — falls back to Linking API.');
}

export function sendSMS(phoneNumbers: string[], message: string): Promise<boolean> {
    if (!ExpoSosModule) return Promise.reject(new Error('Not available'));
    return ExpoSosModule.sendSMS(phoneNumbers, message);
}
```

#### Permission + fallback flow (`sosService.ts`)

1. `PermissionsAndroid.request(SEND_SMS)` with a rationale dialog explaining: *"Aegis needs to send automatic SMS to your emergency contacts when SOS is triggered."*
2. If **granted**: call `sendNativeSMS(phoneNumbers, message)` — message sends silently in background, user sees nothing
3. If native module **throws** (radio error, timeout, partial failure): fall through to fallback
4. If **denied**: fall through to fallback
5. **Fallback**: `Linking.openURL('sms:number1;number2?body=...')` — opens the default SMS app with pre-filled recipients and message body. The user must press send manually. This is the last resort.

#### SMS message format

The actual message sent to emergency contacts:

```
EMERGENCY SOS! I need help. This is my current location:
Location: 123 Main St, City, State
Map: https://maps.google.com/?q=12.97,77.59
Time: 2/21/2026, 3:45 PM
```

- Address is reverse-geocoded from GPS coordinates via `expo-location`
- Google Maps link is clickable — contacts can tap to see exact location
- On resolution, a separate SMS is sent: *"I am safe now. The emergency has been resolved. Thank you for your concern."*

**Files:**
- `modules/expo-sos-module/android/src/main/java/expo/modules/sosmodule/ExpoSosModule.kt` — Kotlin native module (177 lines)
- `modules/expo-sos-module/index.ts` — TypeScript bridge
- `modules/expo-sos-module/expo-module.config.json` — Expo module registration
- `services/sosService.ts` — Permission request, fallback logic, message formatting

---

### 3. Offline BLE Relay (Nearby Connections) — Implementation Detail

#### The problem

If the victim has no internet — attacker forced airplane mode, rural area with no cell signal, underground parking, or a subway — traditional SMS and HTTP calls cannot dispatch. The phone becomes completely isolated. The victim cannot call for help through any network-dependent channel.

#### The solution: Peer-to-peer relay via Nearby Connections

The victim's phone broadcasts a compact SOS payload over **Google Nearby Connections API** (which uses BLE + WiFi Direct under the hood). Any nearby phone running Aegis in **Bystander Mode** receives the signal automatically and shows a notification with the victim's GPS coordinates. Zero user interaction is required on either device.

This is a **"dumb pipe"** architecture — one-hop relay only, no mesh networking, no complex routing. Victim advertises, bystander discovers, payload is transferred, connection is closed.

#### Complete flow (step by step)

```
VICTIM DEVICE (no internet)                BYSTANDER DEVICE (has internet)
━━━━━━━━━━━━━━━━━━━━━━━━━━                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. sosService detects no internet
   via NetInfo.fetch()
        |
2. setPhase('ble-broadcasting')
   UI shows "Broadcasting SOS..."
        |
3. Build BLESOSPayload:                   1. User enables Bystander Mode
   { userId, lat, lng, timestamp }            in Settings screen
        |                                          |
4. Encode to pipe-delimited string:        2. NearbyService.startBystanderScanning()
   "USR123|12.970000|77.590000|1708..."            |
        |                                  3. NearbyConnections.startDiscovery(
5. Request BLE permissions:                   "AEGIS-SOS")
   - ACCESS_FINE_LOCATION                          |
   - BLUETOOTH_SCAN (Android 12+)         4. Scanning for nearby advertisers...
   - BLUETOOTH_CONNECT (Android 12+)               |
   - BLUETOOTH_ADVERTISE (Android 12+)             |
   - NEARBY_WIFI_DEVICES (Android 13+)             |
        |                                          |
6. NearbyConnections.startAdvertise(               |
   "AEGIS-SOS")                                    |
        |                                          |
7. Start 30-second timeout timer                   |
        |                                          |
   ┌────┴─────────────────────────────────────────┘
   │        DISCOVERY & CONNECTION
   │
   │  Bystander's onPeerFound fires →
   │  auto-calls requestConnection(peerId)
   │         |
   │  Victim's onInvitationReceived fires →
   │  auto-calls acceptConnection(peerId)
   │         |
   │  Both sides: onConnected fires
   │
   └────┬─────────────────────────────────────────┐
        |                                          |
8. onConnected: send payload via              5. onConnected: wait for payload
   NearbyConnections.sendText(                         |
   peerId, "USR123|12.97|77.59|1708")         6. onTextReceived: decode payload
        |                                         split by '|' delimiter
        |                                         validate lat/lng/timestamp
        |                                              |
        |                                      7. Call onSOSDetected callback →
        |                                         sosService.relayDetectedSOS():
        |                                         - Show local notification with
        |                                           victim's GPS coordinates
        |                                         - Log Google Maps URL
        |                                              |
        |                                      8. NearbyConnections.disconnect(
        |                                         peerId) — done relaying
        |                                              |
9. onDisconnected fires →                             |
   "Bystander received our SOS!"                      |
        |
10. Clear 30-second timeout
    Call onRelayed callback
        |
11. setPhase('active')
    Show notification:
    "A nearby phone picked up your SOS"

   ┌─── IF NO BYSTANDER FOUND ───┐
   │                              │
   │  30-second timer expires     │
   │         |                    │
   │  Stop advertising            │
   │  (save battery)              │
   │         |                    │
   │  Call onTimeout callback     │
   │         |                    │
   │  activateAlertMode()         │
   │  setPhase('alert-mode')      │
   │         |                    │
   │  Phone becomes physical      │
   │  distress beacon:            │
   │  - Red/white screen flash    │
   │  - Continuous vibration      │
   │  - Haptic feedback           │
   │  - GPS shown on screen       │
   └──────────────────────────────┘
```

#### Payload encoding / decoding

The payload is kept minimal for fast BLE transfer:

```
Format:  userId|latitude|longitude|timestamp
Example: USR123|12.970000|77.590000|1708456789
```

- **Delimiter**: pipe character `|` (configured in `BLE_CONFIG.PAYLOAD_DELIMITER`)
- **Latitude/Longitude**: 6 decimal places (~11cm precision)
- **Timestamp**: Unix epoch seconds
- **No JSON** — pipe-delimited string is faster to encode/decode and smaller over BLE

The decoder validates every field before accepting a payload:
- At least 4 parts after split
- userId is non-empty
- Latitude in range [-90, 90]
- Longitude in range [-180, 180]
- Timestamp is a positive integer

Invalid or malformed payloads return `null` and are silently dropped.

#### Nearby Connections event model

The service uses six event listeners from `expo-nearby-connections`:

| Event | Victim Side | Bystander Side |
|-------|-------------|----------------|
| `onPeerFound` | — | Auto-call `requestConnection(peerId)` |
| `onPeerLost` | — | Log that victim signal lost |
| `onInvitationReceived` | Auto-call `acceptConnection(peerId)` | Auto-call `acceptConnection(peerId)` |
| `onConnected` | Send payload via `sendText(peerId, data)` | Wait for payload |
| `onTextReceived` | — | Decode payload + call callback + disconnect |
| `onDisconnected` | Assume relay succeeded + clear timeout | — |

All listener unsubscribe functions are stored in a `listenerCleanups[]` array and called on cleanup to prevent memory leaks.

#### Permission model

Nearby Connections requires different permissions depending on Android version:

| Android Version | Required Permissions |
|----------------|---------------------|
| 10-11 (API 29-30) | `ACCESS_FINE_LOCATION` |
| 12 (API 31-32) | `ACCESS_FINE_LOCATION` + `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` + `BLUETOOTH_ADVERTISE` |
| 13+ (API 33+) | All of the above + `NEARBY_WIFI_DEVICES` |

All permissions are requested at runtime via `PermissionsAndroid.requestMultiple()`. Each permission result is individually checked and logged. If any critical permission is denied, the BLE operation returns `false` and the SOS service falls through to Alert Mode.

#### Bystander mode lifecycle

1. User toggles **Bystander Mode** ON in Settings screen
2. Preference saved to AsyncStorage (`@aegis_bystander_mode`)
3. `NearbyService.startBystanderScanning()` begins discovery with service name `"AEGIS-SOS"`
4. Runs continuously in the foreground — no background service, app must be open
5. When SOS detected: `sosService.relayDetectedSOS()` fires a local notification with the victim's GPS coordinates
6. User toggles OFF → `NearbyService.stopBystanderScanning()` → cleanup all listeners, disconnect all endpoints

#### Timeout and Alert Mode

If no bystander connects to the victim within **30 seconds** (`BLE_CONFIG.TIMEOUT_MS`):
1. Timeout timer fires
2. Advertising is stopped (save battery)
3. `onTimeout` callback triggers `sosService.activateAlertMode()`
4. Phase changes to `alert-mode`
5. `HomeScreen.tsx` renders the Alert Mode overlay: full-screen red/white flashing, continuous vibration, haptic feedback, GPS coordinates displayed on screen
6. The phone itself becomes a physical distress beacon — loud and visible to people nearby

#### Cleanup and error handling

- All event listeners tracked in `listenerCleanups[]` array, unsubscribed on stop
- All connected endpoints tracked in `connectedEndpoints` Set, disconnected on cleanup
- Timeout timer cleared when relay succeeds or broadcast is stopped
- Full cleanup on SOS resolve: `stopVictimBroadcast()` + `stopBystanderScanning()` + null all callbacks
- `expo-nearby-connections` loaded via `try/catch require()` — if package is unavailable, `isAvailable()` returns `false` and all BLE methods return `false` gracefully, falling through to Alert Mode

**Files:**
- `services/nearbyService.ts` — Full victim/bystander implementation (547 lines)
- `services/sosService.ts` — BLE fallback trigger, Alert Mode activation, bystander relay handler
- `screens/SettingsScreen.tsx` — Bystander mode toggle
- `screens/HomeScreen.tsx` — BLE broadcasting overlay, Alert Mode overlay

### 4. Alert Mode (Last Resort)

If BLE broadcast times out with no relay, the phone itself becomes a distress beacon:
- Full-screen red/white flashing overlay
- Continuous vibration pattern
- Haptic feedback
- Displays GPS coordinates on screen

Dismissable by the user. Managed via SOS phase state machine.

**Phase state machine:**
```
idle -> countdown -> sending -> ble-broadcasting -> alert-mode -> active -> resolved
                                    |                               ^
                                    +--- (bystander relays) --------+
```

### 5. Community Feed (Local Storage)

Users can submit and view safety reports from the Community tab. Reports are stored locally on the device via AsyncStorage. This is a per-device feed (not shared across devices).

**Files:**
- `screens/CommunityFeedScreen.tsx`
- `services/storageService.ts` (`getSafetyReports()`, `addSafetyReport()`)

### 6. AI Safety Chatbot

Google Gemini (`gemini-1.5-flash`) powered chatbot that provides:
- Real-time safety guidance
- Legal rights information
- Self-defense tips
- De-escalation strategies
- Location safety analysis
- Urgency detection from user messages (low/medium/high/critical)

Automatically escalates when high-urgency keywords are detected.

**Files:**
- `services/aiService.ts`

### 7. Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Home | `/(tabs)/` | SOS button, countdown, BLE overlay, Alert Mode overlay, quick stats |
| Contacts | `/(tabs)/contacts` | Add/edit/delete emergency contacts, set primary |
| Community | `/(tabs)/community` | Real-time safety reports feed, submit reports, vote |
| Settings | `/(tabs)/settings` | Profile, safety toggles, bystander mode, night mode, clear data |

### 8. Storage

Two-tier storage system:
- **AsyncStorage:** User profile, emergency contacts, device settings, SOS history, chat history, bystander mode preference
- **SecureStore (expo-secure-store):** Stealth mode PIN, API keys

**Files:**
- `services/storageService.ts`

---

## Project Structure

```
Aegis-App/
  app/
    (tabs)/
      _layout.tsx          # Bottom tab navigator (Home, Contacts, Community, Settings)
      index.tsx            # -> HomeScreen
      contacts.tsx         # -> EmergencyContactsScreen
      community.tsx        # -> CommunityFeedScreen
      settings.tsx         # -> SettingsScreen
    _layout.tsx            # Root stack navigator
    modal.tsx
  screens/
    HomeScreen.tsx         # SOS button, countdown, Alert Mode, BLE status overlay
    EmergencyContactsScreen.tsx
    CommunityFeedScreen.tsx
    SettingsScreen.tsx     # Bystander mode toggle, safety feature toggles
  services/
    sosService.ts          # SOS lifecycle orchestration, phase management
    nearbyService.ts       # BLE victim/bystander via Nearby Connections
    locationService.ts     # GPS, background tracking, reverse geocoding
    storageService.ts      # AsyncStorage + SecureStore wrapper
    aiService.ts           # Google Gemini chatbot
  modules/
    expo-sos-module/
      index.ts             # TypeScript bridge: sendSMS(phoneNumbers[], message)
      expo-module.config.json
      android/
        build.gradle
        src/main/java/expo/modules/sosmodule/
          ExpoSosModule.kt # Native Kotlin SMS sender
  types/
    index.ts               # All TypeScript interfaces
  utils/
    constants.ts           # Config, colors, feature flags, storage keys
  components/
    haptic-tab.tsx, themed-text.tsx, etc.
  assets/
    images/
  app.json                 # Expo config, permissions, plugins
  package.json
  .env.example             # Environment variables template
```

---

## Prerequisites

- **Node.js** v18+
- **npm** or **yarn**
- **Java Development Kit (JDK)** 17 (required for Android native build)
- **Android Studio** with:
  - Android SDK (API 33+ recommended)
  - Android SDK Build-Tools
  - Android Emulator or a physical Android device (Android 10+)
- **Expo CLI**: `npm install -g expo-cli` (or use `npx expo`)

This app uses a **custom native module** (`expo-sos-module`) and `expo-nearby-connections`, so it **cannot run in Expo Go**. You must use a **development build** (Expo prebuild / bare workflow).

---

## Setup

### 1. Clone and install

```bash
git clone <repository-url>
cd Aegis/Aegis-App
npm install
```

### 2. Environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Gemini AI (required for chatbot)
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key

# Optional
EXPO_PUBLIC_APP_ENV=development
```

**Without Gemini API key:** AI chatbot features are disabled. Everything else works.

### 3. Generate native project

```bash
npx expo prebuild
```

This generates the `android/` directory with all native code, permissions, and the custom `expo-sos-module` linked.

### 4. Build and run on Android

**Option A: Physical device (recommended for BLE testing)**

Connect your Android device via USB with USB debugging enabled:

```bash
npx expo run:android
```

**Option B: Android Emulator**

Start an emulator from Android Studio, then:

```bash
npx expo run:android
```

Note: BLE / Nearby Connections features require a physical device. The emulator can test SMS logic and UI flows.

### 5. Start the dev server

If the dev server isn't already running:

```bash
npx expo start --dev-client
```

---

## Android Permissions

The app requests these permissions (declared in `app.json`, requested at runtime where applicable):

| Permission | Purpose |
|------------|---------|
| `ACCESS_FINE_LOCATION` | GPS for SOS alerts |
| `ACCESS_COARSE_LOCATION` | Approximate location fallback |
| `ACCESS_BACKGROUND_LOCATION` | Location tracking during active SOS |
| `SEND_SMS` | Silent native SMS to emergency contacts |
| `CAMERA` | Evidence collection |
| `RECORD_AUDIO` | Voice detection |
| `READ_CONTACTS` | Import contacts |
| `BLUETOOTH_SCAN` | Nearby Connections discovery (Android 12+) |
| `BLUETOOTH_ADVERTISE` | Nearby Connections advertising (Android 12+) |
| `BLUETOOTH_CONNECT` | Nearby Connections data transfer (Android 12+) |
| `ACCESS_WIFI_STATE` | Nearby Connections transport |
| `CHANGE_WIFI_STATE` | Nearby Connections transport |
| `NEARBY_WIFI_DEVICES` | Nearby Connections (Android 13+) |
| `FOREGROUND_SERVICE` | Background location tracking notification |
| `FOREGROUND_SERVICE_LOCATION` | Foreground service type for location |
| `VIBRATE` | Alert Mode vibration |

---

## How to Test Each Feature

### SOS + SMS

1. Go to the **Contacts** tab and add at least one emergency contact with a real phone number.
2. On the **Home** tab, press the **SOS** button.
3. A 5-second countdown starts. Let it complete.
4. The app requests SMS permission (first time only).
5. If granted: SMS is sent silently in the background. Check the contact's phone.
6. If denied: the default SMS app opens with a pre-filled message.
7. Press **"I'm Safe"** on the active alert banner to resolve and send a resolution SMS.

### BLE Offline Relay

Requires **two physical Android devices** with the app installed.

**Device A (Victim):**
1. Turn off WiFi and mobile data (airplane mode, but keep Bluetooth on).
2. Add emergency contacts and trigger SOS.
3. The app enters `ble-broadcasting` phase. A bottom overlay shows "Broadcasting SOS..."

**Device B (Bystander):**
1. Keep internet on.
2. Go to **Settings** and enable **Bystander Mode**.
3. Device B starts scanning for nearby SOS signals.
4. When it detects Device A's broadcast, it auto-connects, receives the payload, and shows a notification with the victim's location.
5. Device A sees "SOS Relayed" notification and transitions to `active` phase.

**If no bystander is found within 30 seconds:**
Device A enters Alert Mode (flashing red/white screen, vibration). Press "Dismiss Alert Mode" to exit.

### Community Feed

1. Go to the **Community** tab.
2. Press the report button to submit a safety report (requires location permission).
3. Reports are stored locally on your device.
4. Upvote/downvote reports. Distance from your current location is displayed.

### Settings

- **Profile:** Set your name, email, phone number.
- **Safety toggles:** Stealth mode, voice detection, auto-record, fake chat, biometric lock. UI toggles are present; full feature implementations are planned.
- **Bystander Mode:** Enables passive BLE scanning for nearby SOS signals.
- **Night Mode:** Schedule enhanced monitoring hours (10 PM - 6 AM default).
- **Clear Data:** Wipes contacts, profile, chat history, and SOS history.

---

## Packages & Modules per Feature

This maps every feature to the exact packages and native modules it depends on. Use this to verify whether a feature is functional on a given branch.

### SOS Orchestration (`sosService.ts`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `@react-native-community/netinfo` | `11.4.1` | `NetInfo.fetch()` — checks internet to decide SMS vs BLE path |
| `expo-notifications` | `^0.32.16` | Local notifications: "SOS Sent", "SOS Relayed", "Alert Failed" |
| `expo-constants` | (bundled with Expo) | `Constants.appOwnership` — detects Expo Go to skip notification import |
| `react-native` (core) | `0.81.5` | `PermissionsAndroid` for SMS permission, `Linking` for SMS fallback, `Platform` for OS checks |

**Service dependencies:** Imports `locationService`, `storageService`, `nearbyService`, and the custom `expo-sos-module`.

### Native Silent SMS (`expo-sos-module` + `sosService.ts`)

| Package / Module | Version | What it does in this feature |
|-----------------|---------|------------------------------|
| `expo-sos-module` | `file:modules/expo-sos-module` | Custom Kotlin native module — calls Android `SmsManager` API directly |
| `expo-modules-core` | (bundled with Expo) | `requireNativeModule('ExpoSosModule')` — bridges Kotlin to TypeScript |
| `expo-sms` | `^14.0.8` | iOS-only fallback: `SMS.isAvailableAsync()` + `SMS.sendSMSAsync()` (opens SMS app) |
| `react-native` (core) | `0.81.5` | `PermissionsAndroid.request(SEND_SMS)` — runtime permission dialog |
| `react-native` (core) | `0.81.5` | `Linking.openURL('sms://...')` — fallback that opens the default SMS app |

**Native dependencies (Kotlin side):**
- `android.telephony.SmsManager` — sends SMS via cellular radio
- `android.content.BroadcastReceiver` — confirms send success/failure
- `android.app.PendingIntent` — ties broadcast to specific message
- `java.util.concurrent.CountDownLatch` — blocks until radio confirms (30s timeout)

### BLE Offline Relay (`nearbyService.ts`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `expo-nearby-connections` | `^1.0.0` | Google Nearby Connections API wrapper — `startAdvertise`, `startDiscovery`, `sendText`, `onPeerFound`, `onTextReceived`, etc. |
| `@react-native-async-storage/async-storage` | `^2.2.0` | Persists bystander mode preference (`@aegis_bystander_mode`) |
| `react-native` (core) | `0.81.5` | `PermissionsAndroid.requestMultiple()` — requests BLE + location permissions at runtime |
| `react-native` (core) | `0.81.5` | `Platform.Version` — checks Android API level for permission-gating (12+ vs 13+) |

**Note:** `expo-nearby-connections` is loaded via `try/catch require()`. If the package is missing, all BLE methods return `false` and SOS falls through to Alert Mode.

### Alert Mode (`sosService.ts` + `HomeScreen.tsx`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `expo-haptics` | `~15.0.8` | `Haptics.notificationAsync(Error)` — strong haptic vibration pattern |
| `react-native` (core) | `0.81.5` | `Vibration.vibrate([0, 500, 200, 500], true)` — continuous vibration loop |
| `react-native` (core) | `0.81.5` | `Animated.Value` — red/white screen flash overlay animation |
| `expo-notifications` | `^0.32.16` | Shows "Alert Mode Activated" notification |

### Location Services (`locationService.ts`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `expo-location` | `^19.0.8` | `getCurrentPositionAsync()` — high-accuracy GPS fix for SOS payload |
| `expo-location` | `^19.0.8` | `reverseGeocodeAsync()` — converts lat/lng to street address for SMS message |
| `expo-location` | `^19.0.8` | `watchPositionAsync()` — continuous tracking during active SOS |
| `expo-location` | `^19.0.8` | `startLocationUpdatesAsync()` — background location via foreground service |
| `expo-task-manager` | `^14.0.9` | Registers background location task (`aegis-location-tracking`) |

### Storage (`storageService.ts`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `@react-native-async-storage/async-storage` | `^2.2.0` | All general data: user profile, contacts, settings, SOS history, safety reports, chat history |
| `expo-secure-store` | `^15.0.8` | Sensitive data: stealth mode PIN, API keys (encrypted storage) |

### AI Chatbot (`aiService.ts`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `@google/generative-ai` | `^0.24.1` | `GoogleGenerativeAI` — initializes Gemini client |
| `@google/generative-ai` | `^0.24.1` | `model.startChat()` + `chat.sendMessage()` — maintains conversation session |

**Env required:** `EXPO_PUBLIC_GEMINI_API_KEY`

### Community Feed (`CommunityFeedScreen.tsx`)

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `@react-native-async-storage/async-storage` | `^2.2.0` | Stores/retrieves safety reports locally (via `storageService`) |
| `expo-location` | `^19.0.8` | Gets current position to attach to reports and calculate distance |

### Navigation & UI

| Package | Version | What it does in this feature |
|---------|---------|------------------------------|
| `expo-router` | `~6.0.23` | File-based routing — `app/(tabs)/` directory defines tab screens |
| `@react-navigation/bottom-tabs` | `^7.3.10` | Bottom tab navigator (Home, Contacts, Community, Settings) |
| `react-native-screens` | `~4.10.1` | Native screen containers for navigation performance |
| `react-native-reanimated` | `~4.0.0` | Layout animations |
| `react-native-safe-area-context` | `^5.4.0` | Safe area insets for notch/status bar |
| `expo-splash-screen` | `~0.30.8` | Splash screen on app launch |
| `expo-status-bar` | `~2.2.3` | Status bar styling |

### Other Declared Dependencies (not actively used in core features)

| Package | Version | Declared for |
|---------|---------|-------------|
| `expo-camera` | `^17.0.10` | Evidence capture (UI placeholder, not wired to SOS) |
| `expo-av` | `^16.0.8` | Audio recording (voice detection, not yet implemented) |
| `expo-contacts` | `~14.0.11` | Contact import (not yet wired) |
| `expo-local-authentication` | `^17.0.8` | Biometric lock (toggle exists, auth gate not implemented) |
| `expo-crypto` | `^15.0.8` | ID generation (used for `expo-crypto` UUID, minimal usage) |

---

## Quick Reference: Feature → Package Verification

Use this table to quickly check if a branch has the right packages installed for each feature:

| Feature | Critical Packages | Check Command |
|---------|------------------|---------------|
| SOS trigger | `@react-native-community/netinfo`, `expo-notifications` | `npm ls @react-native-community/netinfo` |
| Native SMS | `expo-sos-module` (local module) | `ls modules/expo-sos-module/android/` |
| SMS fallback | `expo-sms` | `npm ls expo-sms` |
| BLE relay | `expo-nearby-connections` | `npm ls expo-nearby-connections` |
| Location | `expo-location`, `expo-task-manager` | `npm ls expo-location` |
| Storage | `@react-native-async-storage/async-storage`, `expo-secure-store` | `npm ls @react-native-async-storage/async-storage` |
| AI chatbot | `@google/generative-ai` | `npm ls @google/generative-ai` |
| Community feed | (uses storage + location, no extra packages) | — |
| Alert Mode | `expo-haptics` | `npm ls expo-haptics` |
| Navigation | `expo-router`, `@react-navigation/bottom-tabs` | `npm ls expo-router` |

---

## Configuration Reference

All constants are defined in `utils/constants.ts`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `SOS_CONFIG.COUNTDOWN_DURATION` | `5` | Seconds before SOS fires |
| `SOS_CONFIG.MAX_RETRY_ATTEMPTS` | `3` | Retry limit (defined, not yet wired) |
| `BLE_CONFIG.SERVICE_ID` | `com.aegis.sos.nearby` | Nearby Connections service ID |
| `BLE_CONFIG.ADVERTISE_NAME` | `AEGIS-SOS` | BLE advertisement display name |
| `BLE_CONFIG.TIMEOUT_MS` | `30000` | ms before Alert Mode if no relay |
| `BLE_CONFIG.PAYLOAD_DELIMITER` | `\|` | Pipe character for payload encoding |
| `LOCATION_CONFIG.TRACKING_INTERVAL` | `30000` | Background location update interval (ms) |
| `AI_CONFIG.MODEL` | `gemini-1.5-flash` | Gemini model used for chatbot |

### Feature Flags

| Flag | Default | Status |
|------|---------|--------|
| `MESH_NETWORK` | `true` | Implemented (BLE one-hop relay) |
| `AI_CHATBOT` | `true` | Implemented (Gemini integration) |
| `COMMUNITY_FEED` | `true` | Implemented (local storage) |
| `FAKE_CALL` | `true` | UI placeholder only |
| `STEALTH_MODE` | `true` | UI toggle only |
| `VOICE_DETECTION` | `true` | UI toggle only |
| `BUDDY_SYSTEM` | `true` | Not started |
| `AR_NAVIGATION` | `false` | Not started |
| `PATTERN_RECOGNITION` | `false` | Not started |

---

## Known Limitations

- **Android only** for native SMS and BLE features. iOS uses `expo-sms` which opens the SMS app instead of sending silently.
- **No Expo Go support.** Custom dev build required due to native modules (`expo-sos-module`, `expo-nearby-connections`).
- **BLE requires foreground.** No background BLE advertising or scanning.
- **Sequential SOS dispatch.** Currently sends SMS if online OR BLE if offline, not both in parallel. See Architecture Notes below.
- **No retry mechanism.** `MAX_RETRY_ATTEMPTS` is defined but not wired into the SOS flow.
- **No encryption** on BLE payloads. Location is broadcast in plaintext over Nearby Connections.
- **`expo-nearby-connections`** is a community package; device compatibility varies.

---

## Architecture Notes

The current SOS flow uses an either/or approach based on connectivity:

```typescript
const hasInternet = await this.checkInternetConnection();

if (hasInternet) {
  // Online path: send SMS only
  await this.sendSMSAlerts(contacts, location, address);
} else {
  // Offline path: BLE broadcast only
  await this.triggerBLEFallback(alert, userId);
}
```

A potential improvement is **parallel multi-channel dispatch** where SMS and BLE both fire simultaneously via `Promise.allSettled()`. This would improve reliability since:
- The connectivity check could be wrong (flaky connection)
- SMS works over cellular without internet
- BLE doesn't conflict with SMS and adds redundancy

---

## Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Build and run on Android device/emulator
npm run ios        # Build and run on iOS (limited native features)
npm run web        # Start web version (no native features)
npm run lint       # Run ESLint
```
