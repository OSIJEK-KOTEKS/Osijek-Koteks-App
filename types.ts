import {StackNavigationProp} from '@react-navigation/stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {CompositeNavigationProp, RouteProp} from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PDFViewer: {pdfUrl: string};
  PhotoViewer: {photoUrl: string};
  CreateItem: undefined; // Add this new route
};

export type AdminTabParamList = {
  Dokumenti: undefined;
  Korisnici: undefined;
};

export interface CreateItemFormData {
  title: string;
  code: string;
  pdfUrl: string;
  creationDate?: string;
}
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
}
