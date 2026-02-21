// App-wide constants for Aegis Safety App

export const Colors = {
  // Primary Colors
  primary: '#E63946',        // Red - Emergency/Danger
  primaryDark: '#C1121F',
  primaryLight: '#FF6B6B',

  // Secondary Colors
  secondary: '#457B9D',      // Blue - Trust/Safety
  secondaryDark: '#1D3557',
  secondaryLight: '#A8DADC',

  // Status Colors
  success: '#06D6A0',
  warning: '#FFB703',
  danger: '#E63946',
  info: '#457B9D',

  // Safety Levels
  safetyHigh: '#06D6A0',     // Green - Safe
  safetyMedium: '#FFB703',   // Yellow - Caution
  safetyLow: '#E63946',      // Red - Unsafe

  // Neutral Colors
  background: '#F8F9FA',
  backgroundDark: '#1A1A1A',
  backgroundSecondary: '#E9ECEF',
  surface: '#FFFFFF',
  surfaceDark: '#2D2D2D',
  text: '#212529',
  textDark: '#F8F9FA',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  borderDark: '#495057',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const APP_VERSION = '1.0.0';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

// SOS Constants
export const SOS_CONFIG = {
  COUNTDOWN_DURATION: 5, // seconds before SOS is sent
  DEFAULT_MESSAGE: "EMERGENCY SOS! I need help. This is my current location:",
  AUTO_CALL_DELAY: 3000, // ms delay before auto-calling emergency contact
  LOCATION_UPDATE_INTERVAL: 10000, // Update location every 10 seconds during active SOS
  MAX_RETRY_ATTEMPTS: 3,
};

// Location Constants
export const LOCATION_CONFIG = {
  ACCURACY: 'high' as const,
  DISTANCE_FILTER: 10, // meters
  TIME_INTERVAL: 5000, // ms
  GEOFENCE_RADIUS: 100, // meters
  TRACKING_INTERVAL: 30000, // Background location update interval (30 seconds)
};

// Evidence Collection
export const EVIDENCE_CONFIG = {
  MAX_VIDEO_DURATION: 60, // seconds
  PHOTO_QUALITY: 0.8,
  VIDEO_QUALITY: 'high' as const,
  AUTO_UPLOAD: true,
  ENCRYPTION_ENABLED: true,
};

// Buddy System
export const BUDDY_CONFIG = {
  DEFAULT_DURATION: 60, // minutes
  CHECK_IN_INTERVAL: 5, // minutes
  INACTIVITY_THRESHOLD: 3, // minutes before alert
  MIN_DURATION: 15,
  MAX_DURATION: 480, // 8 hours
};

// Voice Detection
export const VOICE_CONFIG = {
  DISTRESS_KEYWORDS: [
    'help',
    'help help help',
    'stop',
    'leave me alone',
    'police',
    'emergency',
    'danger',
    'help me',
    'call police',
    'someone help',
  ],
  CONFIDENCE_THRESHOLD: 0.7,
  LISTENING_INTERVAL: 5000, // ms
};

// Fake Call
export const FAKE_CALL_CONFIG = {
  DEFAULT_CALLER_NAME: 'Mom',
  DEFAULT_CALLER_NUMBER: '+1 (555) 123-4567',
  RING_DURATION: 30000, // ms
  // Audio files will be added later
  // AUDIO_FILES: {
  //   ringtone: require('../assets/audio/ringtone.mp3'),
  // },
};

// Stealth Mode
export const STEALTH_CONFIG = {
  UNLOCK_SEQUENCE: '1738', // Default PIN to unlock from stealth mode
  DISGUISE_APPS: [
    { id: 'calculator', name: 'Calculator', icon: '🔢' },
    { id: 'notes', name: 'Notes', icon: '📝' },
    { id: 'weather', name: 'Weather', icon: '🌤️' },
  ],
  LONG_PRESS_DURATION: 1500, // ms
};

// Night Mode
export const NIGHT_MODE_CONFIG = {
  DEFAULT_START_TIME: '22:00', // 10 PM
  DEFAULT_END_TIME: '05:00', // 5 AM
  ENHANCED_MONITORING: true,
  INCREASED_LOCATION_FREQUENCY: true,
};

// Community Safety
export const COMMUNITY_CONFIG = {
  MAX_REPORT_DISTANCE: 50000, // meters (50 km)
  UPVOTE_THRESHOLD_VERIFIED: 10,
  REPORT_EXPIRY_HOURS: 48,
  MIN_SEVERITY_TO_NOTIFY: 'medium' as const,
};

// BLE Offline SOS ("Dumb Pipe")
export const BLE_CONFIG = {
  SERVICE_ID: 'com.aegis.sos.nearby',  // Nearby Connections service ID
  ADVERTISE_NAME: 'AEGIS-SOS',         // BLE advertise display name
  TIMEOUT_MS: 30000,                    // 30 seconds before Alert Mode
  PAYLOAD_DELIMITER: '|',              // userId|lat|lng|timestamp
  ALERT_MODE_FLASH_INTERVAL: 500,      // ms between red/white flashes
  ALERT_MODE_ALARM_LOOP: true,
};

// AI Chatbot
export const AI_CONFIG = {
  MODEL: 'gemini-1.5-flash',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  SYSTEM_PROMPT: `You are Aegis, an AI safety companion for women's safety. You provide:
1. Immediate safety guidance in emergencies
2. Legal advice about women's rights
3. Self-defense tips
4. Mental health support
5. De-escalation strategies

Be empathetic, concise, and action-oriented. If you detect high urgency (keywords: danger, help, scared, attacked), immediately recommend triggering the SOS alert.`,
  URGENCY_KEYWORDS: ['danger', 'scared', 'attacked', 'help', 'emergency', 'hurt', 'threatening'],
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_PROFILE: '@aegis_user_profile',
  EMERGENCY_CONTACTS: '@aegis_emergency_contacts',
  DEVICE_SETTINGS: '@aegis_device_settings',
  GEOFENCE_REGIONS: '@aegis_geofence_regions',
  SOS_HISTORY: '@aegis_sos_history',
  BEHAVIOR_PATTERNS: '@aegis_behavior_patterns',
  LAST_LOCATION: '@aegis_last_location',
  CHAT_HISTORY: '@aegis_chat_history',
  BYSTANDER_MODE: '@aegis_bystander_mode',
};

// API Endpoints (placeholder - update with your backend)
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.aegis-safety.com/v1',
  SOS_ALERT: '/sos/alert',
  COMMUNITY_REPORTS: '/community/reports',
  BUDDY_SESSION: '/buddy/session',
  EVIDENCE_UPLOAD: '/evidence/upload',
  USER_PROFILE: '/user/profile',
};

