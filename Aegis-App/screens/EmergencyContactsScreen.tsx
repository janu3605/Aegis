// Emergency Contacts Screen - Manage emergency contacts

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import StorageService from '@/services/storageService';
import { Colors, SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/utils/constants';
import type { EmergencyContact } from '@/types';

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    relationship: '',
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const loadedContacts = await StorageService.getEmergencyContacts();
    setContacts(loadedContacts);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({ name: '', phoneNumber: '', email: '', relationship: '' });
    setModalVisible(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      email: contact.email || '',
      relationship: contact.relationship || '',
    });
    setModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Name and phone number are required.');
      return;
    }

    const normalizePhoneNumber = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.startsWith('+')) {
        return trimmed;
      }

      const digitsOnly = trimmed.replace(/[^\d]/g, '').replace(/^0+/, '');
      return `+91${digitsOnly}`;
    };

    try {
      if (editingContact) {
        // Update existing contact
        const updatedContact: EmergencyContact = {
          ...editingContact,
          name: formData.name.trim(),
          phoneNumber: normalizePhoneNumber(formData.phoneNumber),
          email: formData.email.trim() || undefined,
          relationship: formData.relationship.trim() || undefined,
        };
        await StorageService.updateEmergencyContact(updatedContact);
        Alert.alert('Success', SUCCESS_MESSAGES.CONTACT_UPDATED);
      } else {
        // Add new contact
        const newContact: EmergencyContact = {
          id: `contact_${Date.now()}`,
          name: formData.name.trim(),
          phoneNumber: normalizePhoneNumber(formData.phoneNumber),
          email: formData.email.trim() || undefined,
          relationship: formData.relationship.trim() || undefined,
          isPrimary: contacts.length === 0, // First contact is primary
          createdAt: new Date(),
        };
        await StorageService.addEmergencyContact(newContact);
        Alert.alert('Success', SUCCESS_MESSAGES.CONTACT_ADDED);
      }

      setModalVisible(false);
      loadContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteEmergencyContact(contact.id);
            Alert.alert('Success', SUCCESS_MESSAGES.CONTACT_DELETED);
            loadContacts();
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (contact: EmergencyContact) => {
    try {
      // Update all contacts to set isPrimary
      const updatedContacts = contacts.map((c) => ({
        ...c,
        isPrimary: c.id === contact.id,
      }));

      for (const c of updatedContacts) {
        await StorageService.updateEmergencyContact(c);
      }

      Alert.alert('Success', `${contact.name} is now your primary contact.`);
      loadContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update primary contact.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>👥 Emergency Contacts</Text>
          <Text style={styles.headerSubtitle}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} added
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 These contacts will receive emergency alerts with your location when you trigger SOS.
          </Text>
        </View>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Contacts Yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first emergency contact to get started.
            </Text>
          </View>
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.contactHeader}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.contactPhone}>📱 {contact.phoneNumber}</Text>
                
                {contact.email && (
                  <Text style={styles.contactEmail}>📧 {contact.email}</Text>
                )}
                
                {contact.relationship && (
                  <Text style={styles.contactRelationship}>👤 {contact.relationship}</Text>
                )}

                <View style={styles.contactActions}>
                  {!contact.isPrimary && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleSetPrimary(contact)}
                    >
                      <Text style={styles.actionButtonText}>Set Primary</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditContact(contact)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteContact(contact)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Contact Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Text style={styles.addButtonText}>+ Add Emergency Contact</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </Text>
            <TouchableOpacity onPress={handleSaveContact}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="9876543210"
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                keyboardType="phone-pad"
              />
              <Text style={styles.formHint}>We will automatically add +91 if missing.</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="email@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Relationship (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Mother, Friend, Partner"
                value={formData.relationship}
                onChangeText={(text) => setFormData({ ...formData, relationship: text })}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.formNote}>* Required fields</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  contactsList: {
    marginBottom: 20,
  },
  contactCard: {
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
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  primaryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.secondaryLight,
  },
  actionButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    color: Colors.danger,
  },
  addButton: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0,
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
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  formNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
  },
});
