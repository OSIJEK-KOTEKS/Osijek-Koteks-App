import React, {
  useEffect,
  useState,
  useContext,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
} from 'react-native';
import {Divider} from 'react-native-elements';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {StackNavigationProp} from '@react-navigation/stack';
import {apiService} from '../utils/api';
import {User, Item, LocationData, RootStackParamList} from '../types';
import {AuthContext} from '../AuthContext';
import ItemCard from '../components/ItemCard';
import CustomAvatar from '../components//CustomAvatar';
import PhotoCaptureModal from '../components//PhotoCaptureModal';
import {CreateItemModal} from '../components/CreateItemModal';
import DateRangeFilters from '../components/DateRangeFilters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileMenu from '../components/ProfileMenu';

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

// Error Boundary Component
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
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => this.setState({hasError: false})}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Main Screen Component
export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  // State Management
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('all');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sortOrder, setSortOrder] = useState<string>('date-desc');
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState<number>(0);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const loadingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const onEndReachedCalledDuringMomentum = useRef(false);
  const isLoadingRef = useRef(false);

  // Context
  const {signOut} = useContext(AuthContext);

  // Date Range Filter Helper
  const getDateFilter = useCallback((date: Date) => {
    // Create exact start and end of the selected day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString(),
    };
  }, []);
  // Token Effect
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
      setUserProfile(null);
    };
  }, []);

  // Data Fetching
  const fetchData = useCallback(
    async (resetItems: boolean = true) => {
      if (loadingRef.current && !resetItems) return;
      loadingRef.current = true;

      try {
        // Get the correct page number
        const currentPage = resetItems ? 1 : page;
        console.log(
          'Fetching data for page:',
          currentPage,
          'reset:',
          resetItems,
        );

        if (resetItems) {
          setLoading(true);
          setPage(1);
        }

        const profile = await apiService.getUserProfile();
        setUserProfile(profile);

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const filters = {
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          ...(selectedCode !== 'all' && {code: selectedCode}),
          sortOrder: sortOrder,
        };

        console.log('Fetching items for page:', currentPage, filters);

        const response = await apiService.getItems(currentPage, 10, filters);

        console.log('API Response:', {
          pageReceived: response.pagination.page,
          itemsReceived: response.items.length,
          totalItems: response.pagination.total,
          hasMore: response.pagination.hasMore,
        });

        // Handle items based on whether we're resetting or adding more
        if (resetItems) {
          setItems(response.items);
        } else {
          setItems(prev => {
            const existingIds = new Set(prev.map(item => item._id));
            const newItems = response.items.filter(
              item => !existingIds.has(item._id),
            );
            return [...prev, ...newItems];
          });
        }

        setTotalDocuments(response.pagination.total);
        setHasMore(response.pagination.hasMore);

        if (profile.role === 'admin') {
          const codes = Array.from(
            new Set(response.items.map(item => item.code)),
          ).sort();
          setAvailableCodes(codes);
        } else {
          setAvailableCodes(profile.codes.sort());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert(
          'Error',
          'Učitavanje podataka nije uspjelo. Provjerite vezu i pokušajte ponovo.',
        );
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [page, selectedDate, selectedCode, sortOrder],
  );
  // Update the effect that watches for page changes
  useEffect(() => {
    if (page > 1) {
      console.log('Page changed, fetching more items for page:', page);
      fetchData(false);
    }
  }, [page, fetchData]);

  useEffect(() => {
    // Only fetch if we have a valid date
    if (selectedDate) {
      fetchData(true); // true to reset the items list
    }
  }, [selectedDate, fetchData]);
  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    // Note: We don't need to call fetchData here because the useEffect will handle it
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setItems([]);
    fetchData(true);
  }, [selectedDate, selectedCode, sortOrder]);

  // Load more data when page changes
  useEffect(() => {
    if (page > 1) {
      fetchData(false);
    }
  }, [page]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loading || loadingRef.current) {
      console.log('Load more blocked:', {
        hasMore,
        isLoadingMore,
        loading,
        loadingRef: loadingRef.current,
      });
      return;
    }

    console.log('Triggering load more, current page:', page);
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
  }, [hasMore, isLoadingMore, loading, page]);

  useEffect(() => {
    if (page > 1) {
      console.log('Page changed, fetching more items for page:', page);
      fetchData(false);
    }
  }, [page, fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

  // Logout Handler
  const handleLogout = useCallback(async () => {
    try {
      await apiService.logout();
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Greška kod odjave. Pokušajte ponovno');
    }
  }, [signOut]);

  // Delete Handler
  const handleDeleteItem = useCallback(
    async (itemId: string) => {
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
                await fetchData(true);
                Alert.alert('Uspjeh', 'Dokument je uspješno izbrisan');
              } catch (error) {
                console.error('Error deleting item:', error);
                Alert.alert('Greška', 'Greška prilikom brisanja dokumenta');
              }
            },
          },
        ],
      );
    },
    [fetchData],
  );

  // Approve Handler
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
        await fetchData(true);
        Alert.alert('Uspjeh', 'Dokument uspješno odobren');
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

  // Filter Handler
  const handleFilterChange = useCallback(
    (newDate: Date, newCode: string, newSortOrder: string) => {
      setSelectedDate(newDate);
      setSelectedCode(newCode);
      setSortOrder(newSortOrder);
      fetchData(true);
    },
    [fetchData],
  );

  // Render Functions
  const renderItem = useCallback(
    ({item}: {item: Item}) => {
      return (
        <ItemCard
          item={item}
          userProfile={userProfile}
          userToken={userToken}
          onPress={() =>
            navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})
          }
          onPhotoPress={photoUrl =>
            navigation.navigate('PhotoViewer', {photoUrl})
          }
          onApprove={() => {
            setSelectedItemId(item._id);
            setPhotoModalVisible(true);
          }}
          onDelete={handleDeleteItem}
        />
      );
    },
    [navigation, userProfile, userToken, handleDeleteItem],
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

          <Divider style={styles.divider} />

          <DateRangeFilters
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
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
              <Text style={styles.statValue}>{totalDocuments}</Text>
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
              {selectedDate.toLocaleDateString('hr-HR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
              {selectedCode !== 'all' ? ` (${selectedCode})` : ''}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
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
    selectedDate,
    sortOrder,
    totalDocuments,
    handleRefresh,
    refreshing,
  ]);
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={styles.footerText}>Učitavam još dokumenata...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Main Render
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          ListHeaderComponent={ListHeaderComponent}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Učitavam dokumente...</Text>
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>Nema dokumenata</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.footerText}>Učitavam još...</Text>
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          scrollEventThrottle={150}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={21}
          removeClippedSubviews={Platform.OS === 'android'}
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
          onSuccess={() => fetchData(true)}
        />

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
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
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
  footerLoader: {
    height: 60, // Add fixed height
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
    marginTop: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
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
  divider: {
    marginVertical: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  refreshButton: {
    padding: 8,
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
