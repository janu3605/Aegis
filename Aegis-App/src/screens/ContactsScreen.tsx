import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Header, Button } from '../components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { ContactManager } from '../services';
import { EmergencyContact } from '../types';

interface ContactsScreenProps {
  navigation: any;
}

export const ContactsScreen: React.FC<ContactsScreenProps> = ({ navigation }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', relationship: '' });

  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    try {
      const allContacts = await ContactManager.getAllContacts();
      setContacts(allContacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load contacts');
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({ name: '', phoneNumber: '', relationship: '' });
    setShowModal(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phoneNumber: contact.phoneNumber,
      relationship: contact.relationship || '',
    });
    setShowModal(true);
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert('Delete Contact', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await ContactManager.deleteContact(id);
            loadContacts();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete contact');
          }
        },
      },
    ]);
  };

  const handleSaveContact = async () => {
    if (!formData.name || !formData.phoneNumber) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      if (editingContact) {
        await ContactManager.updateContact(editingContact.id, formData);
      } else {
        await ContactManager.addContact(formData);
      }
      loadContacts();
      setShowModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const renderContactItem = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        {item.relationship && (
          <Text style={styles.contactRelation}>{item.relationship}</Text>
        )}
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditContact(item)}
        >
          <Text style={styles.actionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteContact(item.id)}
        >
          <Text style={styles.actionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'left']}>
      <Header title="Emergency Contacts" subtitle="Manage your safety network" />

      <View style={styles.content}>
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No contacts added yet</Text>
            <Text style={styles.emptySubtext}>
              Add emergency contacts to receive alerts when you trigger SOS
            </Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        )}

        <Button
          title="➕ Add Contact"
          onPress={handleAddContact}
          variant="primary"
          size="large"
          style={styles.addButton}
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <Header 
            title={editingContact ? 'Edit Contact' : 'Add Contact'} 
            subtitle="Enter contact details"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formContainer}
          >
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholderTextColor={COLORS.gray}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.gray}
            />
            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g., Mom, Sister)"
              value={formData.relationship}
              onChangeText={(text) => setFormData({ ...formData, relationship: text })}
              placeholderTextColor={COLORS.gray}
            />

            <View style={styles.formActions}>
              <Button
                title="Cancel"
                onPress={() => setShowModal(false)}
                variant="secondary"
                style={styles.formButton}
              />
              <Button
                title="Save Contact"
                onPress={handleSaveContact}
                variant="primary"
                style={styles.formButton}
              />
            </View>
          </KeyboardAvoidingView>
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
  listContent: {
    paddingBottom: 16,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  contactRelation: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  actionText: {
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    maxWidth: 300,
  },
  addButton: {
    marginTop: 'auto',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: COLORS.light,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 16,
  },
  formButton: {
    flex: 1,
  },
});
