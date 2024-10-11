import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

export const saveAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error saving auth token', error);
  }
};

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token', error);
    return null;
  }
};

export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing auth token', error);
  }
};

export const checkAuthState = async () => {
  try {
    const token = await getAuthToken();
    if (token) {
      // Verify the token with Firebase
      await auth().signInWithCustomToken(token);
      return true;
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    await removeAuthToken(); // Clear the invalid token
  }
  return false;
};

export const logoutUser = async () => {
  try {
    await auth().signOut();
    await removeAuthToken();
  } catch (error) {
    console.error('Error logging out', error);
  }
};
