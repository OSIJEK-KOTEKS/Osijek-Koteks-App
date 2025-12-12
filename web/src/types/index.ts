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
  canAccessRacuni?: boolean;
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
  canAccessRacuni?: boolean;
}

export interface Item {
  _id: string;
  title: string;
  code: string;
  registracija?: string;
  neto?: number;
  tezina?: number;
  prijevoznik?: string;
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

  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
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
  isPaid?: boolean;
  paidAt?: string;
  paidBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
}

export interface ItemUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
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
  tezina?: number;
  prijevoznik?: string;

  pdfUrl: string;
  creationDate?: string;
  creationTime?: string;
}

export interface ItemFilters {
  startDate?: string;
  endDate?: string;
  code?: string;
  sortOrder?: string;
  prijevoznik?: string;
  searchTitle?: string;
  searchRegistration?: string;
  inTransitOnly?: boolean;
  createdByUser?: string;
  paidStatus?: 'paid' | 'unpaid';
}

export interface Bill {
  _id: string;
  title: string;
  dobavljac: 'KAMEN - PSUNJ d.o.o.' | 'MOLARIS d.o.o.' | 'VELIČKI KAMEN d.o.o.';
  description?: string;
  attachment?: {
    url: string | null;
    publicId: string | null;
    uploadDate: string | null;
    mimeType: string | null;
    originalName?: string | null;
  } | null;
  items: Item[];
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

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
  totalWeight?: number;
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
  updateUser: (id: string, userData: Partial<Omit<User, '_id'>>) => Promise<User>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<User>;
  getBills: () => Promise<Bill[]>;
  createBill: (billData: {
    title: string;
    description?: string;
    dobavljac: Bill['dobavljac'];
    itemIds: string[];
    billPdf?: File;
  }) => Promise<Bill>;

  // Item methods
  getItems: (
    page?: number,
    limit?: number,
    filters?: ItemFilters
  ) => Promise<PaginatedResponse<Item>>;
  createItem: (itemData: CreateItemInput) => Promise<Item>;
  updateItem: (
    id: string,
    itemData: Partial<Omit<Item, '_id' | 'creationDate' | 'approvalDate' | 'approvedBy'>>
  ) => Promise<Item>;
  updateItemApproval: (
    id: string,
    approvalStatus: Item['approvalStatus'],
    photoFront: File,
    photoBack: File,
    locationData: LocationData
  ) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
  updateItemApprovalWithPdf: (
    id: string,
    approvalStatus: Item['approvalStatus'],
    pdfDocument: File,
    inTransit: boolean,
    neto?: number
  ) => Promise<Item>;
  markItemPaid: (id: string, isPaid?: boolean) => Promise<Item>;
}
