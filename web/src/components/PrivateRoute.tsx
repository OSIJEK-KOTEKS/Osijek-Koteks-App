import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import styled from 'styled-components';

interface PrivateRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 1.2rem;
  color: ${({theme}) => theme.colors.text};
`;

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const {user, isLoading} = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingContainer>Učitavanje...</LoadingContainer>;
  }

  if (!user) {
    return <Navigate to="/login" state={{from: location}} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
