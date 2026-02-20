import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Header } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { SOSService, FakeCallService } from '../services';
import { SOSEvent, FakeCallEvent } from '../types';

interface HistoryScreenProps {
  navigation: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>([]);
  const [fakeCallEvents, setFakeCallEvents] = useState<FakeCallEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'sos' | 'fakecall'>('sos');

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const sos = await SOSService.getSOSHistory();
      const calls = await FakeCallService.getFakeCallHistory();
      setSOSEvents(sos.reverse());
      setFakeCallEvents(calls.reverse());
    } catch (error) {
      Alert.alert('Error', 'Failed to load history');
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderSOSItem = ({ item }: { item: SOSEvent }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>🆘</Text>
        <View style={styles.cardTitle}>
          <Text style={styles.cardLabel}>SOS Alert</Text>
          <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        <Text style={styles.detailText}>
          📍 Location: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
        </Text>
        <Text style={styles.detailText}>
          👥 Contacts notified: {item.contactsNotified.length}
        </Text>
        {item.message && (
          <Text style={styles.detailText}>💬 {item.message}</Text>
        )}
      </View>
    </View>
  );

  const renderFakeCallItem = ({ item }: { item: FakeCallEvent }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>📞</Text>
        <View style={styles.cardTitle}>
          <Text style={styles.cardLabel}>Fake Call - {item.callerName}</Text>
          <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.cardDetails}>
        {item.duration && (
          <Text style={styles.detailText}>⏱️ Duration: {item.duration}s</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <Header title="Event History" subtitle="View past alerts and activities" />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sos' && styles.activeTab]}
          onPress={() => setActiveTab('sos')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'sos' && styles.activeTabText,
            ]}
          >
            🆘 SOS Events ({sosEvents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fakecall' && styles.activeTab]}
          onPress={() => setActiveTab('fakecall')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'fakecall' && styles.activeTabText,
            ]}
          >
            📞 Fake Calls ({fakeCallEvents.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'sos' ? (
          sosEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No SOS events yet</Text>
            </View>
          ) : (
            <FlatList
              data={sosEvents}
              renderItem={renderSOSItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : fakeCallEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No fake calls yet</Text>
          </View>
        ) : (
          <FlatList
            data={fakeCallEvents}
            renderItem={renderFakeCallItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 2,
  },
  cardTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: COLORS.light,
    paddingTop: 12,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
});
