export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PDFViewer: {pdfUrl: string};
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  codes: string[];
  role: 'admin' | 'user' | 'bot';
  isVerified: boolean;
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
