import React, {useEffect, useState} from 'react';
import {View, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {LoginScreen} from './screens/LoginScreen';
import {MainScreen} from './screens/MainScreen';
import {initializeFirebase} from './firebaseConfig';
import {getAuthToken, removeAuthData} from './utils/authUtils';
import auth from '@react-native-firebase/auth';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initApp = async () => {
      const app = initializeFirebase();
      if (app) {
        setIsFirebaseInitialized(true);
        // Check for stored token
        const token = await getAuthToken();
        if (token) {
          try {
            // Use the token to get the user
            const currentUser = auth().currentUser;
            if (currentUser) {
              // If there's a current user, refresh the token
              await currentUser.getIdToken(true);
            } else {
              // If no current user, try to refresh the auth state
              await auth().signInWithCustomToken(token);
            }
          } catch (error) {
            console.error('Error verifying stored token:', error);
            // Token is invalid or expired, remove it
            await removeAuthData();
          }
        }
      } else {
        setInitError('Failed to initialize Firebase');
      }
      setIsLoading(false);
    };

    initApp();
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  if (initError) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Error: {initError}</Text>
      </View>
    );
  }

  if (isLoading || !isFirebaseInitialized) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        {user ? (
          <Stack.Screen name="Main" component={MainScreen} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
