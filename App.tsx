import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {LoginScreen} from './screens/LoginScreen';
import {RegisterScreen} from './screens/RegisterScreen';
import {MainScreen} from './screens/MainScreen';
import {initializeFirebase} from './firebaseConfig';

const Stack = createStackNavigator();

const App = () => {
  useEffect(() => {
    const app = initializeFirebase();
    console.log('Firebase app initialized in App.tsx:', app);
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
