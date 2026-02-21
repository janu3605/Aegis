// Firebase Service - Offline stub (Firebase removed)
// Returns mock data for all operations. Replace with a custom backend when ready.

import type { SafetyReport, BuddySession, BLESOSPayload, BLERelayRecord } from '../types';

export class FirebaseService {
  private static instance: FirebaseService;

  private constructor() {
    console.log('FirebaseService running in offline mode (Firebase removed).');
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // ═══════════════════════════════════════════
  // SAFETY REPORTS
  // ═══════════════════════════════════════════

  async submitSafetyReport(_report: Omit<SafetyReport, 'id'>): Promise<string | null> {
    console.warn('FirebaseService offline: report not submitted.');
    return null;
  }

  async getSafetyReports(_limit: number = 50): Promise<SafetyReport[]> {
    return this.getMockSafetyReports();
  }

  private getMockSafetyReports(): SafetyReport[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return [
      {
        id: 'mock-1',
        location: { latitude: 28.6139, longitude: 77.2090, timestamp: oneHourAgo.getTime() },
        description: 'Suspicious person following women',
        severity: 'medium',
        type: 'suspicious',
        reportedBy: 'user1',
        timestamp: oneHourAgo,
        upvotes: 3,
        downvotes: 0,
        verified: true,
      },
      {
        id: 'mock-2',
        location: { latitude: 28.7041, longitude: 77.1025, timestamp: twoHoursAgo.getTime() },
        description: 'Harassment incident reported',
        severity: 'high',
        type: 'harassment',
        reportedBy: 'user2',
        timestamp: twoHoursAgo,
        upvotes: 5,
        downvotes: 1,
        verified: true,
      },
      {
        id: 'mock-3',
        location: { latitude: 28.6139, longitude: 77.2090, timestamp: yesterday.getTime() },
        description: 'Safe zone - well lit area with security',
        severity: 'low',
        type: 'safe_zone',
        reportedBy: 'user3',
        timestamp: yesterday,
        upvotes: 8,
        downvotes: 0,
        verified: true,
      },
      {
        id: 'mock-4',
        location: { latitude: 19.0760, longitude: 72.8777, timestamp: oneHourAgo.getTime() },
        description: 'Assault reported',
        severity: 'high',
        type: 'assault',
        reportedBy: 'user4',
        timestamp: oneHourAgo,
        upvotes: 12,
        downvotes: 2,
        verified: true,
      },
    ];
  }

  listenToSafetyReports(_callback: (reports: SafetyReport[]) => void): () => void {
    return () => { };
  }

  // ═══════════════════════════════════════════
  // BUDDY SESSIONS
  // ═══════════════════════════════════════════

  async startBuddySession(_session: Omit<BuddySession, 'id'>): Promise<string | null> {
    console.warn('FirebaseService offline: buddy session not started.');
    return null;
  }

  async updateBuddySession(_sessionId: string, _updates: Partial<BuddySession>): Promise<boolean> {
    console.warn('FirebaseService offline: buddy session not updated.');
    return false;
  }

  listenToBuddySession(_sessionId: string, _callback: (session: BuddySession | null) => void): () => void {
    return () => { };
  }

  // ═══════════════════════════════════════════
  // EVIDENCE UPLOAD
  // ═══════════════════════════════════════════

  async uploadEvidence(
    _file: Blob,
    _alertId: string,
    _type: 'photo' | 'video' | 'audio'
  ): Promise<string | null> {
    console.warn('FirebaseService offline: evidence not uploaded.');
    return null;
  }

  // ═══════════════════════════════════════════
  // USER LOCATION
  // ═══════════════════════════════════════════

  async updateUserLocation(
    _userId: string,
    _latitude: number,
    _longitude: number
  ): Promise<boolean> {
    return false;
  }

  listenToUserLocation(
    _userId: string,
    _callback: (location: { latitude: number; longitude: number; timestamp: number } | null) => void
  ): () => void {
    return () => { };
  }

  // ═══════════════════════════════════════════
  // BLE SOS RELAY
  // ═══════════════════════════════════════════

  async relaySOSPayload(
    _payload: BLESOSPayload,
    _relayedBy: string = 'anonymous-bystander'
  ): Promise<string | null> {
    console.warn('FirebaseService offline: SOS relay not available.');
    return null;
  }

  listenForSOSRelays(
    _callback: (relays: BLERelayRecord[]) => void
  ): () => void {
    return () => { };
  }
}

export default FirebaseService.getInstance();
