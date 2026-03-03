// Home Screen - Main Dashboard with SOS button

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import SOSService from '@/services/sosService';
import type { SOSPhase } from '@/services/sosService';
import LocationService from '@/services/locationService';
import StorageService from '@/services/storageService';
import { Colors, SOS_CONFIG, BLE_CONFIG } from '@/utils/constants';
import type { EmergencyContact, Location as LocationType } from '@/types';

export default function HomeScreen() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [sosPhase, setSOSPhase] = useState<SOSPhase>('idle');

  // Alert Mode animation
  const flashAnim = useRef(new Animated.Value(0)).current;
  const flashAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevPhaseRef = useRef<SOSPhase>('idle');
  const flashTimer = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadInitialData();

    // Listen for SOS phase changes (BLE broadcasting, Alert Mode, etc.)
    SOSService.setOnPhaseChange((phase: SOSPhase) => {
      setSOSPhase(phase);
      if (phase === 'active' || phase === 'resolved') {
        setHasActiveAlert(phase === 'active');
      }
    });

    return () => {
      stopAlertMode();
    };
  }, []);

  // Start/stop Alert Mode effects based on phase
  useEffect(() => {
    if (sosPhase === 'alert-mode') {
      startAlertModeEffects();
    } else if (prevPhaseRef.current === 'alert-mode') {
      stopAlertMode();
    }
    prevPhaseRef.current = sosPhase;
  }, [sosPhase]);

  // ═══════════════════════════════════════════
  // ALERT MODE EFFECTS (flash + alarm + vibration)
  // ═══════════════════════════════════════════

  const startAlertModeEffects = async () => {
    // Start screen flash animation
    const flashLoop = () => {
      flashAnimRef.current = Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
      ]);
      flashAnimRef.current.start(() => flashLoop());
    };
    flashLoop();

    // Start vibration pattern (repeating)
    Vibration.vibrate([500, 500, 500, 500], true);

    // Start haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const stopAlertMode = () => {
    // Stop vibration
    Vibration.cancel();

    // Stop sound
    if (soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    // Stop animation before resetting value
    if (flashAnimRef.current) {
      flashAnimRef.current.stop();
      flashAnimRef.current = null;
    }
    flashAnim.setValue(0);
  };

  const loadInitialData = async () => {
    try {
      // Check for active alert
      const activeAlert = SOSService.hasActiveAlert();
      setHasActiveAlert(activeAlert);

      // Get current location
      const loc = await LocationService.getCurrentLocation();
      setLocation(loc);

      // Get emergency contacts
      const contacts = await StorageService.getEmergencyContacts();
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error loading initial data:', error);
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

        const phase = SOSService.getCurrentPhase();
        if (phase === 'ble-broadcasting') {
          Alert.alert(
            '📡 SOS Broadcasting',
            'No cellular service. Broadcasting SOS via Bluetooth to nearby devices.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            '🚨 SOS Alert Sent',
            `Emergency alerts sent to ${emergencyContacts.length} contact(s)`,
            [{ text: 'OK' }]
          );
        }
      }
    );
  };

  const handleSOSLongPress = async () => {
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

    // Haptic feedback to confirm long-press detected
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Skip countdown — trigger SOS immediately
    setIsLoading(true);
    setHasActiveAlert(true);
    await SOSService.triggerSOS('manual');
    setIsLoading(false);

    const phase = SOSService.getCurrentPhase();
    if (phase === 'ble-broadcasting') {
      Alert.alert(
        '📡 SOS Broadcasting',
        'No cellular service. Broadcasting SOS via Bluetooth to nearby devices.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '🚨 SOS Alert Sent',
        `Emergency alerts sent to ${emergencyContacts.length} contact(s)`,
        [{ text: 'OK' }]
      );
    }
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
              setSOSPhase('idle');
              stopAlertMode();
              Alert.alert('✅ Alert Resolved', 'Your contacts have been notified.');
            }
          },
        },
      ]
    );
  };

  const handleDismissAlertMode = () => {
    SOSService.deactivateAlertMode();
    stopAlertMode();
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
              onLongPress={handleSOSLongPress}
              delayLongPress={3000}
              disabled={isLoading || hasActiveAlert}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sosButtonText}>SOS</Text>
                  <Text style={styles.sosButtonSubtext}>
                    {hasActiveAlert ? 'Alert Active' : 'Hold 3s for Instant SOS'}
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
            <Text style={styles.statValue}>95</Text>
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

      {/* BLE Broadcasting Status Overlay */}
      {sosPhase === 'ble-broadcasting' && (
        <View style={styles.bleOverlay}>
          <View style={styles.bleOverlayContent}>
            <Text style={styles.bleOverlayIcon}>📡</Text>
            <Text style={styles.bleOverlayTitle}>Broadcasting SOS</Text>
            <Text style={styles.bleOverlaySubtitle}>
              No internet detected. Searching for nearby phones via Bluetooth...
            </Text>
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />
            <Text style={styles.bleOverlayTimer}>
              Alert Mode activates in {BLE_CONFIG.TIMEOUT_MS / 1000}s if no relay
            </Text>
          </View>
        </View>
      )}

      {/* Alert Mode Full-Screen Overlay */}
      {sosPhase === 'alert-mode' && (
        <Animated.View
          style={[
            styles.alertModeOverlay,
            {
              backgroundColor: flashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#E63946', '#FFFFFF'],
              }),
            },
          ]}
        >
          <Text style={styles.alertModeIcon}>🚨</Text>
          <Text style={[
            styles.alertModeTitle,
            { color: flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#E63946'] }) as any }
          ]}>
            EMERGENCY
          </Text>
          <Text style={styles.alertModeSubtitle}>
            NO INTERNET • NO RELAY FOUND
          </Text>
          {location && (
            <Text style={styles.alertModeLocation}>
              📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.alertModeDismiss}
            onPress={handleDismissAlertMode}
          >
            <Text style={styles.alertModeDismissText}>Dismiss Alert Mode</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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

  // BLE Broadcasting Overlay
  bleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bleOverlayContent: {
    alignItems: 'center',
  },
  bleOverlayIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  bleOverlayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bleOverlaySubtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 8,
  },
  bleOverlayTimer: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 12,
  },

  // Alert Mode Full-Screen Overlay
  alertModeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  alertModeIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  alertModeTitle: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 12,
  },
  alertModeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 20,
  },
  alertModeLocation: {
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 30,
  },
  alertModeDismiss: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  alertModeDismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
