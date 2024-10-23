import React, {useEffect, useState, useContext} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import {Text, Button, ListItem, Divider} from 'react-native-elements';
import {Picker} from '@react-native-picker/picker';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types';
import {apiService, Item, User} from '../utils/api';
import {AuthContext} from '../AuthContext';
import CustomAvatar from '../components/CustomAvatar';

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

  const renderItem = ({item}: {item: Item}) => (
    <ListItem
      bottomDivider
      onPress={() => navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})}
      containerStyle={styles.listItem}>
      <ListItem.Content>
        <ListItem.Title style={styles.title}>{item.title}</ListItem.Title>
        <ListItem.Subtitle style={styles.subtitle}>
          Code: {item.code}
        </ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
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
            <FlatList
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No documents found</Text>
            </View>
          )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  dropdownContainer: {
    flex: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#f8f8f8',
  },
  dropdownScrollView: {
    flex: 1,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedDropdownItem: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  selectedDropdownItemText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dropdownValue: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  dropdownArrow: {
    fontSize: 16,
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
  divider: {
    marginVertical: 15,
    backgroundColor: '#E0E0E0',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000',
  },
  listContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  listItem: {
    paddingVertical: 12,
  },
  title: {
    fontWeight: '500',
    fontSize: 16,
    color: '#000',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
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
  buttonContainer: {
    marginHorizontal: 16,
    marginTop: 16,
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

  scrollContent: {
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
});
