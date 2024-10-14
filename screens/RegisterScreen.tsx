import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {Input, Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {RootStackParamList} from '../AppNavigator';

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
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirm, setConfirm] = useState<any>(null);

  const handleSendCode = async () => {
    try {
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      setConfirm(confirmation);
    } catch (error) {
      console.error('Error sending code:', error);
      Alert.alert(
        'Error',
        'Failed to send verification code. Please try again.',
      );
    }
  };

  const handleRegister = async () => {
    if (!confirm) {
      console.error('No confirmation object');
      return;
    }

    try {
      const userCredential = await confirm.confirm(confirmationCode);
      await firestore().collection('users').doc(userCredential.user.uid).set({
        firstName,
        lastName,
        company,
        phoneNumber,
        role: 'user',
      });
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error confirming code:', error);
      Alert.alert(
        'Error',
        'Invalid confirmation code or registration failed. Please try again.',
      );
    }
  };

  if (!confirm) {
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
        <Input
          placeholder="Company"
          value={company}
          onChangeText={setCompany}
        />
        <Input
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <Button title="Send Code" onPress={handleSendCode} />
        <Button
          title="Back to Login"
          type="clear"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text h3>Enter Confirmation Code</Text>
      <Input
        placeholder="Confirmation Code"
        value={confirmationCode}
        onChangeText={setConfirmationCode}
        keyboardType="number-pad"
      />
      <Button title="Verify and Register" onPress={handleRegister} />
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
