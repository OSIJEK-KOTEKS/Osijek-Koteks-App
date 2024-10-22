import React, {useEffect, useState, useContext} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {Text, Button, ListItem, Divider} from 'react-native-elements';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const {signOut} = useContext(AuthContext);

  const fetchData = async () => {
    try {
      setLoading(true);
      const profile = await apiService.getUserProfile();
      setUserProfile(profile);

      // Fetch items after getting user profile - remove the empty string parameter
      const fetchedItems = await apiService.getItems();
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Function to render codes as comma-separated string
  const renderCodes = (codes: string[] = []): string => {
    if (codes.length === 0) return '-';
    return codes.join(', ');
  };

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

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Documents</Text>
              <Text style={styles.statValue}>{items.length}</Text>
            </View>
            <View style={[styles.statBox, styles.codesBox]}>
              <Text style={styles.statLabel}>Codes</Text>
              <Text style={styles.codesValue} numberOfLines={2}>
                {renderCodes(userProfile?.codes)}
              </Text>
            </View>
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.documentsContainer}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          {loading ? (
            <View style={styles.centerContent}>
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : items.length > 0 ? (
            <FlatList
              data={items}
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
  codesBox: {
    flex: 2, // Give more space for codes
  },
  codesValue: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    textAlign: 'center',
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
  avatar: {
    backgroundColor: '#2196F3',
  },
  avatarTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
});
