import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar la autenticación con Steam
 * Proporciona funciones para iniciar sesión y obtener datos del usuario
 */
export const useSteamAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

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
      
      // Obtener datos reales del perfil de Steam desde el servidor
      console.log('🔍 Obteniendo perfil real de Steam...');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const profileResponse = await fetch(`${apiBaseUrl}/api/steam/profile/${steamId}`);
      
      if (!profileResponse.ok) {
        throw new Error('No se pudo obtener el perfil de Steam');
      }
      
      const profileData = await profileResponse.json();
      const profile = profileData.profile;
      
      // Crear datos del usuario con información real de Steam
      const userData = {
        steamID: steamId,
        name: profile.personaname,
        avatar: profile.avatarfull || profile.avatarmedium || profile.avatar,
        profileUrl: profile.profileurl,
        personState: profile.personastate,
        communityVisibility: profile.communityvisibilitystate,
        createdAt: new Date().toISOString()
      };

      setUser(userData);
      
      // Cargar automáticamente los amigos después de la autenticación
      console.log('👥 Cargando amigos automáticamente...');
      await fetchSteamFriends(steamId);
      
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
      
      // Usar la API del backend en lugar de peticiones directas
      // Agregar retry mechanism para manejar problemas de conexión
      let response;
      let retries = 3;
      let lastError;
      
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`🔄 Intento ${i + 1}/${retries} de conexión al servidor...`);
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
          response = await fetch(`${apiBaseUrl}/api/auth/steam/friends?steamId=${steamId}`);
          break; // Si la conexión es exitosa, salir del loop
        } catch (error) {
          lastError = error;
          console.log(`❌ Intento ${i + 1} falló: ${error.message}`);
          if (i < retries - 1) {
            console.log(`⏳ Esperando 2 segundos antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('No se pudo conectar al servidor después de varios intentos');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`👥 Amigos obtenidos: ${data.count} amigos`);
      
      if (data.friends && data.friends.length > 0) {
        setFriends(data.friends);
        console.log(`✅ Lista de amigos cargada exitosamente: ${data.friends.length} amigos`);
        
        // Mostrar información de los amigos en consola
        data.friends.forEach((friend, index) => {
          const statusText = {
            0: '🔴 Offline',
            1: '🟢 Online',
            2: '🟡 Busy',
            3: '🟠 Away',
            4: '😴 Snooze',
            5: '💼 Looking to trade',
            6: '🎮 Looking to play'
          }[friend.personastate] || '❓ Unknown';
          
          console.log(`👤 Amigo ${index + 1}: ${friend.personaname} (${friend.steamid}) - ${statusText}`);
        });
      } else {
        console.log('❌ No se encontraron amigos');
        setFriends([]);
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo amigos de Steam:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  /**
   * Cierra la sesión del usuario
   */
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    setFriends([]);
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
    friends,
    loadingFriends,
    loginWithSteam,
    handleSteamCallback,
    logout,
    isSteamCallback,
    isAuthenticated: !!user,
    fetchSteamFriends
  };
};
