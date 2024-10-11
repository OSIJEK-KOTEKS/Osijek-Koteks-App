import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Button} from 'react-native-elements';
import {logoutUser} from '../utils/authUtils';

export const MainScreen: React.FC = () => {
  const handleLogout = async () => {
    await logoutUser();
    // The App component will handle navigation after logout
  };

  return (
    <View style={styles.container}>
      <Text h3>Welcome to the Main Screen!</Text>
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
});
