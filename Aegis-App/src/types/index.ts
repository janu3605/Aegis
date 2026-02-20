export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship?: string;
}

export interface SOSEvent {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  contactsNotified: string[];
  message?: string;
}

export interface AppSettings {
  stealthModeEnabled: boolean;
  stealthPinCode: string;
  nightModeEnabled: boolean;
  autoSOSEnabled: boolean;
  emergencyContacts: EmergencyContact[];
}

export interface FakeCallEvent {
  id: string;
  timestamp: number;
  callerName: string;
  duration?: number;
}
