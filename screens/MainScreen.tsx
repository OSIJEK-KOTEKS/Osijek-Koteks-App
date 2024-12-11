import React, {useEffect, useState, useContext, useCallback} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Image,
} from 'react-native';
import {Text, Button, Divider} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import {GestureHandlerRootView, Swipeable} from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {StackNavigationProp} from '@react-navigation/stack';
import {apiService, getImageUrl} from '../utils/api';
import {
  User,
  Item,
  LocationData,
  RootStackParamList,
  AdminTabParamList,
} from '../types';
import {AuthContext} from '../AuthContext';
import CustomAvatar from '../components/CustomAvatar';
import PhotoCaptureModal from '../components/PhotoCaptureModal';
import {CreateItemModal} from '../components/CreateItemModal';
import LocationDetailView from '../components/LocationDetailView';
import DateRangeFilters from '../components/DateRangeFilters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileMenu from '../components/ProfileMenu';

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

class ErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean}
> {
  state = {hasError: false};

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: Error) {
    console.error('Error caught by boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <Button
            title="Try Again"
            onPress={() => this.setState({hasError: false})}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('all');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const {signOut} = useContext(AuthContext);
  const [dateRange, setDateRange] = useState<string>('7days');
  const [sortOrder, setSortOrder] = useState<string>('date-desc');
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);

  const getDateFromString = (dateStr: string) => {
    const [day, month, year] = dateStr.split('.');
    return new Date(`${year}-${month}-${day}`);
  };

  const getFilteredItems = useCallback(
    (
      items: Item[],
      selectedCode: string,
      dateRange: string,
      sortOrder: string,
    ) => {
      let filtered = [...items];

      // Date range filter
      if (dateRange !== 'all') {
        const today = new Date();
        const daysToSubtract = dateRange === '7days' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(today.getDate() - daysToSubtract);

        filtered = filtered.filter(item => {
          const [day, month, year] = item.creationDate.split('.');
          const itemDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
          );
          return itemDate >= startDate;
        });
      }

      // Code filter
      if (selectedCode !== 'all') {
        filtered = filtered.filter(item => item.code === selectedCode);
      }

      // Sorting
      filtered.sort((a, b) => {
        // First handle approval status sorting
        if (sortOrder === 'approved-first') {
          if (
            a.approvalStatus === 'odobreno' &&
            b.approvalStatus !== 'odobreno'
          )
            return -1;
          if (
            a.approvalStatus !== 'odobreno' &&
            b.approvalStatus === 'odobreno'
          )
            return 1;
        } else if (sortOrder === 'pending-first') {
          if (
            a.approvalStatus === 'na čekanju' &&
            b.approvalStatus !== 'na čekanju'
          )
            return -1;
          if (
            a.approvalStatus !== 'na čekanju' &&
            b.approvalStatus === 'na čekanju'
          )
            return 1;
        }

        // If approval status is the same or not sorting by approval, sort by date
        const [dayA, monthA, yearA] = a.creationDate.split('.');
        const [dayB, monthB, yearB] = b.creationDate.split('.');

        const dateA = new Date(Number(yearA), Number(monthA) - 1, Number(dayA));
        const dateB = new Date(Number(yearB), Number(monthB) - 1, Number(dayB));

        // For approval status sorting, use date as secondary sort
        if (sortOrder === 'approved-first' || sortOrder === 'pending-first') {
          return dateB.getTime() - dateA.getTime(); // Newer first as secondary sort
        }

        // For date-based sorting
        return sortOrder === 'date-desc'
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();
      });

      return filtered;
    },
    [],
  );
  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();

    return () => {
      setItems([]);
      setFilteredItems([]);
      setUserProfile(null);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await apiService.getUserProfile();
      setUserProfile(profile);

      const fetchedItems = await apiService.getItems();
      setItems(fetchedItems);
      setFilteredItems(fetchedItems);

      if (profile.role === 'admin') {
        const uniqueCodes = Array.from(
          new Set(fetchedItems.map(item => item.code)),
        ).sort();
        setAvailableCodes(uniqueCodes);
      } else {
        setAvailableCodes(profile.codes.sort());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert(
        'Error',
        'Učitavanje podataka nije uspjelo. Provjerite vezu i pokušajte ponovo.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!items.length) return;

    const filtered = getFilteredItems(
      items,
      selectedCode,
      dateRange,
      sortOrder,
    );
    setFilteredItems(filtered);
  }, [items, selectedCode, dateRange, sortOrder, getFilteredItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleLogout = useCallback(async () => {
    try {
      await apiService.logout();
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Greška kod odjave. Pokušajte ponovno');
    }
  }, [signOut]);

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      'Potvrda brisanja',
      'Jeste li sigurni da želite obrisati ovaj dokument?',
      [
        {
          text: 'Odustani',
          style: 'cancel',
        },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteItem(itemId);
              await fetchData(); // Refresh the list after deletion
              Alert.alert('Uspjeh', 'Dokument je uspješno izbrisan');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Greška', 'Greška prilikom brisanja dokumenta');
            }
          },
        },
      ],
    );
  };

  const handleApproveItem = useCallback(
    async (photoUri: string, locationData: LocationData) => {
      if (!selectedItemId) return;

      try {
        await apiService.updateItemApproval(
          selectedItemId,
          'odobreno',
          photoUri,
          locationData,
        );
        await fetchData();
        Alert.alert('Success', 'Dokument uspješno odobren');
      } catch (error) {
        console.error('Error approving item:', error);
        Alert.alert('Error', 'Greška kod ovjere dokumenta. Pokušajte ponovno');
      } finally {
        setPhotoModalVisible(false);
        setSelectedItemId(null);
      }
    },
    [selectedItemId, fetchData],
  );

  const renderItem = useCallback(
    ({item}: {item: Item}) => {
      const renderRightActions = () => {
        if (item.approvalStatus === 'odobreno' && item.approvalLocation) {
          return (
            <View style={styles.rightActionContainer}>
              <LocationDetailView
                location={item.approvalLocation}
                approvalDate={item.approvalDate}
              />
            </View>
          );
        }
        return null;
      };

      return (
        <Swipeable
          renderRightActions={renderRightActions}
          overshootRight={false}
          rightThreshold={40}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})
            }>
            <View style={styles.itemContainer}>
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Radni Nalog:</Text>
                    <Text style={styles.detailValue}>{item.code}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Kreiran:</Text>
                    <Text style={styles.detailValue}>{item.creationDate}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.approvalStatus === 'odobreno' &&
                          styles.statusApproved,
                        item.approvalStatus === 'odbijen' &&
                          styles.statusRejected,
                        item.approvalStatus === 'na čekanju' &&
                          styles.statusPending,
                      ]}>
                      <Text style={styles.statusText}>
                        {item.approvalStatus.charAt(0).toUpperCase() +
                          item.approvalStatus.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {item.approvalStatus === 'odobreno' && item.approvedBy && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Potvrdio:</Text>
                        <Text style={styles.detailValue}>
                          {item.approvedBy.firstName} {item.approvedBy.lastName}
                        </Text>
                      </View>

                      {item.approvalDate && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Datum:</Text>
                          <Text style={styles.detailValue}>
                            {item.approvalDate}
                          </Text>
                        </View>
                      )}

                      {item.approvalPhoto?.url && userToken && (
                        <TouchableOpacity
                          style={styles.photoPreviewContainer}
                          onPress={() =>
                            navigation.navigate('PhotoViewer', {
                              photoUrl: item.approvalPhoto!.url!,
                            })
                          }>
                          <View style={styles.previewImageWrapper}>
                            <Image
                              source={{
                                uri: getImageUrl(item.approvalPhoto.url),
                                headers: {
                                  Authorization: `Bearer ${userToken}`,
                                },
                                cache: 'reload',
                              }}
                              style={styles.photoPreview}
                              resizeMode="cover"
                              resizeMethod="resize"
                              progressiveRenderingEnabled={false}
                              fadeDuration={0}
                            />
                          </View>
                          <Text style={styles.viewPhotoText}>
                            Pogledaj sliku
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {item.approvalStatus === 'na čekanju' && (
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => {
                        setSelectedItemId(item._id);
                        setPhotoModalVisible(true);
                      }}>
                      <Text style={styles.approveButtonText}>Odobri</Text>
                    </TouchableOpacity>
                  )}

                  {userProfile?.role === 'admin' && (
                    <TouchableOpacity
                      style={[styles.approveButton, styles.deleteButton]}
                      onPress={() => handleDeleteItem(item._id)}>
                      <Text style={styles.approveButtonText}>Obriši</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Swipeable>
      );
    },
    [navigation, userToken, userProfile],
  );

  const ListHeaderComponent = useCallback(() => {
    return (
      <>
        <View style={styles.cardContainer}>
          <TouchableOpacity
            style={styles.profileContainer}
            onPress={() => setProfileMenuVisible(true)}>
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
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color="#666"
              style={styles.arrowIcon}
            />
          </TouchableOpacity>

          <ProfileMenu
            isVisible={isProfileMenuVisible}
            onClose={() => setProfileMenuVisible(false)}
            onLogout={handleLogout}
            userName={
              userProfile
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : ''
            }
            userEmail={userProfile?.email}
          />

          <Divider style={styles.divider} />

          <DateRangeFilters
            selectedRange={dateRange}
            onRangeChange={setDateRange}
            selectedCode={selectedCode}
            onCodeChange={setSelectedCode}
            availableCodes={availableCodes}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
          />

          <Divider style={styles.divider} />

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Dokumenti</Text>
              <Text style={styles.statValue}>{filteredItems.length}</Text>
            </View>
            {userProfile?.role === 'admin' && (
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>RN kojima imam pristup</Text>
                <Text style={styles.statValue}>{availableCodes.length}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.documentsContainer}>
          <View style={styles.documentHeader}>
            <Text style={styles.sectionTitle}>
              {dateRange === '7days'
                ? 'Zadnjih 7 dana'
                : dateRange === '30days'
                ? 'Zadnjih 30 dana'
                : 'Svi dokumenti'}{' '}
              {selectedCode !== 'all' ? `(${selectedCode})` : ''}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}>
              <MaterialIcons
                name="refresh"
                size={24}
                color="#2196F3"
                style={[
                  styles.refreshIcon,
                  refreshing && styles.refreshIconSpinning,
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }, [
    userProfile,
    selectedCode,
    availableCodes,
    dateRange,
    sortOrder,
    filteredItems.length,
    isProfileMenuVisible,
    handleLogout,
    refreshing,
    onRefresh,
  ]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerContent}>
                <Text style={styles.loadingText}>Učitavam dokumente...</Text>
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>Nema dokumenata</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={
            <View style={styles.buttonContainer}>
              <Button
                title="Odjava"
                onPress={handleLogout}
                buttonStyle={styles.logoutButton}
                titleStyle={styles.buttonTitle}
              />
            </View>
          }
          contentContainerStyle={styles.listContentContainer}
        />

        {(userProfile?.role === 'admin' || userProfile?.role === 'bot') && (
          <TouchableOpacity
            style={[styles.fab, styles.addItemFab]}
            onPress={() => setCreateModalVisible(true)}>
            <MaterialIcons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}

        <PhotoCaptureModal
          isVisible={isPhotoModalVisible}
          onClose={() => {
            setPhotoModalVisible(false);
            setSelectedItemId(null);
          }}
          onConfirm={handleApproveItem}
        />

        <CreateItemModal
          isVisible={isCreateModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={fetchData}
        />
      </View>
    </GestureHandlerRootView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
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
  itemContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
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
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
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
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  photoPreviewContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  viewPhotoText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
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
  addItemFab: {
    bottom: 80,
    right: 16,
  },
  rightActionContainer: {
    backgroundColor: '#f5f5f5',
    width: Dimensions.get('window').width * 0.8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  swipeableContainer: {
    backgroundColor: '#f5f5f5',
  },
  locationContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  imageError: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  imageErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  // Additional styles for swipe actions
  swipeActionContainer: {
    width: Dimensions.get('window').width * 0.8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  swipeActionContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    width: '95%',
  },
  swipeActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  coordinatesContainer: {
    marginVertical: 8,
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  coordinateLabel: {
    color: '#666',
    fontSize: 14,
  },
  coordinateValue: {
    color: '#000',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
    }),
  },
  timestampText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  filterContainer: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  filterDivider: {
    marginVertical: 12,
    backgroundColor: '#E0E0E0',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    position: 'relative',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  arrowIcon: {
    position: 'absolute',
    right: 15,
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
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    marginLeft: 8, // Add some space if there are other buttons
  },
  refreshIcon: {
    transform: [{rotate: '0deg'}],
  },
  refreshIconSpinning: {
    transform: [{rotate: '360deg'}],
    opacity: 0.5,
  },
});

export const MainScreenWithErrorBoundary: React.FC<MainScreenProps> = props => (
  <ErrorBoundary>
    <MainScreen {...props} />
  </ErrorBoundary>
);

export default MainScreenWithErrorBoundary;
