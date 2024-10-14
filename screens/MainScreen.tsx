import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Button, Text as RNEText} from 'react-native-elements';
import {logoutUser} from '../utils/authUtils';
import {StackNavigationProp} from '@react-navigation/stack';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

type MainScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

type MainScreenProps = {
  navigation: MainScreenNavigationProp;
};

const Text: React.FC<{
  h3?: boolean;
  style?: object;
  children: React.ReactNode;
}> = ({h3, style, children, ...props}) => (
  <RNEText h3={h3} style={[h3 && styles.h3Text, style]} {...props}>
    {children}
  </RNEText>
);

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  const handleLogout = async () => {
    await logoutUser();
    navigation.navigate('Login');
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
  h3Text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
