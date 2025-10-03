/**
 * Utilidades para autenticación con Steam
 * Versión para desarrollo local (las APIs serverless no funcionan en Vite dev)
 */

/**
 * Genera la URL de autenticación de Steam para desarrollo local
 */
export const generateSteamAuthUrl = () => {
  // Para desarrollo local, construimos la URL directamente
  const realm = window.location.origin; // http://localhost:5175
  const returnUrl = `${realm}/api/auth/steam/callback`;
  
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnUrl,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });

  return `https://steamcommunity.com/openid/login?${params.toString()}`;
};

/**
 * Procesa el callback de Steam en desarrollo local
 */
export const processSteamCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (!urlParams.has('openid.claimed_id') || !urlParams.has('openid.identity')) {
    throw new Error('No se encontraron parámetros de Steam en la URL');
  }

  // Extraer SteamID64 de la URL
  const claimedId = urlParams.get('openid.claimed_id');
  const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
  
  if (!steamIdMatch) {
    throw new Error('No se pudo extraer SteamID de la URL');
  }

  const steamId = steamIdMatch[1];
  
  // Simular datos del usuario (en producción esto vendría de Steam API)
  const userData = {
    steamID: steamId,
    name: 'Usuario de Steam (Desarrollo)',
    avatar: 'https://via.placeholder.com/184x184?text=Steam+Dev',
    ip: '192.168.xxx.xxx',
    country: 'AR',
    createdAt: new Date().toISOString()
  };

  return userData;
};

/**
 * Obtiene información del perfil de Steam usando la API
 */
export const getSteamProfile = async (steamId) => {
  const steamApiKey = import.meta.env.VITE_STEAM_API_KEY || 'F987D8BABA15BF060E7A70D190C52D0D';
  
  if (!steamApiKey) {
    console.warn('STEAM_API_KEY no configurado, usando datos de desarrollo');
    return {
      personaname: 'Usuario de Steam (Desarrollo)',
      avatar: 'https://via.placeholder.com/184x184?text=Steam+Dev'
    };
  }

  try {
    // Usar JSONP o fetch directo (Steam API no tiene CORS)
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`,
      { mode: 'no-cors' }
    );
    
    // Como no-cors no nos da acceso a la respuesta, usaremos datos simulados
    return {
      personaname: 'Usuario de Steam (Desarrollo)',
      avatar: 'https://via.placeholder.com/184x184?text=Steam+Dev'
    };
    
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    return {
      personaname: 'Usuario de Steam (Desarrollo)',
      avatar: 'https://via.placeholder.com/184x184?text=Steam+Dev'
    };
  }
};
