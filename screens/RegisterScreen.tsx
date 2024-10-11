import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {Input, Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';

// Define the type for your navigation stack parameters
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  // Add other screen names and their param types here
};

type RegisterScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Register'
>;

type RegisterScreenProps = {
  navigation: RegisterScreenNavigationProp;
};

export const RegisterScreen: React.FC<RegisterScreenProps> = ({navigation}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleRegister = () => {
    // TODO: Implement registration logic
    console.log('Register:', {firstName, lastName, company, phoneNumber});
  };

  return (
    <View style={styles.container}>
      <Text h3>Register</Text>
      <Input
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <Input
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />
      <Input placeholder="Company" value={company} onChangeText={setCompany} />
      <Input
        placeholder="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
      />
      <Button title="Register" onPress={handleRegister} />
      <Button
        title="Back to Login"
        type="clear"
        onPress={() => navigation.navigate('Login')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});
