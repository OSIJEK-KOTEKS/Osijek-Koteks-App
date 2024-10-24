import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {Text, Input, ListItem, CheckBox} from 'react-native-elements';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import {Picker} from '@react-native-picker/picker';
import axios from 'axios';
import {apiService, User} from '../utils/api';
import CustomAvatar from '../components/CustomAvatar';

interface UserFormData {
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  role: 'admin' | 'user' | 'bot';
  codes: string[];
  password?: string;
  isVerified?: boolean;
}

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCodesModalVisible, setCodesModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [newCode, setNewCode] = useState('');

  const initialUserState: UserFormData = {
    email: '',
    firstName: '',
    lastName: '',
    company: '',
    role: 'user',
    codes: [],
    password: '',
    isVerified: false,
  };

  const [formData, setFormData] = useState<UserFormData>(initialUserState);

  useEffect(() => {
    fetchUsers();
    fetchAllCodes();
  }, []);

  const fetchAllCodes = async () => {
    try {
      const users = await apiService.getUsers();
      const uniqueCodes = Array.from(
        new Set(users.flatMap(user => user.codes)),
      ).sort();
      setAvailableCodes(uniqueCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
      Alert.alert('Error', 'Failed to fetch available codes');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    await fetchAllCodes();
    setRefreshing(false);
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setSelectedUser(null);
    setSelectedCodes([]);
    setFormData(initialUserState);
    setModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setSelectedCodes(user.codes);
    setFormData({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      role: user.role,
      codes: user.codes,
      isVerified: user.isVerified,
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteUser(userId);
              await fetchUsers();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ],
    );
  };

  const handleAddNewCode = () => {
    if (!/^\d{5}$/.test(newCode)) {
      Alert.alert('Invalid Code', 'Code must be exactly 5 digits');
      return;
    }

    if (selectedCodes.includes(newCode)) {
      Alert.alert('Duplicate Code', 'This code is already selected');
      return;
    }

    const updatedCodes = [...selectedCodes, newCode].sort();
    setSelectedCodes(updatedCodes);
    if (!availableCodes.includes(newCode)) {
      setAvailableCodes([...availableCodes, newCode].sort());
    }
    setFormData({...formData, codes: updatedCodes});
    setNewCode('');
  };

  const toggleCodeSelection = (code: string) => {
    const updatedCodes = selectedCodes.includes(code)
      ? selectedCodes.filter(c => c !== code)
      : [...selectedCodes, code].sort();

    setSelectedCodes(updatedCodes);
    setFormData({...formData, codes: updatedCodes});
  };

  const validateForm = () => {
    if (!formData.email?.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    if (modalMode === 'create' && !formData.password?.trim()) {
      Alert.alert('Error', 'Password is required for new users');
      return false;
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return false;
    }
    if (!formData.company?.trim()) {
      Alert.alert('Error', 'Company is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        if (!formData.password) {
          Alert.alert('Error', 'Password is required for new users');
          return;
        }
        const registrationData = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          role: formData.role,
          codes: formData.codes,
          password: formData.password,
        };
        await apiService.register(registrationData);
      } else if (selectedUser?._id) {
        const {password, _id, ...updateData} = formData;
        await apiService.updateUser(selectedUser._id, updateData);
      }

      setModalVisible(false);
      await fetchUsers();
      Alert.alert(
        'Success',
        `User ${modalMode === 'create' ? 'created' : 'updated'} successfully`,
      );
    } catch (error: unknown) {
      console.error('Error submitting user:', error);
      let errorMessage = 'An error occurred while saving the user.';

      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    }
  };

  const renderCodesModal = () => (
    <Modal
      isVisible={isCodesModalVisible}
      onBackdropPress={() => setCodesModalVisible(false)}
      style={styles.modalStyle}
      animationIn="slideInUp"
      animationOut="slideOutDown">
      <View style={styles.modalContent}>
        <Text h4 style={styles.modalTitle}>
          Select Codes
        </Text>
        <ScrollView style={styles.codesScrollView}>
          <View style={styles.newCodeContainer}>
            <Input
              placeholder="Add new code (5 digits)"
              value={newCode}
              onChangeText={setNewCode}
              keyboardType="numeric"
              maxLength={5}
              rightIcon={
                <TouchableOpacity onPress={handleAddNewCode}>
                  <MaterialIcons name="add" size={24} color="#2196F3" />
                </TouchableOpacity>
              }
            />
          </View>

          {[...new Set([...availableCodes, ...selectedCodes])]
            .sort()
            .map(code => (
              <CheckBox
                key={code}
                title={code}
                checked={selectedCodes.includes(code)}
                onPress={() => toggleCodeSelection(code)}
                containerStyle={styles.checkboxContainer}
              />
            ))}

          {availableCodes.length === 0 && (
            <Text style={styles.noCodesText}>No codes available</Text>
          )}
        </ScrollView>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setCodesModalVisible(false)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={() => {
              setFormData({...formData, codes: selectedCodes});
              setCodesModalVisible(false);
            }}>
            <Text style={styles.buttonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderUserModal = () => (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={() => setModalVisible(false)}
      style={styles.modalStyle}>
      <View style={styles.modalContent}>
        <Text h4 style={styles.modalTitle}>
          {modalMode === 'create' ? 'Create New User' : 'Edit User'}
        </Text>
        <ScrollView>
          <Input
            placeholder="Email"
            value={formData.email}
            onChangeText={text => setFormData({...formData, email: text})}
            disabled={modalMode === 'edit'}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {modalMode === 'create' && (
            <Input
              placeholder="Password"
              value={formData.password}
              onChangeText={text => setFormData({...formData, password: text})}
              secureTextEntry
            />
          )}
          <Input
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={text => setFormData({...formData, firstName: text})}
          />
          <Input
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={text => setFormData({...formData, lastName: text})}
          />
          <Input
            placeholder="Company"
            value={formData.company}
            onChangeText={text => setFormData({...formData, company: text})}
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Role</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value: User['role']) =>
                  setFormData({...formData, role: value})
                }>
                <Picker.Item label="User" value="user" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="Bot" value="bot" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.codesButton}
            onPress={() => {
              console.log('Opening codes modal');
              setCodesModalVisible(true);
            }}>
            <Text style={styles.codesButtonText}>
              Select Codes ({formData.codes.length})
            </Text>
            <Text style={styles.codesPreview}>
              {formData.codes.join(', ') || 'No codes selected'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleSubmit}>
              <Text style={styles.buttonText}>
                {modalMode === 'create' ? 'Create' : 'Update'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderItem = ({item}: {item: User}) => (
    <ListItem bottomDivider>
      <CustomAvatar
        firstName={item.firstName}
        lastName={item.lastName}
        size={40}
      />
      <ListItem.Content>
        <ListItem.Title style={styles.userName}>
          {item.firstName} {item.lastName}
        </ListItem.Title>
        <ListItem.Subtitle>{item.email}</ListItem.Subtitle>
        <View style={styles.userDetails}>
          <Text style={styles.detailText}>Company: {item.company}</Text>
          <Text style={styles.detailText}>Role: {item.role}</Text>
          <Text style={styles.detailText}>
            Codes: {item.codes.join(', ') || 'None'}
          </Text>
        </View>
      </ListItem.Content>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditUser(item)}>
          <MaterialIcons name="edit" size={20} color="white" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(item._id)}>
          <MaterialIcons name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ListItem>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <Text>Loading users...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.centerContent}>
                <Text>No users found</Text>
              </View>
            }
          />
          <TouchableOpacity style={styles.fab} onPress={handleCreateUser}>
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}
      {renderUserModal()}
      {renderCodesModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    marginTop: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  modalStyle: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#86939e',
    marginBottom: 5,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingBottom: 20,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  codesScrollView: {
    maxHeight: 400,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 8,
    marginLeft: 0,
    marginRight: 0,
  },
  newCodeContainer: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  codesButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  codesButtonText: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 5,
    fontWeight: '500',
  },
  codesPreview: {
    fontSize: 14,
    color: '#666',
  },
  codesList: {
    marginTop: 10,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedCode: {
    backgroundColor: '#e3f2fd',
  },
  codeText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  noCodesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  addCodeButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 10,
    alignItems: 'center',
  },
  addCodeButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
});
