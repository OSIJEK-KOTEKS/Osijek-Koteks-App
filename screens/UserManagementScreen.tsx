import React, {useState, useEffect} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {Text, Input, ListItem, CheckBox} from 'react-native-elements';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
import {Picker} from '@react-native-picker/picker';
import axios from 'axios';
import {apiService} from '../utils/api';
import {User, RegistrationData} from '../types';
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
  newPassword?: string;
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
  // State Management
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCodesModalVisible, setCodesModalVisible] = useState(false);
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [newCode, setNewCode] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

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

  // Data Fetching
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);

      // Update available codes
      const uniqueCodes = Array.from(
        new Set(fetchedUsers.flatMap(user => user.codes)),
      ).sort();
      setAvailableCodes(uniqueCodes);
    } catch (error) {
      console.error('Error fetching users:', error);
      let errorMessage = 'Došlo je do greške pri dohvaćanju korisnika.';

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          errorMessage = 'Nemate ovlasti za pregled korisnika.';
        } else if (error.response?.status === 401) {
          errorMessage = 'Niste prijavljeni. Molimo prijavite se ponovno.';
        }
      }

      setError(errorMessage);
      Alert.alert('Greška', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  // User Management Handlers
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
      newPassword: '', // Add this line
    });
    setShowPasswordField(false); // Reset password field visibility
    setModalVisible(true);
  };

  // const handleDeleteUser = async (userId: string) => {
  //   Alert.alert(
  //     'Potvrda brisanja',
  //     'Jeste li sigurni da želite izbrisati ovog korisnika?',
  //     [
  //       {text: 'Odustani', style: 'cancel'},
  //       {
  //         text: 'Izbriši',
  //         style: 'destructive',
  //         onPress: async () => {
  //           try {
  //             await apiService.deleteUser(userId);
  //             await fetchUsers();
  //             Alert.alert('Uspjeh', 'Korisnik uspješno izbrisan');
  //           } catch (error) {
  //             console.error('Error deleting user:', error);
  //             Alert.alert('Greška', 'Greška pri brisanju korisnika');
  //           }
  //         },
  //       },
  //     ],
  //   );
  // };

  // Code Management Handlers
  const handleAddNewCode = () => {
    if (!/^\d{5}$/.test(newCode)) {
      Alert.alert('Neispravan kod', 'Kod mora sadržavati točno 5 znamenki');
      return;
    }

    if (selectedCodes.includes(newCode)) {
      Alert.alert('Duplikat', 'Ovaj kod je već odabran');
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

  // Form Validation and Submission
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
        const registrationData: RegistrationData = {
          email: formData.email,
          password: formData.password!,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          role: formData.role,
          codes: formData.codes,
        };

        await apiService.createUser(registrationData);
      } else if (selectedUser?._id) {
        const {password, newPassword, _id, ...updateData} = formData;
        await apiService.updateUser(selectedUser._id, updateData);

        // Handle password update if new password is provided
        if (newPassword) {
          await apiService.updateUserPassword(selectedUser._id, newPassword);
        }
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

  // Privacy and Data Management
  const handleDataExport = async (user: User) => {
    try {
      const exportData: DataExportFormat = {
        personalData: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          company: user.company,
          role: user.role,
        },
        activityData: {
          lastLogin: new Date().toISOString(),
          documentsProcessed: 0,
          lastActivity: new Date().toISOString(),
        },
        accessHistory: [
          {
            date: new Date().toISOString(),
            action: 'Data Export',
            details: 'User requested data export',
          },
        ],
      };

      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: `Korisnički podaci - ${user.firstName} ${user.lastName}`,
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      Alert.alert('Greška', 'Greška pri izvozu podataka');
    }
  };
  const handlePasswordUpdate = async () => {
    if (!selectedUser?._id || !formData.newPassword) return;

    if (formData.newPassword.length < 6) {
      Alert.alert('Greška', 'Lozinka mora imati najmanje 6 znakova');
      return;
    }

    try {
      await apiService.updateUserPassword(
        selectedUser._id,
        formData.newPassword,
      );
      Alert.alert('Uspjeh', 'Lozinka je uspješno promijenjena');
      setFormData({...formData, newPassword: ''});
      setShowPasswordField(false);
    } catch (error) {
      console.error('Error updating password:', error);
      Alert.alert('Greška', 'Greška pri promjeni lozinke');
    }
  };

  // const handleDataDeletion = async (userId: string) => {
  //   Alert.alert(
  //     'Brisanje podataka',
  //     'Ova akcija će trajno izbrisati sve korisničke podatke. Želite li nastaviti?',
  //     [
  //       {text: 'Odustani', style: 'cancel'},
  //       {
  //         text: 'Izbriši',
  //         style: 'destructive',
  //         onPress: async () => {
  //           try {
  //             await apiService.deleteUser(userId);
  //             await fetchUsers();
  //             Alert.alert('Uspjeh', 'Korisnički podaci uspješno izbrisani');
  //           } catch (error) {
  //             console.error('Error deleting user:', error);
  //             Alert.alert('Greška', 'Greška pri brisanju podataka');
  //           }
  //         },
  //       },
  //     ],
  //   );
  // };

  const showPrivacySettings = (user: User) => {
    setSelectedUser(user);
    setPrivacyModalVisible(true);
  };

  // Render Methods
  const renderItem = ({item}: {item: User}) => (
    <ListItem bottomDivider>
      <CustomAvatar
        firstName={item.firstName}
        lastName={item.lastName}
        size={40}
      />
      <ListItem.Content>
        <ListItem.Title>
          {item.firstName} {item.lastName}
        </ListItem.Title>
        <ListItem.Subtitle>{item.email}</ListItem.Subtitle>
        <View>
          <Text>Firma: {item.company}</Text>
          <Text>Uloga: {item.role}</Text>
          <Text>Radni nalozi: {item.codes.join(', ') || 'Nema'}</Text>
        </View>
      </ListItem.Content>
      <View>
        <TouchableOpacity onPress={() => showPrivacySettings(item)}>
          <MaterialIcons name="security" size={24} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleEditUser(item)}>
          <MaterialIcons name="edit" size={24} color="#2196F3" />
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={() => handleDeleteUser(item._id)}>
          <MaterialIcons name="delete" size={24} color="#f44336" />
        </TouchableOpacity> */}
      </View>
    </ListItem>
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Učitavanje korisnika...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <MaterialIcons name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
            <Text style={styles.retryButtonText}>Pokušaj ponovno</Text>
          </TouchableOpacity>
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
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>Nema pronađenih korisnika</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.fab} onPress={handleCreateUser}>
            <MaterialIcons name="add" size={28} color="white" />
          </TouchableOpacity>

          {/* User Create/Edit Modal */}
          <Modal
            isVisible={isModalVisible}
            onBackdropPress={() => setModalVisible(false)}
            style={styles.modal}>
            <View style={styles.modalContent}>
              <Text h4 style={styles.modalTitle}>
                {modalMode === 'create'
                  ? 'Kreiraj korisnika'
                  : 'Uredi korisnika'}
              </Text>
              <ScrollView style={styles.modalScrollView}>
                <Input
                  placeholder="Email"
                  value={formData.email}
                  onChangeText={text => setFormData({...formData, email: text})}
                  disabled={modalMode === 'edit'}
                  containerStyle={styles.inputContainer}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {modalMode === 'create' && (
                  <Input
                    placeholder="Lozinka"
                    value={formData.password}
                    onChangeText={text =>
                      setFormData({...formData, password: text})
                    }
                    secureTextEntry
                    containerStyle={styles.inputContainer}
                  />
                )}
                {modalMode === 'edit' && (
                  <View style={styles.passwordSection}>
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPasswordField(!showPasswordField)}>
                      <MaterialIcons
                        name={
                          showPasswordField ? 'visibility-off' : 'visibility'
                        }
                        size={24}
                        color="#2196F3"
                      />
                      <Text style={styles.passwordToggleText}>
                        {showPasswordField
                          ? 'Sakrij promjenu lozinke'
                          : 'Promijeni lozinku'}
                      </Text>
                    </TouchableOpacity>

                    {showPasswordField && (
                      <View>
                        <Input
                          placeholder="Nova lozinka"
                          value={formData.newPassword}
                          onChangeText={text =>
                            setFormData({...formData, newPassword: text})
                          }
                          secureTextEntry
                          containerStyle={styles.inputContainer}
                          rightIcon={
                            <TouchableOpacity
                              onPress={handlePasswordUpdate}
                              style={styles.updatePasswordButton}>
                              <Text style={styles.updatePasswordButtonText}>
                                Spremi lozinku
                              </Text>
                            </TouchableOpacity>
                          }
                        />
                      </View>
                    )}
                  </View>
                )}
                <Input
                  placeholder="Ime"
                  value={formData.firstName}
                  onChangeText={text =>
                    setFormData({...formData, firstName: text})
                  }
                  containerStyle={styles.inputContainer}
                />
                <Input
                  placeholder="Prezime"
                  value={formData.lastName}
                  onChangeText={text =>
                    setFormData({...formData, lastName: text})
                  }
                  containerStyle={styles.inputContainer}
                />
                <Input
                  placeholder="Firma"
                  value={formData.company}
                  onChangeText={text =>
                    setFormData({...formData, company: text})
                  }
                  containerStyle={styles.inputContainer}
                />

                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Tip korisnika</Text>
                  {Platform.OS === 'ios' ? (
                    <Picker
                      selectedValue={formData.role}
                      onValueChange={value =>
                        setFormData({...formData, role: value as User['role']})
                      }
                      style={styles.picker}
                      itemStyle={styles.pickerItem}>
                      <Picker.Item label="Korisnik" value="user" />
                      <Picker.Item label="Administrator" value="admin" />
                      <Picker.Item label="Bot" value="bot" />
                    </Picker>
                  ) : (
                    <View style={styles.androidPickerContainer}>
                      <Picker
                        selectedValue={formData.role}
                        onValueChange={value =>
                          setFormData({
                            ...formData,
                            role: value as User['role'],
                          })
                        }
                        style={styles.androidPicker}>
                        <Picker.Item label="Korisnik" value="user" />
                        <Picker.Item label="Administrator" value="admin" />
                        <Picker.Item label="Bot" value="bot" />
                      </Picker>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.codesButton}
                  onPress={() => setCodesModalVisible(true)}>
                  <Text style={styles.codesButtonText}>
                    Odabir RN ({formData.codes.length})
                  </Text>
                  <Text style={styles.codesPreview}>
                    {formData.codes.join(', ') || 'Nije odabran RN'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

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
            </View>
          </Modal>

          {/* Codes Selection Modal */}
          <Modal
            isVisible={isCodesModalVisible}
            onBackdropPress={() => setCodesModalVisible(false)}
            style={styles.modal}>
            <View style={styles.modalContent}>
              <Text h4 style={styles.modalTitle}>
                Odabir radnih naloga
              </Text>
              <View style={styles.newCodeContainer}>
                <Input
                  placeholder="Dodaj novi RN (5 brojeva)"
                  value={newCode}
                  onChangeText={setNewCode}
                  keyboardType="numeric"
                  maxLength={5}
                  containerStyle={styles.inputContainer}
                  rightIcon={
                    <TouchableOpacity onPress={handleAddNewCode}>
                      <MaterialIcons name="add" size={24} color="#2196F3" />
                    </TouchableOpacity>
                  }
                />
              </View>
              <ScrollView style={styles.codesScrollView}>
                {[...new Set([...availableCodes, ...selectedCodes])]
                  .sort()
                  .map(code => (
                    <CheckBox
                      key={code}
                      title={code}
                      checked={selectedCodes.includes(code)}
                      onPress={() => toggleCodeSelection(code)}
                      containerStyle={styles.checkboxContainer}
                      textStyle={styles.checkboxText}
                    />
                  ))}
                {availableCodes.length === 0 && (
                  <Text style={styles.noCodesText}>
                    Nema dostupnih radnih naloga
                  </Text>
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

          {/* Privacy Settings Modal */}
          <Modal
            isVisible={isPrivacyModalVisible}
            onBackdropPress={() => setPrivacyModalVisible(false)}
            style={styles.modal}>
            <View style={styles.modalContent}>
              <Text h4 style={styles.modalTitle}>
                Postavke privatnosti
              </Text>
              <Text style={styles.privacyHeader}>
                Upravljanje podacima korisnika: {selectedUser?.firstName}{' '}
                {selectedUser?.lastName}
              </Text>
              <ScrollView style={styles.privacyScrollView}>
                <TouchableOpacity
                  style={styles.privacyButton}
                  onPress={() =>
                    selectedUser && handleDataExport(selectedUser)
                  }>
                  <MaterialIcons name="download" size={24} color="#2196F3" />
                  <Text style={styles.privacyButtonText}>
                    Izvezi sve podatke
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity
                  style={[styles.privacyButton, styles.deleteButton]}
                  onPress={() =>
                    selectedUser && handleDataDeletion(selectedUser._id)
                  }>
                  <MaterialIcons
                    name="delete-forever"
                    size={24}
                    color="#f44336"
                  />
                  <Text style={[styles.privacyButtonText, styles.deleteText]}>
                    Izbriši sve podatke
                  </Text>
                </TouchableOpacity> */}

                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyInfoHeader}>
                    Informacije o pravima:
                  </Text>
                  <Text style={styles.privacyInfoText}>
                    • Pravo na pristup podacima{'\n'}• Pravo na brisanje
                    podataka
                    {'\n'}• Pravo na prijenos podataka{'\n'}• Pravo na ispravak
                    podataka{'\n'}• Pravo na ograničenje obrade
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
        </>
      )}
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalScrollView: {
    flexGrow: 0,
    maxHeight: '80%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 80, // Space for FAB
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
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
  deleteText: {
    color: '#f44336',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  picker: {
    height: 50,
    backgroundColor: '#f9f9f9',
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
  codesScrollView: {
    maxHeight: 400,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    margin: 0,
    padding: 8,
  },
  checkboxText: {
    fontSize: 16,
    color: '#333',
  },
  newCodeContainer: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  noCodesText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  // Privacy Modal Styles
  privacyScrollView: {
    maxHeight: '60%',
  },
  privacyHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
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
    color: '#333',
  },
  privacyInfoText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  pickerContainer: {
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  pickerLabel: {
    fontSize: 16,
    color: '#86939e',
    marginBottom: 5,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  pickerItem: {
    fontSize: 16,
    color: '#000000',
    height: 120, // iOS picker item height
  },
  androidPickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  androidPicker: {
    height: 50,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 16,
  },
  passwordSection: {
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  passwordToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  passwordToggleText: {
    marginLeft: 8,
    color: '#2196F3',
    fontSize: 16,
  },
  updatePasswordButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  updatePasswordButtonText: {
    color: 'white',
    fontSize: 14,
  },
});
