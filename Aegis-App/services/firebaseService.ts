// Firebase Service - Handles real-time database operations

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  Database,
} from 'firebase/database';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import type { SafetyReport, BuddySession } from '../types';

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-auth-domain',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || 'your-database-url',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-storage-bucket',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

export class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | null = null;
  private database: Database | null = null;
  private storage: FirebaseStorage | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  /**
   * Check if Firebase config is valid
   */
  private isConfigValid(): boolean {
    return (
      firebaseConfig.apiKey !== 'your-api-key' &&
      firebaseConfig.databaseURL !== 'your-database-url' &&
      !firebaseConfig.databaseURL.includes('YOUR')
    );
  }

  /**
   * Initialize Firebase
   */
  private initialize() {
    try {
      // Only initialize if config is valid
      if (!this.isConfigValid()) {
        console.warn('Firebase not configured. Using offline mode. Add your Firebase config to enable real-time features.');
        return;
      }

      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        this.database = getDatabase(this.app);
        this.storage = getStorage(this.app);
        console.log('Firebase initialized successfully');
      } else {
        this.app = getApps()[0];
        this.database = getDatabase(this.app);
        this.storage = getStorage(this.app);
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      console.warn('Firebase initialization failed. Running in offline mode.');
    }
  }

  /**
   * Submit safety report to community feed
   */
  async submitSafetyReport(report: Omit<SafetyReport, 'id'>): Promise<string | null> {
    try {
      if (!this.database) {
        console.warn('Firebase database not available. Report not submitted.');
        return null;
      }

      const reportsRef = ref(this.database, 'safety_reports');
      const newReportRef = push(reportsRef);
      
      const reportWithId = {
        ...report,
        id: newReportRef.key,
      };

      await set(newReportRef, reportWithId);
      return newReportRef.key;
    } catch (error) {
      console.error('Error submitting safety report:', error);
      return null;
    }
  }

  /**
   * Get safety reports near location
   */
  async getSafetyReports(limit: number = 50): Promise<SafetyReport[]> {
    try {
      if (!this.database) {
        console.warn('Firebase database not available. Returning empty reports.');
        return [];
      }

      const reportsRef = ref(this.database, 'safety_reports');
      const reportsQuery = query(
        reportsRef,
        orderByChild('timestamp'),
        limitToLast(limit)
      );

      const snapshot = await get(reportsQuery);
      
      if (!snapshot.exists()) {
        return [];
      }

      const reports: SafetyReport[] = [];
      snapshot.forEach((child) => {
        reports.push(child.val());
      });

      return reports.reverse(); // Most recent first
    } catch (error) {
      console.error('Error getting safety reports:', error);
      return [];
    }
  }

  /**
   * Listen to real-time safety reports
   */
  listenToSafetyReports(callback: (reports: SafetyReport[]) => void): () => void {
    if (!this.database) {
      console.warn('Firebase database not available. Real-time updates disabled.');
      return () => {};
    }
    if (!this.database) {
      console.error('Database not initialized');
      return () => {};
    }

    const reportsRef = ref(this.database, 'safety_reports');
    const reportsQuery = query(reportsRef, orderByChild('timestamp'), limitToLast(50));

    const listener = onValue(reportsQuery, (snapshot) => {
      const reports: SafetyReport[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          reports.push(child.val());
        });
      }

      callback(reports.reverse());
    });

    // Return unsubscribe function
    return () => off(reportsRef);
  }

  /**
   * Start buddy session
   */
  async startBuddySession(session: Omit<BuddySession, 'id'>): Promise<string | null> {
    try {
      if (!this.database) {
        console.warn('Firebase database not available. Buddy session not started.');
        return null;
      }

      const sessionsRef = ref(this.database, 'buddy_sessions');
      const newSessionRef = push(sessionsRef);
      
      const sessionWithId = {
        ...session,
        id: newSessionRef.key,
      };

      await set(newSessionRef, sessionWithId);
      return newSessionRef.key;
    } catch (error) {
      console.error('Error starting buddy session:', error);
      return null;
    }
  }

  /**
   * Update buddy session
   */
  async updateBuddySession(sessionId: string, updates: Partial<BuddySession>): Promise<boolean> {
    try {
      if (!this.database) {
        console.warn('Firebase database not available. Buddy session not updated.');
        return false;
      }

      const sessionRef = ref(this.database, `buddy_sessions/${sessionId}`);
      await set(sessionRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating buddy session:', error);
      return false;
    }
  }

  /**
   * Listen to buddy session updates
   */
  listenToBuddySession(sessionId: string, callback: (session: BuddySession | null) => void): () => void {
    if (!this.database) {
      console.warn('Firebase database not available. Buddy session listener disabled.');
      return () => {};
    }

    const sessionRef = ref(this.database, `buddy_sessions/${sessionId}`);

    const listener = onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(sessionRef);
  }

  /**
   * Upload evidence file
   */
  async uploadEvidence(
    file: Blob,
    alertId: string,
    type: 'photo' | 'video' | 'audio'
  ): Promise<string | null> {
    try {
      if (!this.storage) {
        console.warn('Firebase storage not available. Evidence not uploaded.');
        return null;
      }

      const fileName = `${alertId}_${Date.now()}.${type === 'photo' ? 'jpg' : type === 'video' ? 'mp4' : 'mp3'}`;
      const fileRef = storageRef(this.storage, `evidence/${alertId}/${fileName}`);

      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      return downloadUrl;
    } catch (error) {
      console.error('Error uploading evidence:', error);
      return null;
    }
  }

  /**
   * Update user location in real-time (for buddy system)
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    try {
      if (!this.database) {
        console.warn('Firebase database not available. Location not updated.');
        return false;
      }

      const locationRef = ref(this.database, `user_locations/${userId}`);
      await set(locationRef, {
        latitude,
        longitude,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error('Error updating user location:', error);
      return false;
    }
  }

  /**
   * Listen to user location updates
   */
  listenToUserLocation(
    userId: string,
    callback: (location: { latitude: number; longitude: number; timestamp: number } | null) => void
  ): () => void {
    if (!this.database) {
      console.warn('Firebase database not available. Location listener disabled.');
      return () => {};
    }

    const locationRef = ref(this.database, `user_locations/${userId}`);

    const listener = onValue(locationRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(locationRef);
  }
}

export default FirebaseService.getInstance();
