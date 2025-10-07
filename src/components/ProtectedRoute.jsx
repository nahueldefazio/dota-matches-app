import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSteamAuth } from '../hooks/useSteamAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSteamAuth();

  console.log('🛡️ ProtectedRoute - Estado:', { isAuthenticated, loading });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200/30"></div>
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-white text-xl font-medium mb-4">Verificando autenticación...</p>
          <div className="flex space-x-1 justify-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
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
