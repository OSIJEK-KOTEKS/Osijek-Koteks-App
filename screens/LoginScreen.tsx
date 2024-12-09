import React, {useState, useContext, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import {Input, Button, Text} from 'react-native-elements';
import {StackNavigationProp} from '@react-navigation/stack';
import axios from 'axios';
import {RootStackParamList} from '../types';
import {apiService} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthContext} from '../AuthContext';
import Logo from '../components/Logo';
import {PrivacyConsentManager} from '../components/privacy/PrivacyConsentManager';

const PRIVACY_CONSENT_KEY = 'privacy_consent_status';

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
  const [isPrivacyModalVisible, setPrivacyModalVisible] = useState(false);
  const {signIn} = useContext(AuthContext);

  useEffect(() => {
    checkPrivacyConsent();
  }, []);

  const checkPrivacyConsent = async () => {
    try {
      const consent = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY);
      if (!consent) {
        setPrivacyModalVisible(true);
      }
    } catch (error) {
      console.error('Error checking privacy consent:', error);
    }
  };

  const handlePrivacyDecline = () => {
    setPrivacyModalVisible(false);
    Alert.alert(
      'Obavezna pravila privatnosti',
      'Za korištenje aplikacije morate prihvatiti pravila privatnosti i uvjete korištenja.',
      [
        {
          text: 'Prihvati',
          onPress: () => setPrivacyModalVisible(true),
        },
        {
          text: 'Odustani',
          style: 'cancel',
          onPress: () => {
            // Optionally navigate away or show additional message
          },
        },
      ],
    );
  };

  const validateInputs = () => {
    if (!email.trim()) {
      setErrorMessage('Email je obavezan');
      return false;
    }
    if (!password.trim()) {
      setErrorMessage('Lozinka je obavezna');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    // Check privacy consent before login
    const consent = await AsyncStorage.getItem(PRIVACY_CONSENT_KEY);
    if (!consent) {
      setPrivacyModalVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Attempting login with:', {email});
      const loginResponse = await apiService.login(email, password);
      console.log('Login successful', loginResponse.user);

      if (!loginResponse.token || !loginResponse.user._id) {
        throw new Error('Nevažeći odgovor za prijavu');
      }

      // Call the signIn function from AuthContext
      await signIn(loginResponse.token);

      // Navigate to the Main screen
      navigation.replace('Main');
    } catch (error: unknown) {
      console.error('Error logging in:', error);
      let errorMessage = 'Došlo je do greške prilikom prijave.';

      if (axios.isAxiosError(error) && error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Implement forgot password functionality
    Alert.alert(
      'Zaboravljena lozinka',
      'Kontaktirajte nas na: it@osijek-koteks.hr',
    );
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
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Input
            placeholder="Lozinka"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            disabled={isLoading}
            leftIcon={<Text style={styles.icon}>🔒</Text>}
            containerStyle={styles.inputContainer}
            autoComplete="password"
            textContentType="password"
          />
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              <Button
                title="Prijava"
                onPress={handleLogin}
                buttonStyle={styles.loginButton}
                containerStyle={styles.buttonContainer}
              />
              <TouchableWithoutFeedback onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>
                  Zaboravili ste lozinku?
                </Text>
              </TouchableWithoutFeedback>
            </>
          )}

          <Text style={styles.privacyNote}>
            Prijavom potvrđujete da ste suglasni s našim pravilima privatnosti i
            uvjetima korištenja.
          </Text>

          <PrivacyConsentManager
            isVisible={isPrivacyModalVisible}
            onClose={handlePrivacyDecline}
            onAccept={() => {
              setPrivacyModalVisible(false);
              // Optionally proceed with login if credentials are already entered
              if (email && password) {
                handleLogin();
              }
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
    marginTop: 15,
    textDecorationLine: 'underline',
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
  privacyNote: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default LoginScreen;
