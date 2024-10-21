import React, {useState, useContext} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {Input, Button, Text, Image} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../types';
import {apiService, LoginResponse} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';

type LoginScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {signIn} = useContext(AuthContext);

  const validateInputs = () => {
    if (!email.trim()) {
      setErrorMessage('Email is required');
      return false;
    }
    if (!password.trim()) {
      setErrorMessage('Password is required');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      console.log('Attempting login with:', {email, password});
      const loginResponse: LoginResponse = await apiService.login(
        email,
        password,
      );
      console.log('Login successful', loginResponse.user);

      // Store the token securely
      await AsyncStorage.setItem('userToken', loginResponse.token);

      // Call the signIn function from AuthContext
      await signIn(loginResponse.token);

      // Navigate to the Main screen
      navigation.replace('Main');
    } catch (error) {
      console.error('Error logging in:', error);
      setErrorMessage('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text h3 style={styles.title}>
            Welcome Back
          </Text>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={isLoading}
            leftIcon={{type: 'font-awesome', name: 'envelope'}}
          />
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            disabled={isLoading}
            leftIcon={{type: 'font-awesome', name: 'lock'}}
          />
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Button
              title="Login"
              onPress={handleLogin}
              buttonStyle={styles.loginButton}
            />
          )}
          <Button
            title="Forgot Password?"
            type="clear"
            titleStyle={styles.forgotPasswordText}
            onPress={() => {
              /* Handle forgot password */
            }}
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    width: 200,
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#007AFF',
    marginTop: 15,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
});
