import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Cargar estado inicial desde localStorage
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('dota-matches-user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Error cargando usuario desde localStorage:', error);
      return null;
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const isAuthenticated = !!user;

  // Persistir cambios de usuario en localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('dota-matches-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dota-matches-user');
    }
  }, [user]);

  const login = useCallback((userData) => {
    console.log('🔐 AuthContext - Login:', userData);
    setUser(userData);
    setError(null);
  }, []);

  const logout = useCallback(() => {
    console.log('🔐 AuthContext - Logout');
    setUser(null);
    setError(null);
    setFriends([]);
    setLoadingFriends(false);
    
    // Limpiar datos específicos de la app
    localStorage.removeItem('dota-matches-user');
    sessionStorage.clear();
    
    // Limpiar cookies si las hay
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    // Limpiar la URL para remover parámetros de Steam
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const setFriendsData = useCallback((friendsData) => {
    setFriends(friendsData);
  }, []);

  const setLoadingState = useCallback((loadingState) => {
    setLoading(loadingState);
  }, []);

  const setErrorState = useCallback((errorState) => {
    setError(errorState);
  }, []);

  const setLoadingFriendsState = useCallback((loadingState) => {
    setLoadingFriends(loadingState);
  }, []);

  const value = {
    user,
    loading,
    error,
    friends,
    loadingFriends,
    isAuthenticated,
    login,
    logout,
    setFriends: setFriendsData,
    setLoading: setLoadingState,
    setError: setErrorState,
    setLoadingFriends: setLoadingFriendsState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
