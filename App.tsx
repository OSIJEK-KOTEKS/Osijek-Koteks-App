import React, {useEffect, useState, useMemo} from 'react';
import {View, StyleSheet, ActivityIndicator, Text, Button} from 'react-native';
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error) {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, info);
  }

  resetError = () => {
    this.setState({hasError: false, error: null});
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Button title="Try Again" onPress={this.resetError} />
        </View>
      );
    }
    return this.props.children;
  }
}

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

const LoadingDisplay: React.FC = () => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#2196F3" />
  </View>
);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
          setUserToken(token);
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

  const authContext = useMemo(
    () => ({
      signIn: async (token: string) => {
        try {
          setUserToken(token);
          await AsyncStorage.setItem('userToken', token);
          const userProfile = await apiService.getUserProfile();
          setIsAdmin(userProfile.role === 'admin');
        } catch (error) {
          console.error('Sign in error:', error);
          throw error;
        }
      },
      signOut: async () => {
        try {
          setUserToken(null);
          setIsAdmin(false);
          await AsyncStorage.removeItem('userToken');
          await apiService.logout();
        } catch (error) {
          console.error('Sign out error:', error);
          throw error;
        }
      },
    }),
    [],
  );

  if (isLoading) {
    return <LoadingDisplay />;
  }

  return (
    <AppErrorBoundary>
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
                <Stack.Screen
                  name="PhotoViewer"
                  component={PhotoViewer}
                  options={{
                    headerShown: false,
                    presentation: 'modal',
                  }}
                />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </AppErrorBoundary>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ff3b30',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default App;
