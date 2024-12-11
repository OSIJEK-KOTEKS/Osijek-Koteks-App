import React, {createContext, useContext, useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {User, LoginResponse} from '../types';
import {apiService} from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signIn: (token: string, userProfile: User) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('userToken');
        const userId = localStorage.getItem('userId');

        if (token && userId) {
          try {
            const userProfile = await apiService.getUserProfile();
            setUser(userProfile);
          } catch (error) {
            console.error('Error fetching user profile:', error);
            localStorage.removeItem('userToken');
            localStorage.removeItem('userId');
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  const signIn = async (token: string, userProfile: User) => {
    try {
      setIsLoading(true);
      setError(null);

      // Store auth data
      localStorage.setItem('userToken', token);
      localStorage.setItem('userId', userProfile._id);

      // Set user state
      setUser(userProfile);
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Authentication failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
      setUser(null);
      localStorage.removeItem('userToken');
      localStorage.removeItem('userId');
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      setError('Error during logout');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
