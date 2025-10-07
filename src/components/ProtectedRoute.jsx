import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSteamAuth } from '../hooks/useSteamAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSteamAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 mx-auto mb-4"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-8 left-1/2 transform -translate-x-1/2"></div>
          <p className="text-white text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
