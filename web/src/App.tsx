import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import RacuniPage from './pages/RacuniPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/users"
            element={
              <PrivateRoute adminOnly>
                <UserManagementPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/racuni"
            element={
              <PrivateRoute requiresRacuniAccess>
                <RacuniPage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
