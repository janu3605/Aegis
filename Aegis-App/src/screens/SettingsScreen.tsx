import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Header, Button } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { StealthModeService } from '../services';
import { AppSettings } from '../types';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await StealthModeService.getSettings();
      setSettings(appSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const handleToggleStealth = async (value: boolean) => {
    try {
      await StealthModeService.toggleStealthMode(value);
      setSettings({ ...settings!, stealthModeEnabled: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update stealth mode');
    }
  };

  const handleToggleNightMode = async (value: boolean) => {
    try {
      await StealthModeService.toggleNightMode(value);
      setSettings({ ...settings!, nightModeEnabled: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update night mode');
    }
  };

  const handleToggleAutoSOS = async (value: boolean) => {
    try {
      await StealthModeService.updateSettings({ autoSOSEnabled: value });
      setSettings({ ...settings!, autoSOSEnabled: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-SOS');
    }
  };

  const handleSavePin = async () => {
    if (!newPin || !confirmPin) {
      Alert.alert('Error', 'Please enter PIN in both fields');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    if (newPin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 characters');
      return;
    }

    try {
      await StealthModeService.setStealthPin(newPin);
      Alert.alert('Success', 'Stealth PIN updated');
      setShowPinModal(false);
      setNewPin('');
      setConfirmPin('');
      loadSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to update PIN');
    }
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
        <Header title="Settings" subtitle="App configuration" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <Header title="Settings" subtitle="Customize your safety app" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stealth Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Stealth Mode</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Enable Stealth Mode</Text>
              <Text style={styles.settingDesc}>
                App appears as calculator. SOS works silently in background.
              </Text>
            </View>
            <Switch
              value={settings.stealthModeEnabled}
              onValueChange={handleToggleStealth}
              trackColor={{ false: '#767577', true: '#81C784' }}
              thumbColor={settings.stealthModeEnabled ? COLORS.success : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPinModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Stealth PIN Code</Text>
              <Text style={styles.settingDesc}>
                Secret code to unlock real app from calculator view
              </Text>
            </View>
            <Text style={styles.settingValue}>Change →</Text>
          </TouchableOpacity>
        </View>

        {/* Protection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛡️ Protection</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Night Mode</Text>
              <Text style={styles.settingDesc}>
                Enhanced monitoring from 10 PM to 5 AM
              </Text>
            </View>
            <Switch
              value={settings.nightModeEnabled}
              onValueChange={handleToggleNightMode}
              trackColor={{ false: '#767577', true: '#81C784' }}
              thumbColor={settings.nightModeEnabled ? COLORS.success : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-SOS on High Threat</Text>
              <Text style={styles.settingDesc}>
                Automatically send SOS when extreme danger is detected
              </Text>
            </View>
            <Switch
              value={settings.autoSOSEnabled}
              onValueChange={handleToggleAutoSOS}
              trackColor={{ false: '#767577', true: '#81C784' }}
              thumbColor={settings.autoSOSEnabled ? COLORS.success : '#f4f3f4'}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2026.02</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>⚠️ Important</Text>
          <Text style={styles.disclaimerText}>
            Aegis is a safety app, but is not a substitute for professional help. Always contact local emergency services in life-threatening situations.
          </Text>
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        animationType="slide"
        onRequestClose={() => setShowPinModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <Header title="Set Stealth PIN" subtitle="Create a secret unlock code" />
          <View style={styles.modalContent}>
            <Text style={styles.pinLabel}>Enter PIN (4+ characters)</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="e.g., 1234"
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.pinLabel}>Confirm PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="Repeat PIN"
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholderTextColor={COLORS.gray}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowPinModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Save PIN"
                onPress={handleSavePin}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  settingValue: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  aboutItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  aboutLabel: {
    fontSize: 14,
    color: COLORS.dark,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  disclaimerBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.light,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  modalButton: {
    flex: 1,
  },
});
