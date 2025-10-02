import { MongoClient } from 'mongodb';
import crypto from 'crypto';

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Steam OpenID configuration
const STEAM_REALM = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';
const STEAM_RETURN_URL = `${STEAM_REALM}/api/auth/steam/callback`;

/**
 * Steam OpenID Authentication Handler
 * Maneja el inicio del proceso de autenticación con Steam
 */
export default async function handler(req, res) {
  // Solo permitir GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generar nonce único para seguridad
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Parámetros para Steam OpenID
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': STEAM_RETURN_URL,
      'openid.realm': STEAM_REALM,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    // Guardar nonce en la sesión (usando cookies como alternativa simple)
    res.setHeader('Set-Cookie', `steam_nonce=${nonce}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`);
    
    // Redirigir a Steam
    const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
    res.redirect(302, steamAuthUrl);

  } catch (error) {
    console.error('Steam auth error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
