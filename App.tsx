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
import {UserManagementScreen} from './screens/UserManagementScreen';
import {RootStackParamList, AdminTabParamList} from './types';
import {AuthContext} from './AuthContext';
import {apiService} from './utils/api';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {StackNavigationProp} from '@react-navigation/stack';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

// Type for the navigation prop that will be passed to screens in the admin tabs
type AdminTabScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

// Props type for screens in admin tabs
interface AdminTabScreenProps {
  navigation: AdminTabScreenNavigationProp;
}

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#2196F3',
      tabBarInactiveTintColor: 'gray',
    }}>
    <Tab.Screen
      name="Items"
      component={MainScreen}
      options={{
        tabBarIcon: ({color}) => (
          <Icon name="description" type="material" size={24} color={color} />
        ),
        headerShown: false,
      }}
    />
    <Tab.Screen
      name="Users"
      component={UserManagementScreen}
      options={{
        tabBarIcon: ({color}) => (
          <Icon name="people" type="material" size={24} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
        }
      } catch (e) {
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
        try {
          setUserToken(token);
          await AsyncStorage.setItem('userToken', token);
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
        } catch (error) {
          console.error('Error during sign in:', error);
        }
      },
      signOut: async () => {
        setUserToken(null);
        setIsAdmin(false);
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
              <Stack.Screen
                name="Main"
                component={isAdmin ? AdminTabs : MainScreen}
              />
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
  tabBarIcon: {
    width: 24,
    height: 24,
  },
});

export default App;
