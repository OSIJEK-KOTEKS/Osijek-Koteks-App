import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../App';
import {logoutUser} from '../utils/authUtils';

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

type MainScreenProps = {
  navigation: MainScreenNavigationProp;
};

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  const handleLogout = async () => {
    await logoutUser();
    navigation.replace('Login');
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
