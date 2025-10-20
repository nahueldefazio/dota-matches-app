import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personalizado para manejar la autenticación con Steam
 * Proporciona funciones para iniciar sesión y obtener datos del usuario
 */
export const useSteamAuth = () => {
  const authContext = useAuth();
  const { user, loading, error, friends, loadingFriends, isAuthenticated, login, logout, setFriends, setLoading, setError, setLoadingFriends } = authContext;

  /**
   * Inicia el proceso de autenticación con Steam
   * Redirige al usuario a Steam para autenticarse
   */
  const loginWithSteam = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Usar autenticación local - Steam regresará a la página actual
      const realm = window.location.origin;
      const returnUrl = window.location.href;
      
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
      });

      const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
      window.location.href = steamAuthUrl;
      
    } catch (err) {
      console.error('Error iniciando sesión con Steam:', err);
      setError('Error al iniciar sesión con Steam');
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Procesa la respuesta de Steam después de la autenticación
   * Esta función debe ser llamada cuando el usuario regresa de Steam
   */
  const handleSteamCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const urlParams = new URLSearchParams(window.location.search);
      
      if (!urlParams.has('openid.claimed_id') || !urlParams.has('openid.identity')) {
        throw new Error('No se encontraron parámetros de Steam en la URL');
      }

      const claimedId = urlParams.get('openid.claimed_id');
      const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
      
      if (!steamIdMatch) {
        throw new Error('No se pudo extraer SteamID de la URL');
      }

      const steamId = steamIdMatch[1];
      
      // Crear datos del usuario con información simulada
      const userData = {
        steamID: steamId,
        name: `Usuario Steam ${steamId.substring(0, 8)}`,
        avatar: `https://via.placeholder.com/184x184/2196F3/FFFFFF?text=Steam+${steamId.substring(0, 4)}`,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
        createdAt: new Date().toISOString()
      };

      login(userData);
      console.log('✅ Usuario autenticado:', userData);
      
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
  }, [login, setLoading, setError]);

  /**
   * Obtiene la lista de amigos de Steam
   */
  const fetchSteamFriends = useCallback(async (steamId) => {
    if (!steamId) {
      console.log('❌ No hay Steam ID disponible para obtener amigos');
      return;
    }

    try {
      setLoadingFriends(true);
      console.log(`🆔 Obteniendo amigos para Steam ID: ${steamId}`);
      
      // Simular carga de amigos (en una implementación real, harías fetch a una API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Datos simulados de amigos
      const mockFriends = [
        {
          steamid: '76561198012345678',
          personaname: 'Amigo 1',
          avatar: 'https://via.placeholder.com/64x64/2196F3/FFFFFF?text=A1',
          personastate: 1
        },
        {
          steamid: '76561198087654321',
          personaname: 'Amigo 2', 
          avatar: 'https://via.placeholder.com/64x64/4CAF50/FFFFFF?text=A2',
          personastate: 0
        }
      ];
      
      setFriends(mockFriends);
      console.log(`✅ Lista de amigos cargada: ${mockFriends.length} amigos`);
      
    } catch (error) {
      console.error('❌ Error obteniendo amigos de Steam:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, [setFriends, setLoadingFriends]);

  /**
   * Cierra la sesión del usuario
   */
  const logoutUser = useCallback(() => {
    logout();
    console.log('🧹 Sesión cerrada - Todos los datos han sido eliminados');
  }, [logout]);

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
    friends,
    loadingFriends,
    loginWithSteam,
    handleSteamCallback,
    logout: logoutUser,
    isSteamCallback,
    isAuthenticated: !!user,
    fetchSteamFriends
  };
};
