import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  RegistrationData,
  LoginResponse,
  Item,
  CreateItemInput,
  LocationData,
} from '../types';

const API_URL = 'https://osijek-koteks-app.onrender.com';

export const getImageUrl = (path: string) => {
  if (path?.startsWith('http')) {
    return path;
  }
  return `${API_URL}${path}`;
};

const AUTH_TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor for adding auth token
// In your api interceptor
api.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Add detailed logging
      console.log('Request config:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        params: config.params,
      });
    }
    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error Details:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      config: error.config, // log the  request config
    });
    return Promise.reject(error);
  },
);

// Interface for paginated responses
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    hasMore: boolean;
  };
}

// Interface for item filters
export interface ItemFilters {
  startDate?: string;
  endDate?: string;
  code?: string;
  sortOrder?: string;
}
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

      const {token, user} = response.data;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_ID_KEY, user._id);
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

      const {token, user} = response.data;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_ID_KEY, user._id);
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_ID_KEY);
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
      const userId = await AsyncStorage.getItem(USER_ID_KEY);
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
  getUniqueCodes: async (): Promise<string[]> => {
    try {
      const response = await api.get<string[]>('/api/items/codes');
      return response.data;
    } catch (error) {
      console.error('Error fetching unique codes:', error);
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

  createUser: async (userData: RegistrationData): Promise<User> => {
    try {
      console.log('Creating new user:', {
        ...userData,
        password: '[REDACTED]',
      });

      const response = await api.post<User>('/api/users', {
        ...userData,
        hasFullAccess: userData.hasFullAccess || false,
      });

      console.log('User creation successful:', {
        userId: response.data._id,
        email: response.data.email,
        hasFullAccess: response.data.hasFullAccess,
      });

      return response.data;
    } catch (error) {
      console.error('User creation error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Creation error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    }
  },

  updateUser: async (
    id: string,
    userData: Partial<Omit<User, '_id'>>,
  ): Promise<User> => {
    try {
      console.log('Updating user:', id, {
        ...userData,
        hasFullAccess: userData.hasFullAccess || false,
      });

      const response = await api.patch<User>(`/api/users/${id}`, {
        ...userData,
        hasFullAccess: userData.hasFullAccess || false,
      });

      console.log('User update successful:', {
        userId: response.data._id,
        hasFullAccess: response.data.hasFullAccess,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },
  // Item methods
  getItems: async (
    page: number = 1,
    limit: number = 10,
    filters?: ItemFilters,
  ): Promise<PaginatedResponse<Item>> => {
    try {
      console.log('Making API request for page:', page);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.startDate && {startDate: filters.startDate}),
        ...(filters?.endDate && {endDate: filters.endDate}),
        ...(filters?.code && filters.code !== 'all' && {code: filters.code}),
        ...(filters?.sortOrder && {sortOrder: filters.sortOrder}),
      });

      const response = await api.get<PaginatedResponse<Item>>(
        `/api/items?${params}`,
      );

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
      if (axios.isAxiosError(error)) {
        console.error('Creation error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
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
    photoUriFront?: string,
    photoUriBack?: string,
    locationData?: LocationData,
    inTransit: boolean = false, // Add inTransit parameter with default value
  ): Promise<Item> => {
    try {
      const formData = new FormData();
      formData.append('approvalStatus', approvalStatus);
      formData.append('inTransit', inTransit.toString()); // Add inTransit flag to form data

      if (photoUriFront) {
        formData.append('photoFront', {
          uri: photoUriFront,
          type: 'image/jpeg',
          name: 'approval_photo_front.jpg',
        } as any);
      }

      if (photoUriBack) {
        formData.append('photoBack', {
          uri: photoUriBack,
          type: 'image/jpeg',
          name: 'approval_photo_back.jpg',
        } as any);
      }

      if (locationData) {
        formData.append('locationData', JSON.stringify(locationData));
      }

      console.log('Sending approval update with data:', {
        id,
        approvalStatus,
        hasPhotoFront: !!photoUriFront,
        hasPhotoBack: !!photoUriBack,
        hasLocation: !!locationData,
        inTransit,
      });

      const response = await api.patch<Item>(
        `/api/items/${id}/approval`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: data => {
            return data;
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
