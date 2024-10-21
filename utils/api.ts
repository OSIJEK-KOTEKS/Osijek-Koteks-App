import axios, {AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {User, Item} from '../types';

const API_URL = 'http://192.168.1.130:5000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 401) {
      // Unauthorized, token might be invalid
      await AsyncStorage.removeItem('userToken');
      // You might want to redirect to login screen here
    }
    return Promise.reject(error);
  },
);

export interface LoginResponse {
  token: string;
  user: User;
}

export const apiService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  getItems: async (code?: string): Promise<Item[]> => {
    try {
      const response = await api.get<Item[]>('/api/items', {params: {code}});
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  getUserProfile: async (): Promise<User> => {
    try {
      const response = await api.get<User>('/api/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  updateUserProfile: async (userData: Partial<User>): Promise<User> => {
    try {
      const response = await api.patch<User>('/api/users/profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  // Add more API methods as needed

  handleApiError: (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error('Error data:', axiosError.response.data);
        console.error('Error status:', axiosError.response.status);
        console.error('Error headers:', axiosError.response.headers);
      } else if (axiosError.request) {
        console.error('Error request:', axiosError.request);
      } else {
        console.error('Error message:', axiosError.message);
      }
    } else {
      console.error('Non-Axios error:', error);
    }
  },
};