// Feature Flags
export const FEATURES = {
  FAKE_CALL: true,
  STEALTH_MODE: true,
  VOICE_DETECTION: true,
  AI_CHATBOT: true,
  BUDDY_SYSTEM: true,
  COMMUNITY_FEED: true,
  AR_NAVIGATION: false, // Coming soon
  MESH_NETWORK: true,   // BLE Offline SOS via Nearby Connections
  PATTERN_RECOGNITION: false, // Coming soon
};

// Error Messages
export const ERROR_MESSAGES = {
  LOCATION_PERMISSION: 'Location permission is required for emergency alerts',
  CAMERA_PERMISSION: 'Camera permission is required for evidence collection',
  CONTACTS_PERMISSION: 'Contacts permission is required to set up emergency contacts',
  MICROPHONE_PERMISSION: 'Microphone permission is required for voice detection',
  NO_EMERGENCY_CONTACTS: 'Please add at least one emergency contact',
  NETWORK_ERROR: 'Network error. Please check your connection',
  GENERIC_ERROR: 'Something went wrong. Please try again',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SOS_SENT: 'Emergency alerts sent successfully',
  CONTACT_ADDED: 'Emergency contact added',
  CONTACT_UPDATED: 'Emergency contact updated',
  CONTACT_DELETED: 'Emergency contact removed',
  SETTINGS_SAVED: 'Settings saved successfully',
  SETTINGS_UPDATED: 'Settings updated successfully',
  BUDDY_SESSION_STARTED: 'Buddy session started',
  REPORT_SUBMITTED: 'Safety report submitted successfully',
};
