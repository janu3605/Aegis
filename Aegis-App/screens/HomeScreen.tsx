// Home Screen - Main Dashboard with SOS button

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import SOSService from '@/services/sosService';
import type { SOSPhase } from '@/services/sosService';
import LocationService from '@/services/locationService';
import StorageService from '@/services/storageService';
import FakeCallService from '@/services/fakeCallService';
import VoiceDetectionService from '@/services/voiceDetectionService';
import { Colors, SOS_CONFIG, BLE_CONFIG } from '@/utils/constants';
import type { EmergencyContact, Location as LocationType } from '@/types';

export default function HomeScreen() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveAlert, setHasActiveAlert] = useState(false);
  const [location, setLocation] = useState<LocationType | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safetyScore, setSafetyScore] = useState<number | null>(null);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [voiceDetectionEnabled, setVoiceDetectionEnabled] = useState(false);
  const [sosPhase, setSOSPhase] = useState<SOSPhase>('idle');

  // Alert Mode animation
  const flashAnim = useRef(new Animated.Value(0)).current;
  const [alertSound, setAlertSound] = useState<Audio.Sound | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [])
  );

  const stopAlertMode = useCallback(() => {
    // Stop vibration
    Vibration.cancel();

    // Stop sound
    if (alertSound) {
      void alertSound.unloadAsync();
      setAlertSound(null);
    }

    // Reset flash
    flashAnim.stopAnimation();
    flashAnim.setValue(0);
  }, [alertSound]);

  // ═══════════════════════════════════════════
  // ALERT MODE EFFECTS (flash + alarm + vibration)
  // ═══════════════════════════════════════════

  const startAlertModeEffects = useCallback(async () => {
    // Start screen flash animation
    const flashLoop = () => {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
      ]).start(({ finished }) => {
        if (finished) {
          flashLoop();
        }
      });
    };
    flashLoop();

    // Start vibration pattern (repeating)
    Vibration.vibrate([500, 500, 500, 500], true);

    // Start haptic feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [flashAnim]);

  // Start/stop Alert Mode effects based on phase
  useEffect(() => {
    if (sosPhase === 'alert-mode') {
      void startAlertModeEffects();
    } else {
      stopAlertMode();
    }
  }, [sosPhase, startAlertModeEffects, stopAlertMode]);

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

      const deviceSettings = await StorageService.getDeviceSettings();
      setVoiceDetectionEnabled(!!deviceSettings?.voiceDetectionEnabled);
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

  const startSOSCountdown = async (
    type: 'manual' | 'auto' | 'voice-triggered' | 'pattern-detected' = 'manual'
  ) => {
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

    if (isLoading || hasActiveAlert || countdown !== null) {
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

  const handleSOSPress = async () => {
    await startSOSCountdown('manual');
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
              Alert.alert('Alert Resolved', 'Your contacts have been notified.');
            }
          },
        },
      ]
    );
  };

  const handleFakeCall = () => {
    if (FakeCallService.isCallActive()) {
      Alert.alert('Call Active', 'A fake call is already in progress.');
      return;
    }

    const popularCallers = require('@/services/fakeCallService').default.constructor.getPopularCallers();
    const callerOptions = popularCallers.map((caller: any) => ({
      text: `${caller.callerImage} ${caller.callerName}`,
      onPress: () => initiateCall(caller),
    }));

    Alert.alert(
      'Select Caller',
      'Choose who will call you, or schedule for later',
      [
        ...callerOptions,
        { text: 'Schedule Later', onPress: () => router.push('/(tabs)/schedule-call' as any) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const initiateCall = async (caller: any) => {
    try {
      // Initialize the call service
      await FakeCallService.initiateCall(caller, {
        onCallAnswered: () => {
          console.log('Call was answered');
        },
        onCallDeclined: () => {
          console.log('Call was declined by user');
        },
        onCallEnded: () => {
          console.log('Call has ended');
        },
      });

      // Auto-answer after 1 second and navigate to call screen
      setTimeout(async () => {
        await FakeCallService.answerCall();
      }, 1000);

      // Navigate to the fake call screen with caller info
      router.push({
        pathname: '/fakeCall',
        params: {
          callerName: caller.callerName,
          callerImage: caller.callerImage,
          callerPhone: caller.callerPhone || '+1 (555) 000-0000',
        },
      } as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate call');
      console.error('Error initiating call:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = VoiceDetectionService.onDetection((event) => {
      if (isLoading || hasActiveAlert || countdown !== null) {
        return;
      }

      startSOSCountdown('voice-triggered');
      Alert.alert(
        'Voice Distress Detected',
        `Detected: "${event.keyword}". SOS will send after countdown unless cancelled.`,
        [{ text: 'Cancel', style: 'cancel', onPress: handleCancelCountdown }]
      );
    });

    return unsubscribe;
  }, [isLoading, hasActiveAlert, countdown, emergencyContacts]);

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
          <Text style={styles.headerTitle}>Aegis</Text>
          <Text style={styles.headerSubtitle}>Your Safety Companion</Text>
        </View>

        {/* Voice Detection Status */}
        <View style={styles.voiceCard}>
          <View style={styles.voiceStatusRow}>
            <Text style={styles.voiceLabel}>🎤 Voice Detection</Text>
            <View
              style={[
                styles.voiceStatusBadge,
                voiceDetectionEnabled ? styles.voiceStatusOn : styles.voiceStatusOff,
              ]}
            >
              <Text style={styles.voiceStatusText}>
                {voiceDetectionEnabled ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>
          <Text style={styles.voiceHint}>
            Say “help help help” to trigger SOS when enabled.
          </Text>
          <TouchableOpacity
            style={styles.voiceTestButton}
            onPress={() => startSOSCountdown('voice-triggered')}
            disabled={!voiceDetectionEnabled || isLoading || hasActiveAlert || countdown !== null}
          >
            <Text style={styles.voiceTestButtonText}>Test Voice Trigger</Text>
          </TouchableOpacity>
        </View>

        {/* Active Alert Banner */}
        {hasActiveAlert && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertBannerText}>Active Emergency Alert</Text>
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
              {location ? 'Yes' : 'No'}
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
            <MaterialIcons name="contacts" size={28} color={Colors.primary} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Emergency Contacts</Text>
              <Text style={styles.actionSubtitle}>
                {emergencyContacts.length} contact{emergencyContacts.length !== 1 ? 's' : ''} added
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/community' as any)}
          >
            <MaterialIcons name="forum" size={28} color={Colors.secondary} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Community Feed</Text>
              <Text style={styles.actionSubtitle}>View safety reports near you</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/location-safety-check' as any)}
          >
            <MaterialIcons name="verified-user" size={28} color={Colors.success} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Check Location Safety</Text>
              <Text style={styles.actionSubtitle}>Analyze safety of any location</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleFakeCall}
          >
            <MaterialIcons name="phone-in-talk" size={28} color={Colors.warning} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Fake Call</Text>
              <Text style={styles.actionSubtitle}>Instant distraction mode</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/settings' as any)}
          >
            <MaterialIcons name="settings" size={28} color={Colors.info} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Configure app preferences</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/stealthNews' as any)}
          >
            <MaterialIcons name="article" size={28} color={Colors.secondaryDark} style={styles.actionIcon} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Stealth News</Text>
              <Text style={styles.actionSubtitle}>Disguised news mode with hidden SOS trigger</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        {location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Current Location</Text>
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
  voiceCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  voiceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  voiceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  voiceStatusOn: {
    backgroundColor: Colors.success,
  },
  voiceStatusOff: {
    backgroundColor: Colors.textSecondary,
  },
  voiceStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  voiceHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  voiceTestButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  voiceTestButtonText: {
    color: Colors.secondaryDark,
    fontSize: 14,
    fontWeight: '600',
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
    marginRight: 16,
    width: 28,
    textAlign: 'center' as const,
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

