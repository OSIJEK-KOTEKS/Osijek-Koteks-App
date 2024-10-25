import React, {useEffect, useState, useContext, useCallback} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {Text, Button, Divider, Image} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import {MainTabScreenProps} from '../types';
import {apiService, Item, User} from '../utils/api';
import {AuthContext} from '../AuthContext';
import CustomAvatar from '../components/CustomAvatar';
import PhotoCaptureModal from '../components/PhotoCaptureModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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

export const MainScreen: React.FC<MainTabScreenProps> = ({navigation}) => {
  // State Management
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('all');
  const [availableCodes, setAvailableCodes] = useState<string[]>([]);
  const [isPhotoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const {signOut} = useContext(AuthContext);

  // Token Management
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

    // Cleanup function
    return () => {
      setItems([]);
      setFilteredItems([]);
      setUserProfile(null);
    };
  }, []);

  // Data Fetching
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
        'Failed to load data. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter Items based on Selected Code
  useEffect(() => {
    if (selectedCode === 'all') {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => item.code === selectedCode);
      setFilteredItems(filtered);
    }
  }, [selectedCode, items]);

  // Refresh Handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Logout Handler
  const handleLogout = useCallback(async () => {
    try {
      await apiService.logout();
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }, [signOut]);

  // Approval Handler
  const handleApproveItem = useCallback(
    async (photoUri: string) => {
      if (!selectedItemId) return;

      try {
        await apiService.updateItemApproval(
          selectedItemId,
          'approved',
          photoUri,
        );
        await fetchData();
        Alert.alert('Success', 'Item approved successfully');
      } catch (error) {
        console.error('Error approving item:', error);
        Alert.alert('Error', 'Failed to approve item. Please try again.');
      } finally {
        setPhotoModalVisible(false);
        setSelectedItemId(null);
      }
    },
    [selectedItemId, fetchData],
  );

  // Image Error Handler
  const handleImageError = useCallback((error: any) => {
    console.error('Image loading error:', error?.nativeEvent?.error || error);
    // Optional: Show error UI
    Alert.alert(
      'Image Load Error',
      'Failed to load image. Please try again later.',
    );
  }, []);

  // Render Item Component
  const renderItem = useCallback(
    ({item}: {item: Item}) => {
      const photoUrl = item.approvalPhoto?.url || null;

      // Helper function to get status style
      const getStatusStyle = (status: Item['approvalStatus']) => {
        switch (status) {
          case 'approved':
            return styles.statusApproved;
          case 'pending':
            return styles.statusPending;
          case 'rejected':
            return styles.statusRejected;
          default:
            return {};
        }
      };

      return (
        <View style={styles.itemContainer}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})
            }
            style={styles.itemContent}>
            <View style={styles.headerRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  getStatusStyle(item.approvalStatus),
                ]}>
                <Text style={styles.statusText}>
                  {item.approvalStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Code:</Text>
                <Text style={styles.detailValue}>{item.code}</Text>
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
                      <Text style={styles.detailValue}>
                        {item.approvalDate}
                      </Text>
                    </View>
                  )}

                  {photoUrl && userToken && (
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('PhotoViewer', {
                          photoUrl: photoUrl,
                          token: userToken,
                        });
                      }}
                      style={styles.photoPreviewContainer}>
                      <View style={styles.previewImageWrapper}>
                        <Image
                          source={{
                            uri: `http://192.168.1.130:5000${photoUrl}`,
                            headers: {
                              Authorization: `Bearer ${userToken}`,
                            },
                            width: 60,
                            height: 60,
                          }}
                          style={styles.photoPreview}
                          resizeMode="cover"
                          resizeMethod="resize"
                          progressiveRenderingEnabled={false}
                          fadeDuration={0}
                          PlaceholderContent={
                            <ActivityIndicator size="small" color="#2196F3" />
                          }
                          onError={handleImageError}
                        />
                      </View>
                      <Text style={styles.viewPhotoText}>
                        View Approval Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {item.approvalStatus === 'pending' &&
                (userProfile?.role === 'admin' ||
                  userProfile?.role === 'user') && (
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => {
                      setSelectedItemId(item._id);
                      setPhotoModalVisible(true);
                    }}>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.approveButtonText}>
                      Approve with Photo
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [navigation, userToken, handleImageError, userProfile?.role],
  );

  // Header Component
  const ListHeaderComponent = useCallback(() => {
    return (
      <>
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

        <View style={styles.documentsContainer}>
          <Text style={styles.sectionTitle}>
            Documents{' '}
            {selectedCode !== 'all' ? `(Code: ${selectedCode})` : '(All)'}
          </Text>
        </View>
      </>
    );
  }, [userProfile, selectedCode, availableCodes, filteredItems.length]);
  // Main Render
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerContent}>
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No documents found</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListFooterComponent={
          <View style={styles.buttonContainer}>
            <Button
              title="Logout"
              onPress={handleLogout}
              buttonStyle={styles.logoutButton}
              titleStyle={styles.buttonTitle}
              raised
            />
          </View>
        }
        contentContainerStyle={styles.listContentContainer}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        onEndReachedThreshold={0.5}
        getItemLayout={(data, index) => ({
          length: 200,
          offset: 200 * index,
          index,
        })}
      />
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

// Wrap MainScreen with ErrorBoundary
export const MainScreenWithErrorBoundary: React.FC<
  MainTabScreenProps
> = props => (
  <ErrorBoundary>
    <MainScreen {...props} />
  </ErrorBoundary>
);

// Styles
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#e6f4ea',
    borderColor: '#34a853',
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#fff3e0',
    borderColor: '#fbbc04',
    borderWidth: 1,
  },
  statusRejected: {
    backgroundColor: '#fce8e8',
    borderColor: '#ea4335',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#f5f5f5',
  },
  viewPhotoText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
  },
});
