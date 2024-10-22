import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const API_URL = 'http://192.168.1.130:5000';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  code: string;
  role: 'admin' | 'user' | 'bot';
  isVerified: boolean;
}

export interface Item {
  _id: string;
  title: string;
  code: string;
  pdfUrl: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

const saveAuthData = async (token: string, userId: string) => {
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error;
  }
};

const removeAuthData = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_ID_KEY);
  } catch (error) {
    console.error('Error removing auth data:', error);
    throw error;
  }
};

export const apiService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });
      const {token, user} = response.data;
      await saveAuthData(token, user.id);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (
    userData: Omit<User, 'id' | 'isVerified'>,
  ): Promise<User> => {
    try {
      const response = await api.post<{token: string; user: User}>(
        '/api/auth/register',
        userData,
      );
      const {token, user} = response.data;
      await saveAuthData(token, user.id);
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await removeAuthData();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // New method to get user profile
  getUserProfile: async (): Promise<User> => {
    try {
      const userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        throw new Error('No user ID found');
      }
      const response = await api.get<User>(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  getItems: async (code: string): Promise<Item[]> => {
    try {
      const response = await api.get<Item[]>(`/api/items?code=${code}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  getUserById: async (id: string): Promise<User> => {
    try {
      const response = await api.get<User>(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    try {
      const response = await api.patch<User>(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  createItem: async (itemData: Omit<Item, '_id'>): Promise<Item> => {
    try {
      const response = await api.post<Item>('/api/items', itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  updateItem: async (id: string, itemData: Partial<Item>): Promise<Item> => {
    try {
      const response = await api.patch<Item>(`/api/items/${id}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  deleteItem: async (id: string): Promise<void> => {
    try {
      await api.delete(`/api/items/${id}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },
};
