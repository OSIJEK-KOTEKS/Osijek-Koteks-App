import {StackNavigationProp} from '@react-navigation/stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp} from '@react-navigation/native';

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  AuthenticatedStack: undefined;
  Main: undefined;
  PDFViewer: {pdfUrl: string};
  PhotoViewer: {photoUrl: string};
};

export type AdminTabParamList = {
  Dokumenti: undefined;
  Korisnici: undefined;
};

export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;

export type MainStackNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList, 'Dokumenti'>,
  StackNavigationProp<RootStackParamList>
>;

export type MainTabScreenProps = {
  navigation: MainStackNavigationProp;
};

export type TabNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<AdminTabParamList>,
  StackNavigationProp<RootStackParamList>
>;

// User Types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  codes: string[];
  role: 'admin' | 'user' | 'bot';
  isVerified: boolean;
  phoneNumber?: string;
  hasFullAccess?: boolean;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company: string;
  role: 'admin' | 'user' | 'bot';
  codes: string[];
  hasFullAccess?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Item Types
export interface Item {
  _id: string;
  title: string;
  code: string;
  registracija?: string;
  pdfUrl: string;
  creationDate: string;
  creationTime?: string;
  approvalStatus: 'na čekanju' | 'odobreno' | 'odbijen';
  approvalDate?: string;
  approvalTime?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvalPhoto?: {
    url: string | null;
    uploadDate: string | null;
    uploadTime?: string | null;
    mimeType: string | null;
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

export interface CreateItemFormData {
  title: string;
  code: string;
  registracija?: string;
  pdfUrl: string;
  creationDate?: string;
}

export interface CreateItemInput {
  title: string;
  code: string;
  registracija?: string;
  pdfUrl: string;
  creationDate?: string;
  creationTime?: string;
}

// Location Types
export interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  accuracy: number;
  timestamp: Date;
}

export interface PhotoCaptureResult {
  uri: string;
  location: LocationData;
}

// API Response Types
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

export interface ItemFilters {
  startDate?: string;
  endDate?: string;
  code?: string;
  sortOrder?: string;
}
