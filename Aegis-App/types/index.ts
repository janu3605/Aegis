// Core types for Aegis Safety App

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship?: string;
  isPrimary: boolean;
  createdAt: Date;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  timestamp: number;
}

export interface SOSAlert {
  id: string;
  userId: string;
  location: Location;
  timestamp: Date;
  status: 'active' | 'resolved' | 'cancelled';
  type: 'manual' | 'auto' | 'voice-triggered' | 'pattern-detected';
  evidenceUrls?: string[];
  contacts: string[]; // Contact IDs that were notified
}

export interface UserProfile {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  emergencyContacts?: EmergencyContact[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface SafetyReport {
  id: string;
  location: Location;
  description: string;
  severity: 'low' | 'medium' | 'high';
  type: 'harassment' | 'assault' | 'suspicious' | 'safe_zone' | 'other';
  reportedBy: string;
  timestamp: Date;
  upvotes: number;
  downvotes: number;
  verified?: boolean;
}

export interface BuddySession {
  id: string;
  userId: string;
  buddyId: string;
  buddyName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  status: 'active' | 'completed' | 'alert-triggered';
  checkInInterval?: number; // in minutes
  route?: Location[];
}

export interface DeviceSettings {
  stealthMode?: boolean;
  stealthModeEnabled?: boolean;
  stealthModePin?: string;
  nightModeSchedule?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  nightModeEnabled?: boolean;
  nightModeStartTime?: string; // HH:mm format
  nightModeEndTime?: string;
  backgroundMonitoringEnabled?: boolean;
  voiceDetectionEnabled?: boolean;
  autoRecordEnabled?: boolean;
  fakeChatEnabled?: boolean;
  biometricAuthEnabled?: boolean;
  biometricLockEnabled?: boolean;
  locationSharingEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export interface Evidence {
  id: string;
  alertId: string;
  type: 'photo' | 'video' | 'audio';
  url: string;
  localPath?: string;
  uploadedAt?: Date;
  location: Location;
  timestamp: Date;
  encrypted: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface GeofenceRegion {
  id: string;
  name: string;
  location: Location;
  radius: number; // in meters
  type: 'home' | 'work' | 'custom';
  notifications: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined;
  'sos': undefined;
  'emergency-contacts': undefined;
  'buddy-system': undefined;
  'community-feed': undefined;
  'ai-chat': undefined;
  'fake-call': undefined;
  'settings': undefined;
  'evidence-viewer': { alertId: string };
  'safe-routes': undefined;
};

// BLE Offline SOS types
export interface BLESOSPayload {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export type BLEMode = 'victim' | 'bystander' | 'idle';

export interface BLERelayRecord {
  id: string;
  payload: BLESOSPayload;
  relayedBy: string;
  relayedAt: number;
  delivered: boolean;
}
