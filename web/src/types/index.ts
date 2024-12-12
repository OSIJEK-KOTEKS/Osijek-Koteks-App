// src/types/index.ts
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
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company: string;
  role: 'admin' | 'user' | 'bot';
  codes: string[];
}

export interface Item {
  _id: string;
  title: string;
  code: string;
  pdfUrl: string;
  creationDate: string;
  creationTime?: string; // Added this field
  approvalStatus: 'na čekanju' | 'odobreno' | 'odbijen';
  approvalDate?: string;
  approvalTime?: string; // Added this field for consistency
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvalPhoto?: {
    url: string | null;
    uploadDate: string | null;
    uploadTime?: string | null; // Added this field for consistency
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
  pdfUrl: string;
  creationDate?: string;
  creationTime?: string; // Added this field
}
