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
  }, []);

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
      
      // Crear datos del usuario simulados para desarrollo
      const userData = {
        steamID: steamId,
        name: `Usuario Steam ${steamId.substring(0, 8)}`,
        avatar: `https://ui-avatars.com/api/?name=Steam+${steamId.substring(0, 4)}&size=184&background=2196F3&color=ffffff`,
        ip: '192.168.xxx.xxx', // Simulated IP
        country: 'AR', // Simulated country
        createdAt: new Date().toISOString()
      };

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
