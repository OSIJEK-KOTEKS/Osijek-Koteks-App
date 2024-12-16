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
  const [dateRange, setDateRange] = useState<string>('7days');
  const [sortOrder, setSortOrder] = useState<string>('date-desc');
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs
  const loadingRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  // Context
  const {signOut} = useContext(AuthContext);

  // Date Range Filter Helper
  const getDateRangeFilter = useCallback((range: string) => {
    const today = new Date();
    if (range === '7days') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      return sevenDaysAgo.toISOString();
    } else if (range === '30days') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return thirtyDaysAgo.toISOString();
    }
    return undefined;
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
      if (loadingRef.current) return;
      loadingRef.current = true;

      try {
        const currentPage = resetItems ? 1 : page; // Get current page
        console.log('Fetching data for page:', currentPage); // Debug log

        if (resetItems) {
          setLoading(true);
          setPage(1);
        }

        const profile = await apiService.getUserProfile();
        setUserProfile(profile);

        const filters = {
          startDate: getDateRangeFilter(dateRange),
          ...(selectedCode !== 'all' && {code: selectedCode}),
        };

        const response = await apiService.getItems(
          currentPage, // Use currentPage instead of resetItems ? 1 : page
          10,
          filters,
        );

        console.log('Response data:', {
          currentPage,
          itemsReceived: response.items.length,
          hasMore: response.pagination.hasMore,
          totalItems: response.pagination.total,
        });

        if (resetItems) {
          setItems(response.items);
        } else {
          setItems(prev => [...prev, ...response.items]);
        }

        setHasMore(response.pagination.hasMore);

        if (profile.role === 'admin') {
          const uniqueCodes = Array.from(
            new Set(response.items.map(item => item.code)),
          ).sort();
          setAvailableCodes(uniqueCodes);
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
    [page, dateRange, selectedCode, getDateRangeFilter],
  );

  //Load more handler
  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loading || loadingRef.current) return;
    console.log(
      'Loading more items, current page:',
      page,
      'setting to:',
      page + 1,
    );
    setIsLoadingMore(true);
    setPage(prev => {
      console.log('Updating page from', prev, 'to', prev + 1);
      return prev + 1;
    });
  }, [hasMore, isLoadingMore, loading, page]);

  useEffect(() => {
    if (page > 1) {
      console.log('Page changed to:', page, 'fetching more data');
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
    (newDateRange: string, newCode: string, newSortOrder: string) => {
      setDateRange(newDateRange);
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
              <Text style={styles.statValue}>{items.length}</Text>
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
    dateRange,
    sortOrder,
    items.length,
    isProfileMenuVisible,
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
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          windowSize={3}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          contentContainerStyle={styles.listContentContainer}
          onScroll={() => {
            console.log('Scrolling, current page:', page); // Debug log
          }}
          scrollEventThrottle={16}
          onMomentumScrollBegin={() => {
            console.log('Scroll began');
          }}
          onMomentumScrollEnd={() => {
            console.log('Scroll ended');
          }}
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
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
