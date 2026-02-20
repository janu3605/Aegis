# 🛡️ Aegis — Women Safety App

> *"We're not just an SOS button — we're a complete safety ecosystem that works even without internet, even when the phone appears to be off, and even when the user can't speak."*

Aegis is an AI-powered, offline-first women safety application designed to provide comprehensive, **proactive** personal security — not just reactive alerts. Built for real-world scenarios including domestic violence, street harassment, and emergencies in low-connectivity areas.

---

## 🔑 Key Differentiators

| Pillar | What it means |
|---|---|
| **Offline-first** | Mesh-network SOS via Bluetooth — works with zero internet |
| **Proactive** | Behavioral pattern recognition detects danger *before* it escalates |
| **Discreet** | Stealth mode & fake calls — designed for domestic violence survivors |
| **Community-powered** | Crowd-sourced reports + AI = smarter, real-time safety intelligence |

---

## ✨ Features

### 🥇 High-Impact Features

#### 🤫 Fake Call / Distraction Mode
Instantly simulate a realistic incoming phone call to safely exit a threatening situation. Schedule a fake call on a timer for planned scenarios — no backend required.

#### 🧠 AI-Powered Distress Detection
Passive on-device microphone monitoring recognizes distress keywords (*"help"*, *"stop"*, *"leave me alone"*) and silently triggers an SOS — even when the screen is off or the phone is in a pocket.

#### 📡 Offline Mesh Network SOS
Broadcasts an encrypted SOS over **Bluetooth Low Energy (BLE)** to nearby devices running the app. Messages hop between phones until they reach one with an internet connection — critical for rural and no-signal areas.

#### 🎭 Stealth / Disguise Mode
The app masquerades as a calculator or notes app. A secret keypad combination reveals the real interface, while emergency SOS continues to operate silently in the background.

#### 🗣️ AI Safety Companion Chatbot
An AI chatbot (Gemini / OpenAI) that guides users through safety steps in real time, offers legal advice, self-defense tips, and mental health support. Automatically escalates to the SOS flow when urgency is detected.

---

### 🥈 Strong Supporting Features

#### 👁️ AR Safe Navigation Overlay
Point your camera at any street and see a color-coded safety heatmap (🟢 Green / 🟡 Yellow / 🔴 Red) powered by crowd-sourced report data.

#### 🤝 Buddy System / Live Location Sharing
Share your live location with a trusted contact for a set duration. Auto-alerts fire if you stop moving unexpectedly — one tap to confirm "I'm Safe."

#### 📸 Silent Evidence Collection
On SOS trigger, the camera silently records, encrypts, and uploads time-stamped, GPS-tagged evidence to the cloud. A link is included in the emergency SMS.

#### 🧬 Behavioral Pattern Recognition
Learns your daily routine via battery-efficient geofencing. If a significant deviation is detected, the app asks "Are you okay?" — no response in 2 minutes triggers an alert to contacts.

#### 🌐 Community Safety Network
A real-time feed of crowd-sourced safety events in your area with upvote/downvote verification, trending unsafe zones, and filters by distance, time, and severity.

---

### 🥉 Quick-Win Features

| Feature | Description |
|---|---|
| **Safe Word to Contacts** | Text a secret word → contact instantly sees your location |
| **Walk Me Home Timer** | Countdown timer with auto-SOS if not cancelled |
| **Panic PIN** | Wrong PIN on login silently wipes sensitive data & alerts contacts |
| **Night Mode Auto-Enable** | Enhanced monitoring activates automatically 10 PM – 5 AM |
| **Safety Score Notifications** | Daily push: *"Your area safety score is 65/100 — stay alert tonight"* |
| **Government Scheme Finder** | Surface relevant government women safety schemes by state |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | React Native + Expo |
| **Language** | TypeScript |
| **AI / ML** | On-device threat detection, Gemini / OpenAI API, speech recognition |
| **Networking** | BLE mesh network (`react-native-ble-plx`), Firebase Realtime DB |
| **Location** | `expo-location` (background tracking + geofencing) |
| **Media** | `expo-camera`, `expo-av`, Firebase Storage |
| **Background** | `expo-task-manager`, `expo-background-fetch` |
| **Auth** | `expo-local-authentication` |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android / iOS device or emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/Aegis.git
cd Aegis

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS) or press `a` / `i` to launch on an emulator.

---

## 📁 Project Structure

```
Aegis/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # App screens (Home, SOS, Feed, Chatbot, etc.)
│   ├── services/       # Core services (BLE, location, AI, evidence)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Helpers and constants
│   └── assets/         # Images, audio, and fonts
├── app.json            # Expo configuration
├── package.json
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss proposed changes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- Built with ❤️ for women's safety
- Powered by [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
- AI capabilities via [Google Gemini](https://deepmind.google/technologies/gemini/) & [OpenAI](https://openai.com/)

---

<p align="center">
  <b>Aegis</b> — Because safety should be smart, silent, and always on.
</p>
