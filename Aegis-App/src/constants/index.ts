export const APP_NAME = 'Aegis';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  primary: '#E91E63',
  secondary: '#9C27B0',
  danger: '#F44336',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
  light: '#F5F5F5',
  dark: '#212121',
  white: '#FFFFFF',
  gray: '#757575',
};

export const STEALTH_MODE_PIN = '1230'; // Default stealth mode PIN (should be changed by user)

export const DISTRESS_KEYWORDS = [
  'help',
  'stop',
  'leave me alone',
  'get away',
  'go away',
  'no',
  'don\'t',
  'please stop',
];

export const FAKE_CALL_DEFAULTS = {
  callerNames: [
    'Mom',
    'Dad',
    'Best Friend',
    'Boss',
    'Emergency Services',
  ],
  duration: 30, // seconds
};

export const STORAGE_KEYS = {
  EMERGENCY_CONTACTS: 'emergency_contacts',
  APP_SETTINGS: 'app_settings',
  SOS_HISTORY: 'sos_history',
  FAKE_CALL_HISTORY: 'fake_call_history',
  STEALTH_PIN: 'stealth_pin',
  USER_LOCATION: 'user_location',
};

export const NAV_SCREENS = {
  HOME: 'Home',
  FAKE_CALL: 'FakeCall',
  SOS: 'SOS',
  CONTACTS: 'Contacts',
  STEALTH: 'Stealth',
  SETTINGS: 'Settings',
  CALCULATOR: 'Calculator', // Stealth mode disguise
};
