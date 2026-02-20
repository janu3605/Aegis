import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
} from 'react-native';
import { Header, Button } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { SOSService, FakeCallService, StealthModeService } from '../services';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [emergencyCount, setEmergencyCount] = useState(0);

  useEffect(() => {
    checkStealthMode();
    loadEmergencyContactCount();
  }, []);

  const checkStealthMode = async () => {
    const isActive = await StealthModeService.isStealthModeActive();
    setIsStealthMode(isActive);
  };

  const loadEmergencyContactCount = async () => {
    // This would load from storage in a real app
    setEmergencyCount(2); // Placeholder
  };

  const handleSOSPress = () => {
    Alert.alert(
      'Confirm SOS',
      'Send emergency alert to your contacts?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Yes, Send SOS',
          onPress: async () => {
            try {
              const event = await SOSService.triggerSOS();
              Alert.alert(
                'SOS Sent',
                'Emergency alert sent to your contacts.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to send SOS');
            }
          },
        },
      ]
    );
  };

  const handleFakeCall = async () => {
    try {
      await FakeCallService.startFakeCall('Mom');
      Alert.alert(
        'Fake Call Started',
        'Your phone is simulating an incoming call.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate fake call');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <Header title="🛡️ Aegis" subtitle="Women Safety App" />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Contacts</Text>
            <Text style={styles.statusValue}>{emergencyCount}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, { color: isStealthMode ? COLORS.warning : COLORS.success }]}>
              {isStealthMode ? 'Stealth' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Emergency SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={handleSOSPress}
            activeOpacity={0.8}
          >
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
          <Text style={styles.sosHint}>Hold or tap for help</Text>
        </View>

        {/* Quick Action Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={handleFakeCall}
          >
            <Text style={styles.gridIcon}>📞</Text>
            <Text style={styles.gridTitle}>Fake Call</Text>
            <Text style={styles.gridDesc}>Distraction mode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Contacts')}
          >
            <Text style={styles.gridIcon}>👥</Text>
            <Text style={styles.gridTitle}>Contacts</Text>
            <Text style={styles.gridDesc}>Emergency list</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.gridIcon}>⚙️</Text>
            <Text style={styles.gridTitle}>Settings</Text>
            <Text style={styles.gridDesc}>Stealth mode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.gridIcon}>📋</Text>
            <Text style={styles.gridTitle}>History</Text>
            <Text style={styles.gridDesc}>Events log</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>💡 Safety Tip</Text>
          <Text style={styles.tipText}>
            Add emergency contacts now. They'll receive your location when you trigger SOS.
          </Text>
        </View>
      </ScrollView>
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBar: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.light,
    marginHorizontal: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  sosContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sosText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  sosHint: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  gridItem: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  gridIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  gridDesc: {
    fontSize: 11,
    color: COLORS.gray,
  },
  tipBox: {
    backgroundColor: COLORS.info,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.white,
    lineHeight: 18,
  },
});
