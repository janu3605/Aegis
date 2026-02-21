// Community Feed Screen - Real-time safety reports

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LocationService from '@/services/locationService';
import StorageService from '@/services/storageService';
import { Colors, SUCCESS_MESSAGES } from '@/utils/constants';
import type { SafetyReport, Location } from '@/types';

export default function CommunityFeedScreen() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    type: 'harassment' as SafetyReport['type'],
    description: '',
  });

  useEffect(() => {
    loadReports();
    getCurrentPosition();
  }, []);

  const getCurrentPosition = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      setCurrentLocation(location);
    }
  };

  const loadReports = async () => {
    try {
      const loadedReports = await StorageService.getSafetyReports();
      setReports(loadedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleSubmitReport = () => {
    getCurrentPosition();
    setFormData({ type: 'harassment', description: '' });
    setModalVisible(true);
  };

  const handleSaveReport = async () => {
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Please provide a description.');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services.');
      return;
    }

    try {
      const report: SafetyReport = {
        id: `report_${Date.now()}`,
        reportedBy: 'current_user',
        type: formData.type,
        description: formData.description.trim(),
        location: currentLocation,
        severity: formData.type === 'assault' ? 'high' : formData.type === 'suspicious' ? 'medium' : 'low',
        timestamp: new Date(),
        upvotes: 0,
        downvotes: 0,
      };

      await StorageService.addSafetyReport(report);
      Alert.alert('Success', SUCCESS_MESSAGES.REPORT_SUBMITTED);
      setModalVisible(false);
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleVote = async (reportId: string, voteType: 'upvote' | 'downvote') => {
    // TODO: Implement voting logic with Firebase
    Alert.alert('Vote Recorded', `You ${voteType}d this report.`);
  };

  const getReportIcon = (type: SafetyReport['type']) => {
    switch (type) {
      case 'harassment':
        return '⚠️';
      case 'assault':
        return '🚨';
      case 'suspicious':
        return '👁️';
      case 'safe_zone':
        return '✅';
      case 'other':
        return '📍';
    }
  };

  const getSeverityColor = (severity: SafetyReport['severity']) => {
    switch (severity) {
      case 'high':
        return Colors.danger;
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const calculateDistance = (reportLocation: Location) => {
    if (!currentLocation) return null;
    const distance = LocationService.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      reportLocation.latitude,
      reportLocation.longitude
    );
    return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌍 Community Feed</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} report{reports.length !== 1 ? 's' : ''} nearby
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Share and view real-time safety reports from your community. Help keep everyone safe!
          </Text>
        </View>

        {/* Reports List */}
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
            <Text style={styles.emptyStateText}>
              Be the first to report a safety concern in your area.
            </Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report) => {
              const distance = calculateDistance(report.location);
              return (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportHeaderLeft}>
                      <Text style={styles.reportIcon}>{getReportIcon(report.type)}</Text>
                      <View>
                        <Text style={styles.reportType}>
                          {report.type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={styles.reportTimestamp}>
                          {formatTimestamp(report.timestamp)}
                          {distance && ` • ${distance} away`}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(report.severity) },
                      ]}
                    >
                      <Text style={styles.severityText}>{report.severity.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.reportDescription}>{report.description}</Text>

                  <View style={styles.reportLocation}>
                    <Text style={styles.reportLocationText}>
                      📍 {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
                    </Text>
                  </View>

                  <View style={styles.reportFooter}>
                    <View style={styles.voteButtons}>
                      <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => handleVote(report.id, 'upvote')}
                      >
                        <Text style={styles.voteButtonText}>
                          👍 {report.upvotes || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => handleVote(report.id, 'downvote')}
                      >
                        <Text style={styles.voteButtonText}>
                          👎 {report.downvotes || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Submit Report Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport}>
          <Text style={styles.submitButtonText}>+ Report Safety Concern</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Submit Report Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Submit Report</Text>
            <TouchableOpacity onPress={handleSaveReport}>
              <Text style={styles.modalSave}>Submit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Report Type</Text>
              <View style={styles.typeButtons}>
                {[
                  { value: 'harassment', label: '⚠️ Harassment' },
                  { value: 'assault', label: '🚨 Assault' },
                  { value: 'suspicious', label: '👁️ Suspicious Activity' },
                  { value: 'safe_zone', label: '✅ Safe Zone' },
                  { value: 'other', label: '📍 Other' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      formData.type === type.value && styles.typeButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, type: type.value as SafetyReport['type'] })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === type.value && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.formTextArea}
                placeholder="Describe what happened, where, and when..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {currentLocation && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <Text style={styles.locationInfo}>
                  📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
                <Text style={styles.locationNote}>Your current location will be attached</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.secondaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: Colors.secondaryDark,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  reportsList: {
    marginBottom: 20,
  },
  reportCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  reportIcon: {
    fontSize: 24,
  },
  reportType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  reportTimestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  reportDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportLocation: {
    backgroundColor: Colors.backgroundSecondary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  reportLocationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  voteButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalCancel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalSave: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  typeButtons: {
    gap: 10,
  },
  typeButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryLight,
  },
  typeButtonText: {
    fontSize: 16,
    color: Colors.text,
  },
  typeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  formTextArea: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 120,
  },
  locationInfo: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  locationNote: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
