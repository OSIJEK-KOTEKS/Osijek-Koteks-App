import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_UID_KEY = 'user_uid';

export const saveAuthData = async (token: string, uid: string) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_UID_KEY, uid);
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const getUserUid = async (): Promise<string | null> => {
  try {
    const uid = await AsyncStorage.getItem(USER_UID_KEY);
    if (!uid) {
      console.warn('No user UID found in storage');
    }
    return uid;
  } catch (error) {
    console.error('Error getting user UID:', error);
    return null;
  }
};

export const removeAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_UID_KEY);
  } catch (error) {
    console.error('Error removing auth data:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

export const logoutUser = async () => {
  try {
    await removeAuthData();
    // Add any other logout logic here, such as clearing user data or resetting the app state
  } catch (error) {
    console.error('Error during logout:', error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};
