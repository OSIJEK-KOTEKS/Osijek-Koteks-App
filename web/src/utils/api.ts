import axios from 'axios';
import {
  User,
  LoginResponse,
  Item,
  CreateItemInput,
  LocationData,
  RegistrationData,
} from '../types';

const API_URL =
  process.env.REACT_APP_API_URL || 'https://osijek-koteks-app.onrender.com';

export const getImageUrl = (path: string) => `${API_URL}${path}`;

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async config => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding token to request:', token.substring(0, 20) + '...');
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

export const apiService = {
  // Auth methods
  login: async (email: string, password: string): Promise<LoginResponse> => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post<LoginResponse>('/api/auth/login', {
        email,
        password,
      });

      console.log('Login response received:', {
        tokenExists: !!response.data.token,
        userExists: !!response.data.user,
        userId: response.data.user._id,
      });

      // Store both token and user ID
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userId', response.data.user._id);

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData: RegistrationData): Promise<User> => {
    try {
      console.log('Registering user:', {
        ...userData,
        password: '[REDACTED]',
      });

      const response = await api.post<LoginResponse>(
        '/api/auth/register',
        userData,
      );
      console.log('Registration successful:', {
        userId: response.data.user._id,
        email: response.data.user.email,
      });

      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('userId', response.data.user._id);

      return response.data.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userId');
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
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('No user ID found');
      }
      console.log('Fetching user profile for ID:', userId);

      const response = await api.get<User>(`/api/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  createUser: async (userData: RegistrationData): Promise<User> => {
    try {
      console.log('Creating new user:', {
        ...userData,
        password: '[REDACTED]',
      });

      const response = await api.post<User>('/api/users', userData);
      console.log('User creation successful:', {
        userId: response.data._id,
        email: response.data.email,
      });

      return response.data;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  },

  updateUser: async (
    id: string,
    userData: Partial<Omit<User, '_id'>>,
  ): Promise<User> => {
    try {
      console.log('Updating user:', id, userData);
      const response = await api.patch<User>(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  updateUserCodes: async (id: string, codes: string[]): Promise<User> => {
    try {
      const response = await api.patch<User>(`/api/users/${id}/codes`, {codes});
      return response.data;
    } catch (error) {
      console.error('Error updating user codes:', error);
      throw error;
    }
  },

  // Item methods
  getItems: async (): Promise<Item[]> => {
    try {
      const response = await api.get<Item[]>('/api/items');
      if (!response.data) {
        console.warn('No items returned from API');
        return [];
      }
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  createItem: async (itemData: CreateItemInput): Promise<Item> => {
    try {
      console.log('Creating new item:', itemData);
      const response = await api.post<Item>('/api/items', itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  updateItem: async (
    id: string,
    itemData: Partial<
      Omit<Item, '_id' | 'creationDate' | 'approvalDate' | 'approvedBy'>
    >,
  ): Promise<Item> => {
    try {
      const response = await api.patch<Item>(`/api/items/${id}`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error updating item:', error);
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

  updateUserPassword: async (
    userId: string,
    newPassword: string,
  ): Promise<User> => {
    try {
      console.log('Updating password for user:', userId);
      const response = await api.patch<User>(`/api/users/${userId}/password`, {
        password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  },

  deleteItem: async (id: string): Promise<void> => {
    try {
      console.log('Attempting to delete item with ID:', id);
      await api.delete(`/api/items/${id}`);
      console.log('Successfully deleted item:', id);
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  },
};

export default apiService;
