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
    name: `Usuario Steam ${steamId.substring(0, 8)}`,
    avatar: `https://via.placeholder.com/184x184/2196F3/FFFFFF?text=Steam+${steamId.substring(0, 4)}`,
    ip: '192.168.xxx.xxx',
    country: 'AR',
    createdAt: new Date().toISOString()
  };

  return userData;
};

/**
 * Obtiene información del perfil de Steam usando la API
 * En desarrollo local, retorna datos simulados debido a CORS
 */
export const getSteamProfile = async (steamId) => {
  console.log(`Intentando obtener perfil para SteamID: ${steamId}`);
  
  // En desarrollo local, la Steam API no es accesible debido a CORS
  // En producción, esto se manejaría en el backend
  return {
    personaname: `Usuario Steam ${steamId.substring(0, 8)}`,
    avatar: `https://via.placeholder.com/184x184/2196F3/FFFFFF?text=Steam+${steamId.substring(0, 4)}`
  };
};
