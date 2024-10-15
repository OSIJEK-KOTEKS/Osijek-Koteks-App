import {initializeApp, getApps} from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  databaseURL: '', // Add this line
};

export const initializeFirebase = () => {
  if (getApps().length === 0) {
    console.log('Initializing Firebase with config:', firebaseConfig);
    try {
      const app = initializeApp(firebaseConfig);
      console.log('Firebase initialized successfully');
      return app;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
      return null;
    }
  } else {
    console.log('Firebase already initialized');
    return getApps()[0];
  }
};
