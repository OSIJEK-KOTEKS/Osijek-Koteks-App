import type {StackNavigationProp} from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PDFViewer: {pdfUrl: string};
};

export type AdminTabParamList = {
  Items: undefined;
  Users: undefined;
};

export type MainScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

export interface MainScreenProps {
  navigation: MainScreenNavigationProp;
}

export interface User {
  _id: string; // Change this from 'id' to '_id'
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
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalDate?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}
