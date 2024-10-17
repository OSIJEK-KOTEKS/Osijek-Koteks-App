import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Text} from 'react-native-elements';
import {logoutUser} from '../utils/authUtils';
import auth from '@react-native-firebase/auth';

export const MainScreen: React.FC = () => {
  const handleLogout = async () => {
    try {
      await auth().signOut(); // Sign out from Firebase
      await logoutUser(); // Clear the stored token
      // No need to navigate here, App.tsx will handle it based on auth state
    } catch (error) {
      console.error('Error during logout:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <View style={styles.container}>
      <Text h3>Welcome to the Main Screen</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  h3Text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
