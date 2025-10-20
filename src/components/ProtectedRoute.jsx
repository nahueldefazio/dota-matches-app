import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSteamAuth } from '../hooks/useSteamAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useSteamAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  console.log('🛡️ ProtectedRoute - Estado:', { isAuthenticated, loading, user: !!user, isInitialized });

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200/30 mx-auto"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-blue-100 mt-4 text-lg">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🛡️ Usuario no autenticado, redirigiendo a login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
