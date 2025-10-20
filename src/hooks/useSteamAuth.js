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
      
      // Obtener datos reales del perfil de Steam
      console.log('🔍 Obteniendo perfil real de Steam...');
      try {
        const profileResponse = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_API_KEY&steamids=${steamId}`);
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const player = profileData.response.players[0];
          
          if (player) {
            const userData = {
              steamID: steamId,
              name: player.personaname || `Usuario Steam ${steamId.substring(0, 8)}`,
              avatar: player.avatarfull || player.avatarmedium || player.avatar,
              profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}/`,
              personState: player.personastate || 0,
              communityVisibility: player.communityvisibilitystate || 3,
              createdAt: new Date().toISOString()
            };
            
            login(userData);
            console.log('✅ Usuario autenticado (real):', userData);
            
            // Cargar amigos automáticamente
            console.log('👥 Cargando amigos automáticamente...');
            await fetchSteamFriends(steamId);
            
            return userData;
          }
        }
      } catch (error) {
        console.warn('⚠️ No se pudo obtener perfil real, usando datos simulados...');
      }
      
      // Fallback con datos simulados si no se puede obtener información real
      const userData = {
        steamID: steamId,
        name: `Usuario Steam ${steamId.substring(0, 8)}`,
        avatar: `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}/`,
        personState: 0,
        communityVisibility: 3,
        createdAt: new Date().toISOString()
      };

      login(userData);
      console.log('✅ Usuario autenticado (simulado):', userData);
      
      // Cargar amigos simulados
      console.log('👥 Cargando amigos simulados...');
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
      
      // Intentar obtener amigos reales de Steam
      try {
        const friendsResponse = await fetch(`https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=YOUR_API_KEY&steamid=${steamId}&relationship=friend`);
        
        if (friendsResponse.ok) {
          const friendsData = await friendsResponse.json();
          const friendIds = friendsData.friendslist.friends.map(friend => friend.steamid).join(',');
          
          if (friendIds) {
            const friendsDetailsResponse = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=YOUR_API_KEY&steamids=${friendIds}`);
            
            if (friendsDetailsResponse.ok) {
              const friendsDetails = await friendsDetailsResponse.json();
              const friends = friendsDetails.response.players.map(player => ({
                steamid: player.steamid,
                personaname: player.personaname,
                avatar: player.avatarfull || player.avatarmedium || player.avatar,
                personastate: player.personastate || 0
              }));
              
              setFriends(friends);
              console.log(`✅ Lista de amigos reales cargada: ${friends.length} amigos`);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron obtener amigos reales, usando datos simulados...');
      }
      
      // Fallback con datos simulados
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockFriends = [
        {
          steamid: '76561198012345678',
          personaname: 'Amigo Demo 1',
          avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
          personastate: 1
        },
        {
          steamid: '76561198087654321',
          personaname: 'Amigo Demo 2', 
          avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
          personastate: 0
        },
        {
          steamid: '76561198123456789',
          personaname: 'Amigo Demo 3',
          avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
          personastate: 1
        }
      ];
      
      setFriends(mockFriends);
      console.log(`✅ Lista de amigos simulados cargada: ${mockFriends.length} amigos`);
      
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
