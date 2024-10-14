import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {Input, Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import {saveAuthToken} from '../utils/authUtils';
import {RootStackParamList} from '../AppNavigator';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
};

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
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

  const handleLogin = async () => {
    if (!confirm) {
      console.error('No confirmation object');
      return;
    }

    try {
      const userCredential = await confirm.confirm(confirmationCode);
      const token = await userCredential.user.getIdToken();
      await saveAuthToken(token);
      navigation.navigate('Main');
    } catch (error) {
      console.error('Error confirming code:', error);
      Alert.alert('Error', 'Invalid confirmation code. Please try again.');
    }
  };

  if (!confirm) {
    return (
      <View style={styles.container}>
        <Text h3>Login</Text>
        <Input
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
        <Button title="Send Code" onPress={handleSendCode} />
        <Button
          title="Register"
          type="clear"
          onPress={() => navigation.navigate('Register')}
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
      <Button title="Verify and Login" onPress={handleLogin} />
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
