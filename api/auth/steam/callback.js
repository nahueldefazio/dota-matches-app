import { MongoClient } from 'mongodb';
import crypto from 'crypto';

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Extrae SteamID64 de la URL de Steam
 */
function extractSteamIdFromUrl(claimedId) {
  const match = claimedId.match(/\/id\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Anonimiza una dirección IP (opcional)
 */
function anonymizeIP(ip) {
  if (!ip || process.env.ANONYMIZE_IP !== 'true') return ip;
  
  // Remover los últimos 2 octetos de la IP
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return ip;
}

/**
 * Obtiene información del perfil de Steam usando Steam Web API
 */
async function getSteamProfile(steamId) {
  const steamApiKey = process.env.STEAM_API_KEY;
  
  if (!steamApiKey) {
    console.warn('STEAM_API_KEY no configurado, usando datos básicos');
    return {
      personaname: 'Usuario de Steam',
      avatar: 'https://via.placeholder.com/184x184?text=Steam'
    };
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`
    );
    
    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.response.players.length > 0) {
      const player = data.response.players[0];
      return {
        personaname: player.personaname || 'Usuario de Steam',
        avatar: player.avatarfull || player.avatarmedium || player.avatar || 'https://via.placeholder.com/184x184?text=Steam'
      };
    }
    
    return {
      personaname: 'Usuario de Steam',
      avatar: 'https://via.placeholder.com/184x184?text=Steam'
    };
    
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    return {
      personaname: 'Usuario de Steam',
      avatar: 'https://via.placeholder.com/184x184?text=Steam'
    };
  }
}

/**
 * Guarda los datos del usuario en MongoDB
 */
async function saveUserToDatabase(userData) {
  try {
    await client.connect();
    const db = client.db('dota-matches');
    const users = db.collection('users');
    
    // Crear documento del usuario
    const userDocument = {
      steamID: userData.steamID,
      name: userData.name,
      avatar: userData.avatar,
      ip: userData.ip,
      country: userData.country,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    // Usar upsert para actualizar o insertar
    await users.updateOne(
      { steamID: userData.steamID },
      { 
        $set: { 
          ...userDocument,
          lastLogin: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`Usuario guardado/actualizado: ${userData.steamID}`);
    
  } catch (error) {
    console.error('Error saving user to database:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Steam OpenID Callback Handler
 * Procesa la respuesta de Steam después de la autenticación
 */
export default async function handler(req, res) {
  // Solo permitir GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req;
    
    // Verificar que Steam devolvió los parámetros correctos
    if (!query['openid.claimed_id'] || !query['openid.identity']) {
      return res.status(400).json({ error: 'Parámetros de Steam faltantes' });
    }
    
    // Extraer SteamID64 de la URL
    const steamId = extractSteamIdFromUrl(query['openid.claimed_id']);
    
    if (!steamId) {
      return res.status(400).json({ error: 'No se pudo extraer SteamID' });
    }
    
    // Obtener información del perfil de Steam
    const steamProfile = await getSteamProfile(steamId);
    
    // Obtener información de la IP y ubicación
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress ||
                    'unknown';
    
    const country = req.headers['x-vercel-ip-country'] || 'unknown';
    
    // Preparar datos del usuario
    const userData = {
      steamID: steamId,
      name: steamProfile.personaname,
      avatar: steamProfile.avatar,
      ip: anonymizeIP(clientIP),
      country: country
    };
    
    // Guardar en la base de datos
    await saveUserToDatabase(userData);
    
    // Crear respuesta para el frontend
    const response = {
      steamID: userData.steamID,
      name: userData.name,
      avatar: userData.avatar,
      ip: userData.ip,
      country: userData.country,
      createdAt: new Date().toISOString()
    };
    
    // En lugar de redirigir, devolver JSON para consumo por el frontend
    // El frontend manejará la redirección después de procesar la respuesta
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Steam callback error:', error);
    res.status(500).json({ 
      error: 'Error en el proceso de autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
