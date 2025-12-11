import axios from 'axios';
import {
  User,
  LoginResponse,
  Item,
  CreateItemInput,
  LocationData,
  RegistrationData,
  ItemFilters,
  PaginatedResponse,
  ApiService,
  ItemUser,
  Bill,
} from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'https://osijek-koteks-app.onrender.com';

export const getImageUrl = (path: string) => {
  if (path?.startsWith('http')) {
    return path;
  }
  return `${API_URL}${path}`;
};

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
  }
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
  }
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

      const response = await api.post<LoginResponse>('/api/auth/register', userData);

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
  getUniqueUsers: async (): Promise<ItemUser[]> => {
    try {
      console.log('Fetching unique users who created items...');
      const response = await api.get<ItemUser[]>('/api/items/users');
      console.log('Received unique users:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching unique users:', error);
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

  // Bill methods
  getBills: async (): Promise<Bill[]> => {
    try {
      const response = await api.get<Bill[]>('/api/bills');
      return response.data;
    } catch (error) {
      console.error('Error fetching bills:', error);
      throw error;
    }
  },

  createBill: async (billData: {
    title: string;
    description?: string;
    dobavljac: Bill['dobavljac'];
    itemIds: string[];
  }): Promise<Bill> => {
    try {
      const response = await api.post<Bill>('/api/bills', billData);
      return response.data;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw error;
    }
  },

  // Get users with optional pagination and sorting
  getUsersPaginated: async (
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'firstName',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedResponse<User>> => {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await api.get<PaginatedResponse<User>>(`/api/users?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching paginated users:', error);
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
        canAccessRacuni: userData.canAccessRacuni || false,
      });

      console.log('User creation successful:', {
        userId: response.data._id,
        email: response.data.email,
        hasFullAccess: response.data.hasFullAccess,
        canAccessRacuni: response.data.canAccessRacuni,
      });

      return response.data;
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  },

  updateUser: async (id: string, userData: Partial<Omit<User, '_id'>>): Promise<User> => {
    try {
      console.log('Updating user:', id, {
        ...userData,
        hasFullAccess: userData.hasFullAccess || false,
        canAccessRacuni: userData.canAccessRacuni || false,
      });

      const response = await api.patch<User>(`/api/users/${id}`, {
        ...userData,
        hasFullAccess: userData.hasFullAccess || false,
        canAccessRacuni: userData.canAccessRacuni || false,
      });

      console.log('User update successful:', {
        userId: response.data._id,
        hasFullAccess: response.data.hasFullAccess,
        canAccessRacuni: response.data.canAccessRacuni,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  updateUserPassword: async (userId: string, newPassword: string): Promise<User> => {
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

  updateUserCodes: async (id: string, codes: string[]): Promise<User> => {
    try {
      const response = await api.patch<User>(`/api/users/${id}/codes`, { codes });
      return response.data;
    } catch (error) {
      console.error('Error updating user codes:', error);
      throw error;
    }
  },

  // Toggle user's full access
  toggleUserFullAccess: async (id: string, hasFullAccess: boolean): Promise<User> => {
    try {
      console.log('Toggling full access for user:', id, hasFullAccess);
      const response = await api.patch<User>(`/api/users/${id}/access`, {
        hasFullAccess,
      });

      console.log('Full access update successful:', {
        userId: response.data._id,
        hasFullAccess: response.data.hasFullAccess,
      });

      return response.data;
    } catch (error) {
      console.error('Error toggling user full access:', error);
      throw error;
    }
  },

  getItems: async (
    page: number = 1,
    limit: number = 10,
    filters?: ItemFilters
  ): Promise<PaginatedResponse<Item>> => {
    try {
      console.log('Making API request with filters:', filters);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      // YOUR EXISTING FILTER PARAMS (keep all of these as they are):
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.code && filters.code !== 'all') params.append('code', filters.code);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.searchTitle) params.append('searchTitle', filters.searchTitle);
      if (filters?.searchRegistration)
        params.append('searchRegistration', filters.searchRegistration);
      if (filters?.inTransitOnly) params.append('inTransitOnly', 'true');
      if (filters?.prijevoznik && filters.prijevoznik.trim())
        params.append('prijevoznik', filters.prijevoznik);
      if (filters?.paidStatus) params.append('paidStatus', filters.paidStatus);

      // ADD ONLY THIS ONE LINE to your existing params:
      if (filters?.createdByUser && filters.createdByUser !== 'all')
        params.append('createdByUser', filters.createdByUser);

      // Keep the rest of your getItems method exactly as it is:
      console.log('Request URL params:', params.toString());

      const response = await api.get<PaginatedResponse<Item>>(`/api/items?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  createItem: async (itemData: CreateItemInput): Promise<Item> => {
    try {
      console.log('Creating new item:', itemData);

      // Prepare the item payload
      const itemPayload = {
        ...itemData,
        tezina: itemData.neto, // Set tezina to the same value as neto
        // Only include prijevoznik if it has a value
        ...(itemData.prijevoznik &&
          itemData.prijevoznik.trim() && {
            prijevoznik: itemData.prijevoznik.trim(),
          }),
      };

      console.log('Item payload with tezina and prijevoznik:', itemPayload);

      const response = await api.post<Item>('/api/items', itemPayload);
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  updateItem: async (
    id: string,
    itemData: Partial<Omit<Item, '_id' | 'creationDate' | 'approvalDate' | 'approvedBy'>>
  ): Promise<Item> => {
    try {
      console.log('Updating item:', id, itemData);

      // Prepare update data with prijevoznik handling
      const updatePayload = {
        ...itemData,
        // Handle prijevoznik field properly
        ...(itemData.prijevoznik !== undefined && {
          prijevoznik: itemData.prijevoznik?.trim() || null,
        }),
      };

      const response = await api.patch<Item>(`/api/items/${id}`, updatePayload);
      return response.data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  updateItemCode: async (itemId: string, newCode: string): Promise<any> => {
    try {
      console.log('Updating item code:', { itemId, newCode });

      const response = await api.patch(`/api/items/${itemId}/code`, {
        code: newCode,
      });

      console.log('Code update successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating item code:', error);
      throw error;
    }
  },

  updateItemApproval: async (
    id: string,
    approvalStatus: Item['approvalStatus'],
    photoFront: File,
    photoBack: File,
    locationData: LocationData,
    inTransit: boolean = false
  ): Promise<Item> => {
    try {
      const formData = new FormData();
      formData.append('photoFront', photoFront);
      formData.append('photoBack', photoBack);
      formData.append('approvalStatus', approvalStatus);
      formData.append('locationData', JSON.stringify(locationData));
      formData.append('inTransit', inTransit.toString());

      const response = await api.patch<Item>(`/api/items/${id}/approval`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error in photo approval:', error);
      throw error;
    }
  },

  updateItemApprovalWithPdf: async (
    id: string,
    approvalStatus: Item['approvalStatus'],
    pdfDocument: File,
    inTransit: boolean = false,
    neto?: number
  ): Promise<Item> => {
    try {
      console.log('Sending PDF approval request:', {
        id,
        approvalStatus,
        pdfName: pdfDocument.name,
        pdfSize: pdfDocument.size,
        inTransit,
        neto,
      });

      const formData = new FormData();
      formData.append('pdfDocument', pdfDocument);
      formData.append('approvalStatus', approvalStatus);
      formData.append('inTransit', inTransit.toString());

      // Add neto if provided
      if (neto !== undefined) {
        formData.append('neto', neto.toString());
      }

      const response = await api.patch<Item>(`/api/items/${id}/approval`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error in PDF approval:', error);
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

  //  Get unique prijevoznik values for filtering
  getUniqueCarriers: async (): Promise<string[]> => {
    try {
      const response = await api.get<string[]>('/api/items/carriers');
      return response.data;
    } catch (error) {
      console.error('Error fetching unique carriers:', error);
      throw error;
    }
  },

  markItemPaid: async (id: string, isPaid: boolean = true): Promise<Item> => {
    try {
      console.log('Marking item as paid:', { id, isPaid });
      const response = await api.patch<Item>(`/api/items/${id}/pay`, { isPaid });
      return response.data;
    } catch (error) {
      console.error('Error marking item as paid:', error);
      throw error;
    }
  },
};

export default apiService;
