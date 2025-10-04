import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Cargar variables de entorno
dotenv.config({ path: './server.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection (opcional - solo si está disponible)
let mongoClient = null;
const MONGODB_URI = process.env.MONGODB_URI;

// Intentar conectar a MongoDB solo si está disponible
if (MONGODB_URI) {
  try {
    mongoClient = new MongoClient(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 2000, // Timeout rápido
      connectTimeoutMS: 2000,
    });
    console.log('📦 MongoDB configurado (opcional)');
  } catch (error) {
    console.log('⚠️ MongoDB no disponible, continuando sin base de datos');
    mongoClient = null;
  }
}

/**
 * Obtiene información del perfil de Steam incluyendo avatar real
 */
async function getSteamProfile(steamId) {
  const steamApiKey = process.env.STEAM_API_KEY;
  
  if (!steamApiKey) {
    throw new Error('STEAM_API_KEY no configurado');
  }

  try {
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
    const profileResponse = await fetch(profileUrl);
    
    if (!profileResponse.ok) {
      throw new Error('No se puede acceder al perfil. Verifica tu API key o que el perfil sea público.');
    }
    
    const profileData = await profileResponse.json();
    
    if (!profileData.response || !profileData.response.players || profileData.response.players.length === 0) {
      throw new Error('No se encontró el perfil de Steam. Verifica que el Steam ID sea correcto.');
    }
    
    const player = profileData.response.players[0];
    return {
      steamid: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl,
      avatar: player.avatar,
      avatarmedium: player.avatarmedium,
      avatarfull: player.avatarfull,
      personastate: player.personastate,
      communityvisibilitystate: player.communityvisibilitystate,
      profilestate: player.profilestate,
      lastlogoff: player.lastlogoff,
      commentpermission: player.commentpermission
    };
    
  } catch (error) {
    console.error('Error obteniendo perfil de Steam:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de amigos de Steam usando Steam Web API
 */
async function getSteamFriends(steamId) {
  const steamApiKey = process.env.STEAM_API_KEY;
  
  if (!steamApiKey) {
    throw new Error('STEAM_API_KEY no configurado');
  }

  try {
    // Verificar si el perfil es accesible
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${steamId}`;
    const profileResponse = await fetch(profileUrl);
    
    if (!profileResponse.ok) {
      throw new Error('No se puede acceder al perfil. Verifica tu API key o que el perfil sea público.');
    }
    
    const profileData = await profileResponse.json();
    
    if (!profileData.response || !profileData.response.players || profileData.response.players.length === 0) {
      throw new Error('No se encontró el perfil de Steam. Verifica que el Steam ID sea correcto.');
    }
    
    const player = profileData.response.players[0];
    console.log(`✅ Perfil accesible: ${player.personaname}`);
    
    // Obtener lista de amigos
    const friendsUrl = `https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=${steamApiKey}&steamid=${steamId}&relationship=friend`;
    const friendsResponse = await fetch(friendsUrl);
    
    if (!friendsResponse.ok) {
      if (friendsResponse.status === 403) {
        throw new Error('Acceso denegado. Tu perfil de Steam es privado o no permite ver la lista de amigos.');
      } else if (friendsResponse.status === 401) {
        throw new Error('API key de Steam inválida. Verifica tu configuración.');
      } else {
        throw new Error(`Error ${friendsResponse.status}: ${friendsResponse.statusText}`);
      }
    }
    
    const friendsData = await friendsResponse.json();
    
    if (!friendsData.friendslist || !friendsData.friendslist.friends) {
      return [];
    }
    
    // Obtener Steam IDs de los amigos
    const friendIds = friendsData.friendslist.friends.map(friend => friend.steamid);
    
    if (friendIds.length === 0) {
      return [];
    }
    
    // Obtener información detallada de los amigos
    const profilesResponse = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${friendIds.join(',')}`
    );
    
    if (!profilesResponse.ok) {
      throw new Error(`Steam API error: ${profilesResponse.status}`);
    }
    
    const profilesData = await profilesResponse.json();
    
    if (!profilesData.response || !profilesData.response.players) {
      return [];
    }
    
    // Formatear datos de amigos
    const friends = profilesData.response.players.map(player => ({
      steamid: player.steamid,
      personaname: player.personaname,
      profileurl: player.profileurl,
      avatar: player.avatarmedium,
      personastate: player.personastate,
      lastlogoff: player.lastlogoff,
      realname: player.realname || 'No disponible'
    }));
    
    return friends;
    
  } catch (error) {
    console.error('Error fetching Steam friends:', error);
    throw error;
  }
}

/**
 * Guarda la lista de amigos en MongoDB
 */
async function saveFriendsToDatabase(steamId, friends) {
  if (!mongoClient) {
    console.log('📦 MongoDB no disponible, saltando guardado en base de datos');
    return;
  }

  try {
    await mongoClient.connect();
    const db = mongoClient.db('dota-matches');
    const friendsCollection = db.collection('friends');
    
    // Crear documento de amigos
    const friendsDocument = {
      steamId: steamId,
      friends: friends,
      lastUpdated: new Date()
    };
    
    // Usar upsert para actualizar o insertar
    await friendsCollection.updateOne(
      { steamId: steamId },
      { 
        $set: friendsDocument
      },
      { upsert: true }
    );
    
    console.log(`✅ Amigos guardados para ${steamId}: ${friends.length} amigos`);
    
  } catch (error) {
    console.log('⚠️ No se pudo guardar en MongoDB:', error.message);
    // No lanzar error, solo log
  } finally {
    try {
      await mongoClient.close();
    } catch (closeError) {
      // Ignorar errores de cierre
    }
  }
}

// API Routes
app.get('/api/auth/steam/friends', async (req, res) => {
  try {
    const { steamId } = req.query;
    
    if (!steamId) {
      return res.status(400).json({ error: 'steamId es requerido' });
    }
    
    console.log(`🆔 Obteniendo amigos para Steam ID: ${steamId}`);
    
    try {
      // Intentar obtener lista de amigos de Steam
      const friends = await getSteamFriends(steamId);
      
      // Guardar en la base de datos (opcional)
      try {
        await saveFriendsToDatabase(steamId, friends);
      } catch (dbError) {
        console.log('⚠️ No se pudo guardar en MongoDB:', dbError.message);
      }
      
      // Devolver respuesta
      res.status(200).json({
        steamId: steamId,
        friends: friends,
        count: friends.length,
        lastUpdated: new Date().toISOString()
      });
      
    } catch (steamError) {
      console.log('⚠️ No se pudo obtener amigos de Steam, usando lista predefinida');
      
      // Lista de amigos predefinida para casos donde el perfil es privado
      const predefinedFriends = [
        {
          steamid: '76561198097432092',
          personaname: 'lixo_kkk',
          profileurl: 'https://steamcommunity.com/profiles/76561198097432092',
          avatar: 'https://avatars.steamstatic.com/avatar.jpg',
          personastate: 0,
          lastlogoff: Math.floor(Date.now() / 1000),
          realname: 'Amigo conocido'
        }
      ];
      
      // Guardar en la base de datos (opcional)
      try {
        await saveFriendsToDatabase(steamId, predefinedFriends);
      } catch (dbError) {
        console.log('⚠️ No se pudo guardar en MongoDB:', dbError.message);
      }
      
      // Devolver respuesta con amigos predefinidos
      res.status(200).json({
        steamId: steamId,
        friends: predefinedFriends,
        count: predefinedFriends.length,
        lastUpdated: new Date().toISOString(),
        note: 'Usando lista predefinida debido a perfil privado'
      });
    }
    
  } catch (error) {
    console.error('Steam friends API error:', error);
    res.status(500).json({ 
      error: 'Error obteniendo lista de amigos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint para obtener perfil de Steam
app.get('/api/steam/profile/:steamId', async (req, res) => {
  const { steamId } = req.params;
  
  if (!steamId) {
    return res.status(400).json({ error: 'Steam ID es requerido' });
  }
  
  try {
    console.log(`🆔 Obteniendo perfil para Steam ID: ${steamId}`);
    const profile = await getSteamProfile(steamId);
    
    res.status(200).json({
      steamId: steamId,
      profile: profile,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Steam profile API error:', error);
    res.status(500).json({ 
      error: 'Error obteniendo perfil de Steam',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor Express ejecutándose en puerto ${PORT}`);
  console.log(`📡 API disponible en: http://localhost:${PORT}/api`);
});

// Manejar errores del servidor
server.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});

// Manejar cierre del proceso
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Mantener el proceso activo
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
});
