// Location Safety Check Screen - Check safety score for any location

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import LocationService from '@/services/locationService';
import { Colors } from '@/utils/constants';
import type { Location as LocationType, SafetyZone } from '@/types';

export default function LocationSafetyCheckScreen() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [safetyZone, setSafetyZone] = useState<SafetyZone | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCheckSafety = async () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Input', 'Please enter valid latitude and longitude coordinates.');
      return;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90.');
      return;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180.');
      return;
    }

    setIsLoading(true);
    try {
      const zoneInfo = await LocationService.getSafetyZoneInfo(lat, lng, 500);
      setSafetyZone(zoneInfo);
    } catch (error) {
      console.error('Error checking location safety:', error);
      Alert.alert('Error', 'Failed to check location safety. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setLatitude(location.latitude.toString());
        setLongitude(location.longitude.toString());
        const zoneInfo = await LocationService.getSafetyZoneInfo(location.latitude, location.longitude, 500);
        setSafetyZone(zoneInfo);
      } else {
        Alert.alert('Location Error', 'Unable to get current location. Please check location permissions.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportForLocation = () => {
    // Navigate to community feed with pre-filled location
    router.push({
      pathname: '/(tabs)/community' as any,
      params: {
        prefillLat: latitude,
        prefillLng: longitude,
        locationName: 'Selected Location'
      }
    });
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a location name or address to search.');
      return;
    }

    // Placeholder implementation: notify user this feature is coming soon
    // Future: integrate geocoding (Google Maps / Mapbox) to convert address -> coordinates
    setIsLoading(true);
    try {
      console.log('Search requested for:', searchQuery);
      const found = await LocationService.geocodeAddress(searchQuery);
      if (!found) {
        Alert.alert('Not found', 'Could not find coordinates for that address. Try a different query.');
      } else {
        setLatitude(found.latitude.toString());
        setLongitude(found.longitude.toString());
        const zoneInfo = await LocationService.getSafetyZoneInfo(found.latitude, found.longitude, 500);
        setSafetyZone(zoneInfo);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setIsLoading(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'safe':
        return '#4CAF50'; // Green
      case 'caution':
        return '#FF9800'; // Orange
      case 'unsafe':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'safe':
        return '✅';
      case 'caution':
        return '⚠️';
      case 'unsafe':
        return '🚨';
      default:
        return '❓';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Location Safety Check</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Location</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter address or location name"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchLocation}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchLocation}
        >
          <Text style={styles.searchButtonText}>🔍 Search</Text>
        </TouchableOpacity>
      </View>

      {/* Coordinate Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter Coordinates</Text>

        <View style={styles.coordinateContainer}>
          <View style={styles.coordinateInput}>
            <Text style={styles.coordinateLabel}>Latitude</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 28.6139"
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.coordinateInput}>
            <Text style={styles.coordinateLabel}>Longitude</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 77.2090"
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.currentLocationButton]}
            onPress={handleUseCurrentLocation}
            disabled={isLoading}
          >
            <Text style={styles.currentLocationButtonText}>📍 Use Current Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.checkButton]}
            onPress={handleCheckSafety}
            disabled={isLoading || !latitude || !longitude}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.checkButtonText}>Check Safety</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety Results */}
      {safetyZone && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Analysis</Text>

          <View style={styles.resultCard}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{safetyZone.safetyScore}</Text>
              <Text style={styles.scoreLabel}>Safety Score</Text>
            </View>

            <View style={styles.classificationContainer}>
              <Text style={styles.classificationIcon}>
                {getClassificationIcon(safetyZone.classification)}
              </Text>
              <Text
                style={[
                  styles.classificationText,
                  { color: getClassificationColor(safetyZone.classification) }
                ]}
              >
                {safetyZone.classification.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Analysis Details:</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reports in area:</Text>
              <Text style={styles.detailValue}>{safetyZone.reportCount}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recent reports (24h):</Text>
              <Text style={styles.detailValue}>{safetyZone.factors.recentReports}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>High severity reports:</Text>
              <Text style={styles.detailValue}>{safetyZone.factors.highSeverityReports}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Positive reports:</Text>
              <Text style={styles.detailValue}>{safetyZone.factors.positiveReports}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time factor:</Text>
              <Text style={styles.detailValue}>
                {safetyZone.factors.timeFactor > 1 ? 'Night time (higher risk)' : 'Day time'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Analysis radius:</Text>
              <Text style={styles.detailValue}>{safetyZone.radius}m</Text>
            </View>

            <Text style={styles.lastUpdated}>
              Last updated: {safetyZone.lastUpdated.toLocaleString()}
            </Text>

            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReportForLocation}
            >
              <Text style={styles.reportButtonText}>📝 Report Incident Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          • Safety scores are calculated based on crowd-sourced reports within 500 meters{'\n'}
          • Recent reports have higher impact than older ones{'\n'}
          • Night time automatically reduces safety scores{'\n'}
          • Higher scores indicate safer areas{'\n'}
          • Scores range from 0 (very unsafe) to 100 (very safe)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSpacer: {
    width: 60,
  },
  section: {
    margin: 20,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  searchButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  coordinateContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  coordinateInput: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentLocationButton: {
    backgroundColor: Colors.secondary,
  },
  currentLocationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  checkButton: {
    backgroundColor: Colors.primary,
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  scoreLabel: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 5,
  },
  classificationContainer: {
    alignItems: 'center',
  },
  classificationIcon: {
    fontSize: 32,
    marginBottom: 5,
  },
  classificationText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'right',
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.secondary,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  reportButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
});