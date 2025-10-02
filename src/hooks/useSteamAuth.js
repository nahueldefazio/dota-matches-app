import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar la autenticación con Steam
 * Proporciona funciones para iniciar sesión y obtener datos del usuario
 */
export const useSteamAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Inicia el proceso de autenticación con Steam
   * Redirige al usuario a Steam para autenticarse
   */
  const loginWithSteam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Redirigir al endpoint de autenticación de Steam
      window.location.href = '/api/auth/steam';
      
    } catch (err) {
      console.error('Error iniciando sesión con Steam:', err);
      setError('Error al iniciar sesión con Steam');
      setLoading(false);
    }
  }, []);

  /**
   * Procesa la respuesta de Steam después de la autenticación
   * Esta función debe ser llamada cuando el usuario regresa de Steam
   */
  const handleSteamCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Hacer fetch al callback endpoint
      const response = await fetch('/api/auth/steam/callback', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      
      // Validar que recibimos los datos esperados
      if (!userData.steamID) {
        throw new Error('No se recibieron datos válidos de Steam');
      }

      setUser(userData);
      
      // Limpiar la URL para remover parámetros de Steam
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return userData;
      
    } catch (err) {
      console.error('Error procesando callback de Steam:', err);
      setError(err.message || 'Error al procesar la autenticación');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cierra la sesión del usuario
   */
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    // Limpiar cualquier dato almacenado localmente si es necesario
  }, []);

  /**
   * Verifica si hay parámetros de Steam en la URL (callback)
   */
  const isSteamCallback = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('openid.claimed_id') && urlParams.has('openid.identity');
  }, []);

  return {
    user,
    loading,
    error,
    loginWithSteam,
    handleSteamCallback,
    logout,
    isSteamCallback,
    isAuthenticated: !!user
  };
};
