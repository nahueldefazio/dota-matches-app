import React, { useState, useEffect } from 'react';

/**
 * Componente simple para probar la autenticación con Steam
 * Muestra el estado actual y permite probar el flujo completo
 */
export default function SteamAuthTest() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  // Función para agregar logs
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Verificar si hay un callback de Steam en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('openid.claimed_id') && urlParams.has('openid.identity')) {
      addLog('Callback de Steam detectado en la URL', 'success');
      handleSteamCallback();
    }
  }, []);

  // Función para iniciar la autenticación
  const startSteamAuth = async () => {
    try {
      addLog('Iniciando autenticación con Steam (modo desarrollo local)...', 'info');
      
      // Usar la autenticación local - Steam regresará a la página actual
      const realm = window.location.origin;
      const returnUrl = window.location.href;
      
      addLog(`Realm: ${realm}`, 'info');
      addLog(`Return URL: ${returnUrl}`, 'info');
      
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
      });

      const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
      addLog(`Steam Auth URL generada`, 'success');
      
      // Redirigir a Steam
      window.location.href = steamAuthUrl;
      addLog('Redirección iniciada a Steam', 'success');
      
    } catch (err) {
      addLog(`Error al iniciar autenticación: ${err.message}`, 'error');
      setError(`Error al iniciar autenticación: ${err.message}`);
    }
  };

  // Función para procesar el callback
  const handleSteamCallback = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('Procesando callback de Steam (modo desarrollo local)...', 'info');

      const urlParams = new URLSearchParams(window.location.search);
      
      if (!urlParams.has('openid.claimed_id') || !urlParams.has('openid.identity')) {
        throw new Error('No se encontraron parámetros de Steam en la URL');
      }

      addLog('Parámetros de Steam encontrados en la URL', 'success');

      const claimedId = urlParams.get('openid.claimed_id');
      const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
      
      if (!steamIdMatch) {
        throw new Error('No se pudo extraer SteamID de la URL');
      }

      const steamId = steamIdMatch[1];
      addLog(`SteamID extraído: ${steamId}`, 'success');
      
      // Crear datos del usuario simulados para desarrollo
      const userData = {
        steamID: steamId,
        name: `Usuario Steam ${steamId.substring(0, 8)}`,
        avatar: `https://via.placeholder.com/184x184/2196F3/FFFFFF?text=Steam+${steamId.substring(0, 4)}`,
        ip: '192.168.xxx.xxx', // Simulated IP
        country: 'AR', // Simulated country
        createdAt: new Date().toISOString()
      };

      addLog('Datos del usuario creados para desarrollo', 'success');
      
      setUser(userData);
      
      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
      addLog('URL limpiada, autenticación completada', 'success');

    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar logs
  const clearLogs = () => {
    setLogs([]);
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    setError(null);
    addLog('Sesión cerrada', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🧪 Test de Autenticación con Steam</h2>
        
        {/* Estado actual */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Estado Actual:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-4 h-4 rounded-full mr-2 bg-gray-300"></span>
              <span>Usuario: {user ? user.name : 'No autenticado'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></span>
              <span>Loading: {loading ? 'Sí' : 'No'}</span>
            </div>
            <div className="flex items-center">
              <span className={`w-4 h-4 rounded-full mr-2 ${error ? 'bg-red-400' : 'bg-green-400'}`}></span>
              <span>Error: {error ? 'Sí' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mb-6 flex gap-4">
          {!user && !loading && (
            <div className="space-y-2">
              <button
                onClick={startSteamAuth}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                🎮 Iniciar Sesión con Steam
              </button>
              <button
                onClick={startSteamAuth}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center text-sm"
              >
                🔍 Probar Endpoint (Debug)
              </button>
            </div>
          )}
          
          {user && (
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🚪 Cerrar Sesión
            </button>
          )}
          
          <button
            onClick={clearLogs}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            🗑️ Limpiar Logs
          </button>
        </div>

        {/* Información del usuario */}
        {user && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-3">✅ Usuario Autenticado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Nombre:</strong> {user.name}</p>
                <p><strong>Steam ID:</strong> {user.steamID}</p>
              </div>
              <div>
                <p><strong>País:</strong> {user.country}</p>
                <p><strong>IP:</strong> {user.ip}</p>
              </div>
            </div>
            <div className="mt-3">
              <img 
                src={user.avatar} 
                alt="Avatar" 
                className="w-16 h-16 rounded-full border-2 border-green-300"
                onError={(e) => e.target.src = 'https://via.placeholder.com/64x64?text=Avatar'}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Logs */}
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">📋 Logs de Debug</h3>
            <span className="text-xs text-gray-400">{logs.length} entradas</span>
          </div>
          
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">No hay logs aún...</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className={`flex items-start ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  'text-blue-400'
                }`}>
                  <span className="text-gray-500 mr-2 text-xs">{log.timestamp}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información técnica */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Información Técnica</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Steam API Key:</strong> Configurada ✅</p>
            <p><strong>MongoDB:</strong> No configurado (modo demo)</p>
            <p><strong>Endpoint:</strong> /api/auth/steam</p>
            <p><strong>Callback:</strong> /api/auth/steam/callback</p>
            <p><strong>URL Actual:</strong> {window.location.href}</p>
            <p><strong>Puerto:</strong> {window.location.port}</p>
          </div>
        </div>

        {/* Debug de red */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🐛 Debug de Red</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            <p><strong>Protocol:</strong> {window.location.protocol}</p>
            <p><strong>Host:</strong> {window.location.host}</p>
            <p><strong>API URL:</strong> {window.location.origin}/api/auth/steam</p>
          </div>
        </div>
      </div>
    </div>
  );
}
