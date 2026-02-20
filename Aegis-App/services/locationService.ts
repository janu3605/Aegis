// Location Service - Handles GPS tracking and geofencing

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_CONFIG } from '../utils/constants';
import type { Location as LocationType, SafetyZone } from '../types';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationType | null = null;
  private watchId: any = null;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return backgroundStatus === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationType | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        timestamp: location.timestamp,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching location changes
   */
  async startWatching(callback: (location: LocationType) => void): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return false;
      }

      this.watchId = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_CONFIG.TIME_INTERVAL,
          distanceInterval: LOCATION_CONFIG.DISTANCE_FILTER,
        },
        (location) => {
          const locationData: LocationType = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            timestamp: location.timestamp,
          };
          
          this.currentLocation = locationData;
          callback(locationData);
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return false;
    }
  }

  /**
   * Stop watching location changes
   */
  stopWatching(): void {
    if (this.watchId) {
      this.watchId.remove();
      this.watchId = null;
    }
  }

  /**
   * Start background location tracking
   */
  async startBackgroundTracking(): Promise<boolean> {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      
      if (status !== 'granted') {
        return false;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_CONFIG.TRACKING_INTERVAL,
        distanceInterval: LOCATION_CONFIG.DISTANCE_FILTER,
        foregroundService: {
          notificationTitle: 'Aegis is protecting you',
          notificationBody: 'Location tracking is active',
          notificationColor: '#E63946',
        },
        pausesUpdatesAutomatically: false,
      });

      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Get formatted address from coordinates (reverse geocoding)
   */
  async getAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        return `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''} ${addr.postalCode || ''}`.trim();
      }

      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Geocode an address/string to coordinates (forward geocoding)
   */
  async geocodeAddress(address: string): Promise<LocationType | null> {
    try {
      if (!address || !address.trim()) return null;

      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        const r = results[0];
        return {
          latitude: r.latitude,
          longitude: r.longitude,
          accuracy: undefined,
          altitude: undefined,
          timestamp: Date.now(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  /**
   * Get Google Maps URL for coordinates
   */
  getGoogleMapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  }

  /**
   * Get last known location
   */
  getLastLocation(): LocationType | null {
    return this.currentLocation;
  }

  /**
   * Calculate safety score for a location based on nearby reports and heuristics
   */
  async calculateSafetyScore(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<number> {
    try {
      // Import FirebaseService here to avoid circular dependencies
      const FirebaseService = (await import('./firebaseService')).default;
      
      const reports = await FirebaseService.getSafetyReports(100); // Get recent reports
      
      let totalScore = 100; // Start with perfect score
      let reportCount = 0;
      let highSeverityCount = 0;
      let positiveReports = 0;
      
      const now = new Date();
      
      // Process actual safety reports
      for (const report of reports) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          report.location.latitude,
          report.location.longitude
        );
        
        if (distance <= radiusMeters) {
          reportCount++;
          
          // Calculate time decay (reports lose impact over time)
          const hoursSinceReport = (now.getTime() - new Date(report.timestamp).getTime()) / (1000 * 60 * 60);
          const timeDecay = Math.max(0.1, Math.exp(-hoursSinceReport / 24)); // Half-life of 24 hours
          
          // Calculate distance weight (closer reports have more impact)
          const distanceWeight = Math.max(0.1, 1 - (distance / radiusMeters));
          
          let severityWeight = 0;
          switch (report.severity) {
            case 'high':
              severityWeight = 20;
              highSeverityCount++;
              break;
            case 'medium':
              severityWeight = 10;
              break;
            case 'low':
              severityWeight = 5;
              break;
          }
          
          // Positive reports (safe zones) reduce the penalty
          if (report.type === 'safe_zone') {
            positiveReports++;
            totalScore += severityWeight * timeDecay * distanceWeight * 0.5; // Positive impact
          } else {
            totalScore -= severityWeight * timeDecay * distanceWeight;
          }
        }
      }
      
      // Apply heuristic-based safety scoring when no reports exist
      if (reportCount === 0) {
        totalScore = await this.calculateHeuristicSafetyScore(latitude, longitude);
        console.log(`Using heuristic score: ${totalScore} for location ${latitude}, ${longitude}`);
      } else {
        console.log(`Using report-based score: ${totalScore} with ${reportCount} reports`);
      }
      
      // Apply time-based factor (night time increases perceived risk)
      const currentHour = now.getHours();
      const isNightTime = currentHour >= 22 || currentHour <= 5;
      if (isNightTime) {
        totalScore = Math.max(0, totalScore - 15); // Reduce score at night
        console.log(`Applied night time penalty: -15, new score: ${totalScore}`);
      }

      // Ensure score stays within 0-100 range
      totalScore = Math.max(0, Math.min(100, totalScore));

      console.log(`Final safety score for ${latitude}, ${longitude}: ${totalScore}`);
      return Math.round(totalScore);
    } catch (error) {
      console.error('Error calculating safety score:', error);
      return 50; // Default neutral score on error
    }
  }

  /**
   * Calculate heuristic-based safety score when no incident data is available
   */
  private async calculateHeuristicSafetyScore(latitude: number, longitude: number): Promise<number> {
    // First check if this is a known location with predetermined safety data
    const knownLocationScore = this.getKnownLocationSafetyScore(latitude, longitude);
    if (knownLocationScore !== null) {
      console.log(`Using known location score: ${knownLocationScore}`);
      return knownLocationScore;
    }

    // Fall back to general heuristic calculation
    let score = 75; // Start with moderately safe score

    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Time-based factors
    if (currentHour >= 22 || currentHour <= 5) {
      score -= 20; // Late night/early morning
    } else if (currentHour >= 18 || currentHour <= 8) {
      score -= 10; // Evening/morning
    }

    // Day of week factors
    if (currentDay === 5 || currentDay === 6) {
      score -= 5; // Weekend slightly less safe
    }

    // Location-based heuristics using coordinates
    try {
      const address = await this.getAddressFromCoordinates(latitude, longitude);
      if (address) {
        const addressLower = address.toLowerCase();

        // Commercial areas might be safer during business hours
        if (addressLower.includes('mall') || addressLower.includes('market') || addressLower.includes('commercial')) {
          if (currentHour >= 9 && currentHour <= 21) {
            score += 10; // Safer during business hours
          } else {
            score -= 10; // Less safe outside business hours
          }
        }

        // Residential areas generally safer
        if (addressLower.includes('residential') || addressLower.includes('apartment') || addressLower.includes('home')) {
          score += 5;
        }

        // Busy urban areas might have more activity
        if (addressLower.includes('downtown') || addressLower.includes('city center') || addressLower.includes('cbd')) {
          score -= 5; // Slightly less safe in very busy areas
        }
      }
    } catch (error) {
      // Ignore geocoding errors, use default score
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get predetermined safety score for known Indian locations
   */
  private getKnownLocationSafetyScore(latitude: number, longitude: number): number | null {
    const knownLocations = [
      // Major Cities - Generally Safe (70-85)
      { name: 'Delhi Connaught Place', lat: 28.6304, lng: 77.2177, score: 75, notes: 'Busy commercial area, generally safe during day' },
      { name: 'Mumbai Bandra', lat: 19.0547, lng: 72.8402, score: 80, notes: 'Residential area, good community' },
      { name: 'Bangalore Koramangala', lat: 12.9352, lng: 77.6245, score: 82, notes: 'IT hub, well-lit and secure' },
      { name: 'Chennai T. Nagar', lat: 13.0418, lng: 80.2341, score: 78, notes: 'Commercial area with good security' },
      { name: 'Kolkata Park Street', lat: 22.5550, lng: 88.3517, score: 70, notes: 'Touristy area, moderate safety' },
      { name: 'Hyderabad Banjara Hills', lat: 17.4156, lng: 78.4349, score: 85, notes: 'Upscale residential, very safe' },
      { name: 'Pune Koregaon Park', lat: 18.5362, lng: 73.8940, score: 83, notes: 'Affluent area, excellent safety' },
      { name: 'Ahmedabad CG Road', lat: 23.0225, lng: 72.5714, score: 76, notes: 'Commercial hub, good security' },

      // Tourist Destinations - Mixed Safety (60-75)
      { name: 'Jaipur Pink City', lat: 26.9124, lng: 75.7873, score: 65, notes: 'Touristy, some petty crime' },
      { name: 'Goa Calangute Beach', lat: 15.5439, lng: 73.7553, score: 60, notes: 'Tourist area, higher risk at night' },
      { name: 'Agra Taj Mahal', lat: 27.1751, lng: 78.0421, score: 72, notes: 'Iconic site, generally safe but crowded' },
      { name: 'Varanasi Ghats', lat: 25.3176, lng: 83.0104, score: 68, notes: 'Spiritual site, some safety concerns' },

      // Areas with Safety Concerns (45-60)
      { name: 'Delhi Red Fort Area', lat: 28.6562, lng: 77.2410, score: 55, notes: 'Historic area, some safety issues' },
      { name: 'Mumbai Dharavi', lat: 19.0388, lng: 72.8537, score: 45, notes: 'Slum area, higher risk' },
      { name: 'Kolkata Sonagachi', lat: 22.5833, lng: 88.3578, score: 50, notes: 'Red light area, unsafe' },
      { name: 'Patna Main City', lat: 25.5941, lng: 85.1376, score: 52, notes: 'Some law and order issues' },

      // Safe Residential Areas (85-95)
      { name: 'Gurgaon DLF Phase 1', lat: 28.4724, lng: 77.1036, score: 90, notes: 'Gated community, very safe' },
      { name: 'Noida Sector 62', lat: 28.5747, lng: 77.3537, score: 88, notes: 'Planned city, excellent security' },
      { name: 'Chandigarh Sector 17', lat: 30.7415, lng: 76.7794, score: 92, notes: 'Clean city, very safe' },
      { name: 'Panchkula', lat: 30.6942, lng: 76.8606, score: 89, notes: 'Peaceful area, good safety' },

      // Rural/Smaller Towns (70-85)
      { name: 'Rishikesh', lat: 30.0869, lng: 78.2676, score: 78, notes: 'Spiritual town, generally safe' },
      { name: 'Shimla Mall Road', lat: 31.1048, lng: 77.1734, score: 82, notes: 'Hill station, tourist-friendly' },
    ];

    // Find the closest known location within 5km
    let closestLocation = null;
    let minDistance = 5000; // 5km radius

    for (const location of knownLocations) {
      const distance = this.calculateDistance(latitude, longitude, location.lat, location.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    if (closestLocation) {
      console.log(`Found known location: ${closestLocation.name} (${minDistance.toFixed(1)}km away)`);
      return closestLocation.score;
    }

    return null; // No known location found
  }

  /**
   * Classify a location as safe, caution, or unsafe
   */
  async classifyLocation(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<'safe' | 'caution' | 'unsafe'> {
    const score = await this.calculateSafetyScore(latitude, longitude, radiusMeters);
    
    if (score >= 70) return 'safe';
    if (score >= 40) return 'caution';
    return 'unsafe';
  }

  /**
   * Get detailed safety zone information
   */
  async getSafetyZoneInfo(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500
  ): Promise<SafetyZone> {
    try {
      const FirebaseService = (await import('./firebaseService')).default;
      const reports = await FirebaseService.getSafetyReports(100);
      
      let reportCount = 0;
      let highSeverityCount = 0;
      let positiveReports = 0;
      let recentReports = 0;
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      for (const report of reports) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          report.location.latitude,
          report.location.longitude
        );
        
        if (distance <= radiusMeters) {
          reportCount++;
          
          if (report.severity === 'high') highSeverityCount++;
          if (report.type === 'safe_zone') positiveReports++;
          
          const reportTime = new Date(report.timestamp);
          if (reportTime > oneDayAgo) recentReports++;
        }
      }
      
      const safetyScore = await this.calculateSafetyScore(latitude, longitude, radiusMeters);
      const classification = safetyScore >= 70 ? 'safe' : safetyScore >= 40 ? 'caution' : 'unsafe';
      
      const currentHour = now.getHours();
      const timeFactor = (currentHour >= 22 || currentHour <= 5) ? 1.2 : 1.0;
      
      return {
        location: {
          latitude,
          longitude,
          timestamp: Date.now(),
        },
        radius: radiusMeters,
        safetyScore,
        classification,
        reportCount,
        lastUpdated: now,
        factors: {
          recentReports,
          highSeverityReports: highSeverityCount,
          positiveReports,
          timeFactor,
        },
      };
    } catch (error) {
      console.error('Error getting safety zone info:', error);
      // Return default safe zone on error
      return {
        location: { latitude, longitude, timestamp: Date.now() },
        radius: radiusMeters,
        safetyScore: 50,
        classification: 'caution',
        reportCount: 0,
        lastUpdated: new Date(),
        factors: {
          recentReports: 0,
          highSeverityReports: 0,
          positiveReports: 0,
          timeFactor: 1.0,
        },
      };
    }
  }
}

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      // Store location or send to backend
      console.log('Background location update:', location);
      
      // Here you can:
      // 1. Save to AsyncStorage
      // 2. Check for pattern anomalies
      // 3. Update buddy system
      // 4. Send to Firebase for real-time tracking
    }
  }
});

export default LocationService.getInstance();
