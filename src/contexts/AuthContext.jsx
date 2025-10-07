import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const isAuthenticated = !!user;

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
    
    // Limpiar localStorage y sessionStorage
    localStorage.clear();
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
