import React, {useEffect, useState, useMemo} from 'react';
import {View, StyleSheet, ActivityIndicator} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Icon} from 'react-native-elements';
import {LoginScreen} from './screens/LoginScreen';
import {MainScreen} from './screens/MainScreen';
import {PDFViewer} from './screens/PDFViewer';
import {PhotoViewer} from './screens/PhotoViewer';
import {UserManagementScreen} from './screens/UserManagementScreen';
import {RootStackParamList, AdminTabParamList} from './types';
import {AuthContext} from './AuthContext';
import {apiService} from './utils/api';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

// Define AdminTabs as a separate constant component
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: 'gray',
    }}>
    <Tab.Screen
      name="Dokumenti"
      component={MainScreen}
      options={{
        tabBarIcon: ({color}) => (
          <Icon name="description" type="material" size={24} color={color} />
        ),
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Korisnici"
      component={UserManagementScreen}
      options={{
        tabBarIcon: ({color}) => (
          <Icon name="people" type="material" size={24} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// Define UserStack as a separate constant component
const UserStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Main" component={MainScreen} />
    <Stack.Screen
      name="PDFViewer"
      component={PDFViewer}
      options={{headerShown: true}}
    />
    <Stack.Screen
      name="PhotoViewer"
      component={PhotoViewer}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  </Stack.Navigator>
);

// Define AdminStack as a separate constant component
const AdminStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Main" component={AdminTabs} />
    <Stack.Screen
      name="PDFViewer"
      component={PDFViewer}
      options={{headerShown: true}}
    />
    <Stack.Screen
      name="PhotoViewer"
      component={PhotoViewer}
      options={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  </Stack.Navigator>
);

const LoadingDisplay = () => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#2196F3" />
  </View>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const authContext = useMemo(
    () => ({
      signIn: async (token: string) => {
        try {
          await AsyncStorage.setItem('userToken', token);
          setUserToken(token);
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
        } catch (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      },
      signOut: async () => {
        try {
          await AsyncStorage.removeItem('userToken');
          await apiService.logout();
          setUserToken(null);
          setIsAdmin(false);
        } catch (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      },
    }),
    [],
  );

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setUserToken(token);
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
        }
      } catch (e) {
        console.error('Bootstrap error:', e);
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  if (isLoading) {
    return <LoadingDisplay />;
  }

  const renderNavigator = () => {
    if (!userToken) {
      return (
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      );
    }

    return isAdmin ? <AdminStack /> : <UserStack />;
  };

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>{renderNavigator()}</NavigationContainer>
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default App;
