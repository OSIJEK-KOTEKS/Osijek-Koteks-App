import React, {useEffect, useState, useMemo} from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {LoginScreen} from './screens/LoginScreen';
import {MainScreen} from './screens/MainScreen';
import {PDFViewer} from './screens/PDFViewer';
import {RootStackParamList} from './types';
import {AuthContext} from './AuthContext';
import {apiService} from './utils/api';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Instead of verifying the token, we'll check if we can fetch the user profile
          await apiService.getUserProfile();
        }
      } catch (e) {
        // Profile fetch failed, token is likely invalid
        console.error('Failed to restore session', e);
        token = null;
        await AsyncStorage.removeItem('userToken');
      }
      setUserToken(token);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);

  const authContext = useMemo(
    () => ({
      signIn: async (token: string) => {
        setUserToken(token);
        await AsyncStorage.setItem('userToken', token);
      },
      signOut: async () => {
        setUserToken(null);
        await AsyncStorage.removeItem('userToken');
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
    }),
    [],
  );

  if (isLoading) {
    return <LoadingDisplay />;
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          {userToken ? (
            <>
              <Stack.Screen name="Main" component={MainScreen} />
              <Stack.Screen
                name="PDFViewer"
                component={PDFViewer}
                options={{headerShown: true}}
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
};

const LoadingDisplay: React.FC = () => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" />
  </View>
);

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
