import React, {useEffect, useState, useContext} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Text, Button, ListItem, Divider} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types';
import {apiService, Item, User} from '../utils/api';
import {AuthContext} from '../AuthContext';
import CustomAvatar from '../components/CustomAvatar';
import PhotoCaptureModal from '../components/PhotoCaptureModal';

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('all');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const {signOut} = useContext(AuthContext);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const profile = await apiService.getUserProfile();
      setUserProfile(profile);

      const fetchedItems = await apiService.getItems();
      setItems(fetchedItems);
      setFilteredItems(fetchedItems);

      // If user is admin, collect all unique codes from items
      if (profile.role === 'admin') {
        const uniqueCodes = Array.from(
          new Set(fetchedItems.map(item => item.code)),
        ).sort();
        setAvailableCodes(uniqueCodes);
      } else {
        // For regular users, use their assigned codes
        setAvailableCodes(profile.codes.sort());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCode === 'all') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => item.code === selectedCode);
      setFilteredItems(filtered);
    }
  }, [selectedCode, items]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  // In MainScreen.tsx, update the approval handling:

  const handleApproveItem = async (photoUri: string) => {
    if (!selectedItemId) return;

    try {
      console.log('Starting approval process for item:', selectedItemId);

      // Update the item status
      await apiService.updateItemApproval(selectedItemId, 'approved', photoUri);

      // Refresh the items list
      await fetchData();

      // Show success message
      Alert.alert('Success', 'Item approved successfully');
    } catch (error) {
      console.error('Error approving item:', error);
      Alert.alert('Error', 'Failed to approve item. Please try again.');
    }
  };

  const renderItem = ({item}: {item: Item}) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})}
        style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Code:</Text>
            <Text style={styles.detailValue}>{item.code}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created:</Text>
            <Text style={styles.detailValue}>{item.creationDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                item.approvalStatus === 'approved' && styles.statusApproved,
                item.approvalStatus === 'rejected' && styles.statusRejected,
                item.approvalStatus === 'pending' && styles.statusPending,
              ]}>
              <Text style={styles.statusText}>
                {item.approvalStatus.charAt(0).toUpperCase() +
                  item.approvalStatus.slice(1)}
              </Text>
            </View>
          </View>

          {item.approvalStatus === 'approved' && item.approvedBy && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Approved by:</Text>
                <Text style={styles.detailValue}>
                  {item.approvedBy.firstName} {item.approvedBy.lastName}
                </Text>
              </View>

              {item.approvalDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{item.approvalDate}</Text>
                </View>
              )}
            </>
          )}

          {item.approvalStatus === 'pending' && (
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => {
                setSelectedItemId(item._id);
                setPhotoModalVisible(true);
              }}>
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.cardContainer}>
          <View style={styles.profileContainer}>
            <CustomAvatar
              firstName={userProfile?.firstName}
              lastName={userProfile?.lastName}
              size={50}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {userProfile
                  ? `${userProfile.firstName} ${userProfile.lastName}`
                  : 'Loading...'}
              </Text>
              <Text style={styles.company}>
                {userProfile?.company || 'Loading...'}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Code Selection Picker */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Selected Code</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedCode}
                onValueChange={itemValue => setSelectedCode(itemValue)}
                style={styles.picker}
                dropdownIconColor="#666">
                <Picker.Item label="All Documents" value="all" />
                {availableCodes.map(code => (
                  <Picker.Item key={code} label={code} value={code} />
                ))}
              </Picker>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Documents</Text>
              <Text style={styles.statValue}>{filteredItems.length}</Text>
            </View>
            {userProfile?.role === 'admin' && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Codes</Text>
                <Text style={styles.statValue}>{availableCodes.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.container}>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.scrollContent}>
            {/* Profile Card and other content... */}

            {/* Documents Section */}
            <View style={styles.documentsContainer}>
              <Text style={styles.sectionTitle}>
                Documents{' '}
                {selectedCode !== 'all' ? `(Code: ${selectedCode})` : '(All)'}
              </Text>
              {loading ? (
                <View style={styles.centerContent}>
                  <Text style={styles.loadingText}>Loading documents...</Text>
                </View>
              ) : filteredItems.length > 0 ? (
                <View style={styles.listContainer}>
                  {filteredItems.map(item => renderItem({item}))}
                </View>
              ) : (
                <View style={styles.centerContent}>
                  <Text style={styles.emptyText}>No documents found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
        {/* Logout Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Logout"
            onPress={handleLogout}
            buttonStyle={styles.logoutButton}
            titleStyle={styles.buttonTitle}
            raised
          />
        </View>
      </ScrollView>
      <PhotoCaptureModal
        isVisible={isPhotoModalVisible}
        onClose={() => {
          setPhotoModalVisible(false);
          setSelectedItemId(null);
        }}
        onConfirm={handleApproveItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Container and Layout
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  documentsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Profile Section
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  company: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    color: '#2196F3',
    fontWeight: 'bold',
  },

  // Picker Styles
  pickerContainer: {
    marginVertical: 8,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        borderRadius: 8,
      },
    }),
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 150,
      },
      android: {
        height: 50,
      },
    }),
  },

  // Item List Styles
  listContainer: {
    width: '100%',
  },
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemContent: {
    padding: 16,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    width: 90,
    color: '#666',
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    color: '#000',
    fontSize: 14,
  },

  // Status Styles
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#e6f4ea',
  },
  statusPending: {
    backgroundColor: '#fff3e0',
  },
  statusRejected: {
    backgroundColor: '#fce8e8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },

  // Button Styles
  buttonContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingVertical: 12,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Utility Styles
  divider: {
    marginVertical: 15,
    backgroundColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },

  // Modal Styles
  modalStyle: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayStyle: {
    backgroundColor: 'white',
    width: '80%',
    maxHeight: '60%',
    borderRadius: 10,
    overflow: 'hidden',
  },

  // Approval Section
  approvalInfoContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#e0e0e0',
  },
});
