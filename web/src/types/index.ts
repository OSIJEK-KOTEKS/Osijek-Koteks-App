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

export interface Item {
  _id: string;
  title: string;
  code: string;
  pdfUrl: string;
  creationDate: string;
  approvalStatus: 'na čekanju' | 'odobreno' | 'odbijen';
  approvalDate?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  approvalPhoto?: {
    url: string | null;
    uploadDate: string | null;
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
}
