import React, {useEffect, useState, useContext} from 'react';
import {View, StyleSheet, FlatList, Alert} from 'react-native';
import {Text, Button, ListItem} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types';
import {apiService} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

interface Item {
  _id: string;
  title: string;
  code: string;
  pdfUrl: string;
}

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const {signOut} = useContext(AuthContext); // Use the AuthContext

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const fetchedItems = await apiService.getItems(''); // Adjust this if you need to pass a specific code
      setItems(fetchedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      signOut(); // Call the signOut function from AuthContext
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const renderItem = ({item}: {item: Item}) => (
    <ListItem
      bottomDivider
      onPress={() => navigation.navigate('PDFViewer', {pdfUrl: item.pdfUrl})}>
      <ListItem.Content>
        <ListItem.Title>{item.title}</ListItem.Title>
        <ListItem.Subtitle>Code: {item.code}</ListItem.Subtitle>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );

  return (
    <View style={styles.container}>
      <Text h4 style={styles.header}>
        Welcome to Your Dashboard
      </Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text>No items found.</Text>}
      />
      <Button
        title="Logout"
        onPress={handleLogout}
        containerStyle={styles.logoutButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 20,
  },
});
