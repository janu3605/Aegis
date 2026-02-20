import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import StealthService, { StealthNewsItem } from '@/services/stealthService';
import { Colors } from '@/utils/constants';

const TAP_WINDOW_MS = 450;

export default function StealthNewsScreen() {
  const [tapCount, setTapCount] = useState(0);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const lastTapAt = useRef(0);
  const newsFeed = useMemo(() => StealthService.getFakeNewsFeed(), []);

  const handleHeaderTap = () => {
    const now = Date.now();

    if (now - lastTapAt.current < TAP_WINDOW_MS) {
      const nextCount = tapCount + 1;
      setTapCount(nextCount);
      if (nextCount >= 2) {
        router.back();
        return;
      }
    } else {
      setTapCount(0);
    }

    lastTapAt.current = now;
  };

  const handleHiddenSOS = async () => {
    if (isTriggeringSOS) return;
    setIsTriggeringSOS(true);

    try {
      const result = await StealthService.triggerHiddenSOS();
      Alert.alert(result.success ? 'SOS' : 'SOS Failed', result.message);
    } catch (error) {
      Alert.alert('SOS Failed', 'Failed to trigger SOS. Please try again.');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  const renderItem = ({ item }: { item: StealthNewsItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>
          {item.source} | {item.time}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <TouchableOpacity activeOpacity={1} onPress={handleHeaderTap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DailyWire</Text>
          <Text style={styles.searchLabel}>Search</Text>
        </View>
      </TouchableOpacity>

      <FlatList
        data={newsFeed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.bottomAd}
        onLongPress={handleHiddenSOS}
        delayLongPress={StealthService.getHiddenTriggerHoldDuration()}
        activeOpacity={0.9}
        disabled={isTriggeringSOS}
      >
        <Text style={styles.bottomAdText}>{isTriggeringSOS ? 'Please wait...' : 'Sponsored'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  header: {
    height: 74,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#121212',
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555555',
  },
  listContent: {
    padding: 12,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: 12,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#1A73E8',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: '#7A7A7A',
  },
  bottomAd: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#F0C14B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    opacity: 0.92,
  },
  bottomAdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E3414',
  },
});
