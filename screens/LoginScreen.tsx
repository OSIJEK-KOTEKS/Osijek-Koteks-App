import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {Input, Button, Text as RNEText} from 'react-native-elements';
import auth from '@react-native-firebase/auth';
import {saveAuthData} from '../utils/authUtils';

const Text: React.FC<{
  h3?: boolean;
  style?: object;
  children: React.ReactNode;
}> = ({h3, style, children, ...props}) => (
  <RNEText h3={h3} style={[h3 && styles.h3Text, style]} {...props}>
    {children}
  </RNEText>
);

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    try {
      const userCredential = await auth().signInWithEmailAndPassword(
        email,
        password,
      );
      const token = await userCredential.user.getIdToken();
      const uid = userCredential.user.uid;
      await saveAuthData(token, uid);
      // No need to navigate here, App.tsx will handle it based on auth state
    } catch (error) {
      console.error('Error logging in:', error);
      Alert.alert('Error', 'Invalid email or password. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text h3>Login</Text>
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
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
