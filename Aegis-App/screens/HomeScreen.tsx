// Home Screen - Main Dashboard with SOS button

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import SOSService from '@/services/sosService';
import LocationService from '@/services/locationService';
import StorageService from '@/services/storageService';
import { Colors, SOS_CONFIG } from '@/utils/constants';
import type { EmergencyContact, Location as LocationType } from '@/types';

export default function HomeScreen() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Check for active alert
      const activeAlert = SOSService.hasActiveAlert();
      setHasActiveAlert(activeAlert);

      // Get current location
      const loc = await LocationService.getCurrentLocation();
      setLocation(loc);

      // Calculate safety score if location available
      if (loc) {
        await calculateSafetyScore(loc);
      }

      // Get emergency contacts
      const contacts = await StorageService.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const calculateSafetyScore = async (loc: LocationType) => {
    try {
      setIsCalculatingScore(true);
      const score = await LocationService.calculateSafetyScore(
        loc.latitude,
        loc.longitude,
        500 // 500 meter radius
      );
      setSafetyScore(score);
    } catch (error) {
      console.error('Error calculating safety score:', error);
      setSafetyScore(null);
    } finally {
      setIsCalculatingScore(false);
    }
  };

  const handleSOSPress = async () => {
    // Check if emergency contacts are configured
    if (emergencyContacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add emergency contacts before using SOS.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Contacts', onPress: () => router.push('/(tabs)/contacts' as any) },
        ]
      );
      return;
    }

    // Start countdown
    setIsLoading(true);
    
    await SOSService.triggerSOSWithCountdown(
      (seconds) => {
        setCountdown(seconds);
      },
      async () => {
        setCountdown(null);
        setIsLoading(false);
        setHasActiveAlert(true);
        
        Alert.alert(
          '🚨 SOS Alert Sent',
          `Emergency alerts sent to ${emergencyContacts.length} contact(s)`,
          [{ text: 'OK' }]
        );
      }
    );
  };

  const handleCancelCountdown = () => {
    SOSService.cancelCountdown();
    setCountdown(null);
    setIsLoading(false);
  };

  const handleResolveAlert = async () => {
    Alert.alert(
      'Mark as Safe?',
      'This will notify your emergency contacts that you are safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Safe",
          onPress: async () => {
            const success = await SOSService.resolveActiveAlert();
            if (success) {
              setHasActiveAlert(false);
              Alert.alert('✅ Alert Resolved', 'Your contacts have been notified.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🛡️ Aegis</Text>
          <Text style={styles.headerSubtitle}>Your Safety Companion</Text>
        </View>

        {/* Active Alert Banner */}
        {hasActiveAlert && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>🚨 Active Emergency Alert</Text>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolveAlert}
            >
              <Text style={styles.resolveButtonText}>I'm Safe</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main SOS Button */}
        <View style={styles.sosContainer}>
          {countdown !== null ? (
            <>
              <View style={styles.countdownCircle}>
                <Text style={styles.countdownText}>{countdown}</Text>
                <Text style={styles.countdownLabel}>Sending SOS...</Text>
              </View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelCountdown}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.sosButton,
                isLoading && styles.sosButtonDisabled,
                hasActiveAlert && styles.sosButtonActive,
              ]}
              onPress={handleSOSPress}
              disabled={isLoading || hasActiveAlert}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sosButtonText}>SOS</Text>
                  <Text style={styles.sosButtonSubtext}>
                    {hasActiveAlert ? 'Alert Active' : 'Press for Emergency'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{emergencyContacts.length}</Text>
            <Text style={styles.statLabel}>Emergency Contacts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {location ? '✓' : '✗'}
            </Text>
            <Text style={styles.statLabel}>Location</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {isCalculatingScore ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : safetyScore !== null ? (
                safetyScore
              ) : (
                '—'
              )}
            </Text>
            <Text style={styles.statLabel}>Safety Score</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/contacts' as any)}
          >
            <Text style={styles.actionIcon}>👥</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Emergency Contacts</Text>
              <Text style={styles.actionSubtitle}>
                {emergencyContacts.length} contact{emergencyContacts.length !== 1 ? 's' : ''} added
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/community' as any)}
          >
            <Text style={styles.actionIcon}>🌐</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Community Feed</Text>
              <Text style={styles.actionSubtitle}>View safety reports near you</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/location-safety-check' as any)}
          >
            <Text style={styles.actionIcon}>🛡️</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Check Location Safety</Text>
              <Text style={styles.actionSubtitle}>Analyze safety of any location</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => Alert.alert('Coming Soon', 'Fake Call feature will be available soon!')}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Fake Call</Text>
              <Text style={styles.actionSubtitle}>Schedule a distraction call</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/settings' as any)}
          >
            <Text style={styles.actionIcon}>⚙️</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Configure app preferences</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        {location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>📍 Current Location</Text>
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            <Text style={styles.locationAccuracy}>
              Accuracy: {location.accuracy?.toFixed(0) || 'N/A'}m
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  alertBanner: {
    backgroundColor: Colors.danger,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertBannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resolveButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resolveButtonText: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  sosContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: Colors.warning,
  },
  sosButtonDisabled: {
    opacity: 0.6,
  },
  sosButtonText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sosButtonSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 8,
  },
  countdownCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countdownLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: Colors.border,
    borderRadius: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionChevron: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  locationCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  locationAccuracy: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
