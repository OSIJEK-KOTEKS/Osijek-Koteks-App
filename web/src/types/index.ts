export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  codes: string[];
  role: 'admin' | 'user' | 'bot' | 'pc-user';
  isVerified: boolean;
  phoneNumber?: string;
  hasFullAccess: boolean;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company: string;
  role: 'admin' | 'user' | 'bot' | 'pc-user';
  codes: string[];
  hasFullAccess?: boolean;
}

export interface Item {
  _id: string;
  title: string;
  code: string;
  registracija?: string;
  neto?: number;
  tezina?: number; // NEW: Add tezina field
  pdfUrl: string;
  creationDate: string;
  creationTime?: string;
  approvalStatus: 'na čekanju' | 'odobreno' | 'odbijen';
  approvalDate?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  in_transit: boolean;
  approvalPhotoFront?: {
    url: string | null;
    uploadDate: string | null;
    mimeType: string | null;
    publicId: string | null;
  } | null;
  approvalPhotoBack?: {
    url: string | null;
    uploadDate: string | null;
    mimeType: string | null;
    publicId: string | null;
  } | null;
  approvalDocument?: {
    url: string | null;
    uploadDate: string | null;
    mimeType: string | null;
    publicId: string | null;
  } | null;
  approvalLocation?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    accuracy: number;
    timestamp: Date;
  };
}

export interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  accuracy: number;
  timestamp: Date;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateItemInput {
  title: string;
  code: string;
  registracija?: string;
  neto?: number;
  tezina?: number; // NEW: Add tezina field
  pdfUrl: string;
  creationDate?: string;
  creationTime?: string;
}

export interface ItemFilters {
  startDate?: string;
  endDate?: string;
  code?: string;
  sortOrder?: string;
  searchTitle?: string;
  inTransitOnly?: boolean;
  // Add any additional filtering options as needed
}

// You can also add a utility type for date range operations
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeValidation {
  isValid: boolean;
  message?: string;
}

export interface DateRangePreset {
  label: string;
  startDate: Date;
  endDate: Date;
  action: () => void;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pages: number;
  hasMore: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface ApiServiceResponse<T = any> {
  status: number;
  data: T;
  message?: string;
}

export interface ApiService {
  // Auth methods
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (userData: RegistrationData) => Promise<User>;
  logout: () => Promise<void>;

  // User methods
  getUsers: () => Promise<User[]>;
  getUserProfile: () => Promise<User>;
  getUniqueCodes: () => Promise<string[]>;
  createUser: (userData: RegistrationData) => Promise<User>;
  updateUser: (
    id: string,
    userData: Partial<Omit<User, '_id'>>,
  ) => Promise<User>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<User>;

  // Item methods
  getItems: (
    page?: number,
    limit?: number,
    filters?: ItemFilters,
  ) => Promise<PaginatedResponse<Item>>;
  createItem: (itemData: CreateItemInput) => Promise<Item>;
  updateItem: (
    id: string,
    itemData: Partial<
      Omit<Item, '_id' | 'creationDate' | 'approvalDate' | 'approvedBy'>
    >,
  ) => Promise<Item>;
  updateItemApproval: (
    id: string,
    approvalStatus: Item['approvalStatus'],
    photoFront: File,
    photoBack: File,
    locationData: LocationData,
  ) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  updateItemApprovalWithPdf: (
    id: string,
    approvalStatus: Item['approvalStatus'],
    pdfDocument: File,
    inTransit: boolean,
    neto?: number,
  ) => Promise<Item>;
}
