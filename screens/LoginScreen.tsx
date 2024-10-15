import React, {useState, ReactNode, useEffect} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {Input, Button, Text as RNEText} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import {saveAuthToken} from '../utils/authUtils';
import {RootStackParamList} from '../App';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

type LoginScreenProps = {
  navigation: LoginScreenNavigationProp;
};

const Text: React.FC<{h3?: boolean; style?: object; children: ReactNode}> = ({
  h3,
  style,
  children,
  ...props
}) => (
  <RNEText h3={h3} style={[h3 && styles.h3Text, style]} {...props}>
    {children}
  </RNEText>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirm, setConfirm] = useState<any>(null);

  const handleSendCode = async () => {
    try {
      console.log('Attempting to send code to:', phoneNumber);
      const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
      console.log('Confirmation received:', confirmation);
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
      console.log('Attempting to confirm code:', confirmationCode);
      const userCredential = await confirm.confirm(confirmationCode);
      console.log('User credential received:', userCredential);
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
          placeholder="Phone Number (e.g., +1234567890)"
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
  h3Text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
