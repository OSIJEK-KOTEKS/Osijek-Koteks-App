// src/utils/api.ts
import axios from 'axios';
import {
  User,
  LoginResponse,
  Item,
  CreateItemInput,
  LocationData,
} from '../types';

const API_URL =
  process.env.REACT_APP_API_URL || 'https://osijek-koteks-app.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async config => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      endpoint: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  },
);

export const getImageUrl = (path: string) => `${API_URL}${path}`;

export const apiService = {
  // Auth methods
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

  logout: async () => {
    try {
      localStorage.removeItem('userToken');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // User methods
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get<User[]>('/api/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
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

  deleteUser: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/api/users/${userId}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Item methods
  getItems: async (): Promise<Item[]> => {
    try {
      const response = await api.get<Item[]>('/api/items');
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  createItem: async (itemData: CreateItemInput): Promise<Item> => {
    try {
      const response = await api.post<Item>('/api/items', itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  updateItemApproval: async (
    id: string,
    approvalStatus: Item['approvalStatus'],
    photoFile?: File,
    locationData?: LocationData,
  ): Promise<Item> => {
    try {
      const formData = new FormData();
      formData.append('approvalStatus', approvalStatus);

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      if (locationData) {
        formData.append('locationData', JSON.stringify(locationData));
      }

      const response = await api.patch<Item>(
        `/api/items/${id}/approval`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error('Error updating item approval:', error);
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

export default apiService;
