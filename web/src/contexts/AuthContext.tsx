import React, {createContext, useContext, useState, useEffect} from 'react';
import {User} from '../types/index';
import {apiService} from '../utils/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (token) {
          const userProfile = await apiService.getUserProfile();
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('userToken');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const signIn = async (token: string) => {
    try {
      localStorage.setItem('userToken', token);
      const userProfile = await apiService.getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await apiService.logout();
      localStorage.removeItem('userToken');
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{user, isLoading, signIn, signOut}}>
      {children}
    </AuthContext.Provider>
  );
};
