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
import {Input, Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import axios from 'axios'; // Add this import
import {RootStackParamList} from '../types';
import {apiService, LoginResponse} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';
import Logo from '../components/Logo';

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
      const loginResponse = await apiService.login(email, password);
      console.log('Login successful', loginResponse.user);

      if (!loginResponse.token || !loginResponse.user._id) {
        throw new Error('Invalid login response');
      }

      // Call the signIn function from AuthContext
      await signIn(loginResponse.token);

      // Navigate to the Main screen
      navigation.replace('Main');
    } catch (error: unknown) {
      // Explicitly type the error as unknown
      console.error('Error logging in:', error);
      let errorMessage = 'An error occurred during login.';

      // Type guard to check if error is an AxiosError
      if (axios.isAxiosError(error) && error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error instanceof Error) {
        // Handle standard Error objects
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
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
          <Logo />
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={isLoading}
            leftIcon={<Text style={styles.icon}>✉️</Text>}
            containerStyle={styles.inputContainer}
          />
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            disabled={isLoading}
            leftIcon={<Text style={styles.icon}>🔒</Text>}
            containerStyle={styles.inputContainer}
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
              containerStyle={styles.buttonContainer}
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
    backgroundColor: '#fff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 10,
  },
  buttonContainer: {
    width: '80%',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
});
