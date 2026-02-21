// Settings Screen - App configuration and preferences

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import StorageService from '@/services/storageService';
import VoiceDetectionService from '@/services/voiceDetectionService';
import NearbyService from '@/services/nearbyService';
import SOSService from '@/services/sosService';
import { Colors, SUCCESS_MESSAGES, APP_VERSION } from '@/utils/constants';
import type { DeviceSettings, UserProfile } from '@/types';

const DEFAULT_SETTINGS: DeviceSettings = {
  stealthMode: false,
  nightModeSchedule: { enabled: false, startTime: '22:00', endTime: '06:00' },
  voiceDetectionEnabled: false,
  autoRecordEnabled: false,
  fakeChatEnabled: false,
  notificationsEnabled: true,
  locationSharingEnabled: true,
  biometricLockEnabled: false,
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<DeviceSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [bystanderMode, setBystanderMode] = useState(false);

  useEffect(() => {
    loadSettings();
    loadUserProfile();
    loadBystanderMode();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await StorageService.getDeviceSettings();
    if (loadedSettings) {
      setSettings(loadedSettings);
    }
  };

  const loadUserProfile = async () => {
    const profile = await StorageService.getUserProfile();
    if (profile) {
      setUserProfile(profile);
      setProfileForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phoneNumber || '',
      });
    }
  };

  const handleToggleSetting = async (key: keyof DeviceSettings, value: boolean) => {
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    await StorageService.saveDeviceSettings(updatedSettings);
    Alert.alert('Success', SUCCESS_MESSAGES.SETTINGS_UPDATED);
  };

  const handleVoiceDetectionToggle = async (value: boolean) => {
    await handleToggleSetting('voiceDetectionEnabled', value);
    if (value) {
      await VoiceDetectionService.startListening();
    } else {
      VoiceDetectionService.stopListening();
    }
  };

  const loadBystanderMode = async () => {
    const enabled = await NearbyService.isBystanderModeEnabled();
    setBystanderMode(enabled);
  };

  const handleToggleBystanderMode = async (value: boolean) => {
    setBystanderMode(value);
    await NearbyService.setBystanderModeEnabled(value);

    if (value) {
      // Start bystander scanning
      const started = await NearbyService.startBystanderScanning(async (payload) => {
        // Auto-relay detected SOS to Firebase
        await SOSService.relayDetectedSOS(payload);
      });
      if (started) {
        Alert.alert(
          '📡 Bystander Mode Active',
          'Your phone will now relay SOS signals from nearby phones that have no internet.'
        );
      } else {
        Alert.alert(
          'BLE Unavailable',
          'Bluetooth Nearby Connections is not available on this device. A custom dev build is required.'
        );
        setBystanderMode(false);
        await NearbyService.setBystanderModeEnabled(false);
      }
    } else {
      await NearbyService.stopBystanderScanning();
      Alert.alert('Bystander Mode Off', 'Stopped scanning for nearby SOS signals.');
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      Alert.alert('Validation Error', 'Name is required.');
      return;
    }

    const updatedProfile: UserProfile = {
      id: userProfile?.id || `user_${Date.now()}`,
      name: profileForm.name.trim(),
      email: profileForm.email.trim() || undefined,
      phoneNumber: profileForm.phone.trim() || undefined,
      createdAt: userProfile?.createdAt || new Date(),
    };

    await StorageService.saveUserProfile(updatedProfile);
    setUserProfile(updatedProfile);
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all app data including contacts, settings, and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearSensitiveData();
            setSettings(DEFAULT_SETTINGS);
            setUserProfile(null);
            setProfileForm({ name: '', email: '', phone: '' });
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⚙️ Settings</Text>
        </View>

        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {!isEditing ? (
            <View style={styles.profileCard}>
              <Text style={styles.profileName}>{userProfile?.name || 'Not set'}</Text>
              {userProfile?.email && (
                <Text style={styles.profileDetail}>📧 {userProfile.email}</Text>
              )}
              {userProfile?.phoneNumber && (
                <Text style={styles.profileDetail}>📱 {userProfile.phoneNumber}</Text>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.profileCard}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Your Name"
                  value={profileForm.name}
                  onChangeText={(text) => setProfileForm({ ...profileForm, name: text })}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="email@example.com"
                  value={profileForm.email}
                  onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="+1 (555) 123-4567"
                  value={profileForm.phone}
                  onChangeText={(text) => setProfileForm({ ...profileForm, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.profileActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={handleSaveProfile}>
                  <Text style={styles.editButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Safety Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Features</Text>


          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔒 Stealth Mode</Text>
              <Text style={styles.settingDescription}>
                Hide app icon and disguise interface
              </Text>
            </View>
            <Switch
              value={settings.stealthMode}
              onValueChange={(value) => handleToggleSetting('stealthMode', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🎤 Voice Detection</Text>
              <Text style={styles.settingDescription}>
                Auto-trigger SOS on distress keywords
              </Text>
            </View>
            <Switch
              value={settings.voiceDetectionEnabled}
              onValueChange={handleVoiceDetectionToggle}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>📹 Auto-Record</Text>
              <Text style={styles.settingDescription}>
                Automatically record during emergencies
              </Text>
            </View>
            <Switch
              value={settings.autoRecordEnabled}
              onValueChange={(value) => handleToggleSetting('autoRecordEnabled', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>💬 Fake Chat</Text>
              <Text style={styles.settingDescription}>
                Enable quick disguise chat interface
              </Text>
            </View>
            <Switch
              value={settings.fakeChatEnabled}
              onValueChange={(value) => handleToggleSetting('fakeChatEnabled', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔐 Biometric Lock</Text>
              <Text style={styles.settingDescription}>
                Require fingerprint/face to open app
              </Text>
            </View>
            <Switch
              value={settings.biometricLockEnabled}
              onValueChange={(value) => handleToggleSetting('biometricLockEnabled', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>
        </View>

        {/* BLE Bystander Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 Offline SOS Relay</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🤝 Bystander Mode</Text>
              <Text style={styles.settingDescription}>
                Passively relay SOS signals from nearby phones without internet via Bluetooth
              </Text>
            </View>
            <Switch
              value={bystanderMode}
              onValueChange={handleToggleBystanderMode}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          {bystanderMode && (
            <View style={styles.bystanderInfoCard}>
              <Text style={styles.bystanderInfoText}>
                ✅ Scanning for nearby SOS signals. Your phone will automatically relay emergency data to the server.
              </Text>
            </View>
          )}
        </View>

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>


          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>📍 Location Sharing</Text>
              <Text style={styles.settingDescription}>
                Share location during emergencies
              </Text>
            </View>
            <Switch
              value={settings.locationSharingEnabled}
              onValueChange={(value) => handleToggleSetting('locationSharingEnabled', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔔 Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive alerts and reminders
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) => handleToggleSetting('notificationsEnabled', value)}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>
        </View>

        {/* Night Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Night Mode</Text>


          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🌙 Schedule Night Mode</Text>
              <Text style={styles.settingDescription}>
                Auto-enable safety features at night
              </Text>
            </View>
            <Switch
              value={settings.nightModeSchedule?.enabled || false}
              onValueChange={(value) => {
                const updated = {
                  ...settings,
                  nightModeSchedule: {
                    enabled: value,
                    startTime: settings.nightModeSchedule?.startTime || '22:00',
                    endTime: settings.nightModeSchedule?.endTime || '06:00',
                  },
                };
                setSettings(updated);
                StorageService.saveDeviceSettings(updated);
              }}
              trackColor={{ false: '#767577', true: Colors.primary }}
            />
          </View>

          {settings.nightModeSchedule?.enabled && (
            <View style={styles.nightModeSchedule}>
              <Text style={styles.nightModeText}>
                🕐 Active: {settings.nightModeSchedule.startTime} - {settings.nightModeSchedule.endTime}
              </Text>
            </View>
          )}
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>


          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Text style={styles.dangerButtonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>


          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Aegis - Women Safety App</Text>
            <Text style={styles.aboutVersion}>Version {APP_VERSION || '1.0.0'}</Text>
            <Text style={styles.aboutText}>
              Aegis is your personal safety companion, designed to protect and empower women everywhere.
            </Text>
            <Text style={styles.aboutCopyright}>© 2024 Aegis. All rights reserved.</Text>
          </View>
        </View>
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
    marginTop: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  profileDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: Colors.backgroundSecondary,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  nightModeSchedule: {
    backgroundColor: Colors.secondaryLight,
    padding: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
  },
  nightModeText: {
    fontSize: 14,
    color: Colors.secondaryDark,
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  dangerButtonText: {
    color: Colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  aboutVersion: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutCopyright: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Bystander Mode
  bystanderInfoCard: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 12,
  },
  bystanderInfoText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
});
