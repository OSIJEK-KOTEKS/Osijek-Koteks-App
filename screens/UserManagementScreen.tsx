import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {Text, Input, ListItem, CheckBox} from 'react-native-elements';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import {Picker} from '@react-native-picker/picker';
import axios from 'axios';
import {apiService, User, RegistrationData} from '../utils/api';
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

interface DataExportFormat {
  personalData: {
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    role: string;
  };
  activityData: {
    lastLogin?: string;
    documentsProcessed?: number;
    lastActivity?: string;
  };
  accessHistory: Array<{
    date: string;
    action: string;
    details: string;
  }>;
}

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCodesModalVisible, setCodesModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
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
      Alert.alert('Greška', 'Greška pri dohvaćanju kodova');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Greška', 'Greška pri dohvaćanju korisnika');
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async (user: User) => {
    try {
      // Format user data according to GDPR requirements
      const exportData: DataExportFormat = {
        personalData: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          role: user.role,
        },
        activityData: {
          // Add relevant activity data
          lastLogin: new Date().toISOString(), // Replace with actual last login
          documentsProcessed: 0, // Replace with actual count
          lastActivity: new Date().toISOString(), // Replace with actual last activity
        },
        accessHistory: [
          // Add relevant access history
          {
            date: new Date().toISOString(),
            action: 'Data Export',
            details: 'User requested data export',
          },
        ],
      };

      const exportString = JSON.stringify(exportData, null, 2);

      try {
        await Share.share({
          message: exportString,
          title: `Korisnički podaci - ${user.firstName} ${user.lastName}`,
        });
      } catch (error) {
        console.error('Error sharing data:', error);
        Alert.alert('Greška', 'Nije moguće podijeliti podatke');
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
      Alert.alert('Greška', 'Greška pri izvozu podataka');
    }
  };

  const handleDataDeletion = async (userId: string) => {
    Alert.alert(
      'Brisanje podataka',
      'Ova akcija će trajno izbrisati sve korisničke podatke i ne može se poništiti. Želite li nastaviti?',
      [
        {
          text: 'Odustani',
          style: 'cancel',
        },
        {
          text: 'Izbriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteUser(userId);
              await fetchUsers(); // Refresh the list
              Alert.alert(
                'Uspjeh',
                'Korisnički podaci su uspješno i trajno izbrisani.',
              );
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert(
                'Greška',
                'Došlo je do greške prilikom brisanja podataka',
              );
            }
          },
        },
      ],
    );
  };

  const showPrivacySettings = (user: User) => {
    setSelectedUser(user);
    setPrivacyModalVisible(true);
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
      Alert.alert('Greška', 'Email je obavezan');
      return false;
    }
    if (modalMode === 'create' && !formData.password?.trim()) {
      Alert.alert('Greška', 'Lozinka je obavezna za nove korisnike');
      return false;
    }
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      Alert.alert('Greška', 'Ime i prezime su obavezni');
      return false;
    }
    if (!formData.company?.trim()) {
      Alert.alert('Greška', 'Firma je obavezna');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        if (!formData.password) {
          Alert.alert('Greška', 'Lozinka je obavezna za nove korisnike');
          return;
        }

        const registrationData: RegistrationData = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          role: formData.role,
          codes: formData.codes,
        };

        await apiService.createUser(registrationData);
      } else if (selectedUser?._id) {
        const {password, _id, ...updateData} = formData;
        await apiService.updateUser(selectedUser._id, updateData);
      }

      setModalVisible(false);
      await fetchUsers();
      Alert.alert(
        'Uspjeh',
        `Korisnik uspješno ${modalMode === 'create' ? 'kreiran' : 'ažuriran'}`,
      );
    } catch (error) {
      console.error('Error submitting user:', error);
      let errorMessage = 'Došlo je do greške prilikom spremanja korisnika.';

      if (axios.isAxiosError(error) && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      Alert.alert('Greška', errorMessage);
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
          Odabir radnih naloga
        </Text>
        <ScrollView style={styles.codesScrollView}>
          <View style={styles.newCodeContainer}>
            <Input
              placeholder="Dodaj novi RN (5 brojeva)"
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
            <Text style={styles.buttonText}>Odustani</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={() => {
              setFormData({...formData, codes: selectedCodes});
              setCodesModalVisible(false);
            }}>
            <Text style={styles.buttonText}>Primjeni</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderUserPrivacyModal = () => (
    <Modal
      isVisible={isPrivacyModalVisible}
      onBackdropPress={() => setPrivacyModalVisible(false)}
      style={styles.modal}>
      <View style={styles.modalContent}>
        <Text h4 style={styles.modalTitle}>
          Postavke privatnosti
        </Text>
        <ScrollView>
          <Text style={styles.privacyHeader}>
            Upravljanje podacima korisnika: {selectedUser?.firstName}{' '}
            {selectedUser?.lastName}
          </Text>

          <TouchableOpacity
            style={styles.privacyButton}
            onPress={() => selectedUser && handleDataExport(selectedUser)}>
            <MaterialIcons name="download" size={24} color="#2196F3" />
            <Text style={styles.privacyButtonText}>Izvezi sve podatke</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.privacyButton, styles.deleteButton]}
            onPress={() =>
              selectedUser && handleDataDeletion(selectedUser._id)
            }>
            <MaterialIcons name="delete-forever" size={24} color="#f44336" />
            <Text style={[styles.privacyButtonText, styles.deleteText]}>
              Izbriši sve podatke
            </Text>
          </TouchableOpacity>

          <View style={styles.privacyInfo}>
            <Text style={styles.privacyInfoHeader}>Informacije o pravima:</Text>
            <Text style={styles.privacyInfoText}>
              • Pravo na pristup podacima{'\n'}• Pravo na brisanje podataka
              {'\n'}• Pravo na prijenos podataka{'\n'}• Pravo na ispravak
              podataka
              {'\n'}• Pravo na ograničenje obrade
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setPrivacyModalVisible(false)}>
          <Text style={styles.closeButtonText}>Zatvori</Text>
        </TouchableOpacity>
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
          <Text style={styles.detailText}>Firma: {item.company}</Text>
          <Text style={styles.detailText}>Uloga: {item.role}</Text>
          <Text style={styles.detailText}>
            Radni nalozi: {item.codes.join(', ') || 'Nema'}
          </Text>
        </View>
      </ListItem.Content>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.privacyButton]}
          onPress={() => showPrivacySettings(item)}>
          <MaterialIcons name="security" size={20} color="white" />
          <Text style={styles.actionButtonText}>Privatnost</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditUser(item)}>
          <MaterialIcons name="edit" size={20} color="white" />
          <Text style={styles.actionButtonText}>Uredi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(item._id)}>
          <MaterialIcons name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Obriši</Text>
        </TouchableOpacity>
      </View>
    </ListItem>
  );
  const renderUserModal = () => (
    <Modal
      isVisible={isModalVisible}
      onBackdropPress={() => setModalVisible(false)}
      style={styles.modal}>
      <View style={styles.modalContent}>
        <Text h4 style={styles.modalTitle}>
          {modalMode === 'create'
            ? 'Kreiraj novog korisnika'
            : 'Ažuriraj korisnika'}
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
              placeholder="Lozinka"
              value={formData.password}
              onChangeText={text => setFormData({...formData, password: text})}
              secureTextEntry
            />
          )}
          <Input
            placeholder="Ime"
            value={formData.firstName}
            onChangeText={text => setFormData({...formData, firstName: text})}
          />
          <Input
            placeholder="Prezime"
            value={formData.lastName}
            onChangeText={text => setFormData({...formData, lastName: text})}
          />
          <Input
            placeholder="Firma"
            value={formData.company}
            onChangeText={text => setFormData({...formData, company: text})}
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tip korisnika</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value: User['role']) =>
                  setFormData({...formData, role: value})
                }>
                <Picker.Item label="Korisnik" value="user" />
                <Picker.Item label="Administrator" value="admin" />
                <Picker.Item label="Bot" value="bot" />
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.codesButton}
            onPress={() => {
              setCodesModalVisible(true);
            }}>
            <Text style={styles.codesButtonText}>
              Odabir RN ({formData.codes.length})
            </Text>
            <Text style={styles.codesPreview}>
              {formData.codes.join(', ') || 'Nije odabran RN'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleSubmit}>
              <Text style={styles.buttonText}>
                {modalMode === 'create' ? 'Kreiraj' : 'Ažuriraj'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text>Učitavanje korisnika...</Text>
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
                <Text>Nema pronađenih korisnika</Text>
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
      {renderUserPrivacyModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modal: {
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
  privacyButton: {
    backgroundColor: '#e3f2fd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  privacyButtonText: {
    color: '#2196F3',
    fontSize: 16,
    marginLeft: 10,
  },
  deleteText: {
    color: '#f44336',
  },
  privacyInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  privacyInfoHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  privacyInfoText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#666',
  },
  privacyHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noCodesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
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
