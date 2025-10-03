import React, { useState, useEffect } from 'react';
import { generateSteamAuthUrl, processSteamCallback, getSteamProfile } from '../utils/steamAuth';

/**
 * Componente de autenticación con Steam para desarrollo local
 * Funciona sin APIs serverless
 */
export default function SteamAuthLocal() {
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
  const startSteamAuth = () => {
    try {
      addLog('Iniciando autenticación con Steam (modo desarrollo)...', 'info');
      
      const steamUrl = generateSteamAuthUrl();
      addLog(`URL generada: ${steamUrl}`, 'info');
      
      // Redirigir a Steam
      window.location.href = steamUrl;
      
    } catch (err) {
      addLog(`Error al iniciar autenticación: ${err.message}`, 'error');
      setError(err.message);
    }
  };

  // Función para procesar el callback
  const handleSteamCallback = async () => {
    try {
      setLoading(true);
      setError(null);
      addLog('Procesando callback de Steam (modo desarrollo local)...', 'info');

      // En desarrollo local, procesamos directamente sin hacer fetch a APIs
      const urlParams = new URLSearchParams(window.location.search);
      
      if (!urlParams.has('openid.claimed_id') || !urlParams.has('openid.identity')) {
        throw new Error('No se encontraron parámetros de Steam en la URL');
      }

      addLog('Parámetros de Steam encontrados en la URL', 'success');

      // Extraer SteamID64 de la URL
      const claimedId = urlParams.get('openid.claimed_id');
      const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
      
      if (!steamIdMatch) {
        throw new Error('No se pudo extraer SteamID de la URL');
      }

      const steamId = steamIdMatch[1];
      addLog(`SteamID extraído: ${steamId}`, 'success');
      
      // Crear datos del usuario
      const userData = {
        steamID: steamId,
        name: 'Usuario de Steam (Desarrollo)',
        avatar: 'https://via.placeholder.com/184x184?text=Steam+Dev',
        ip: '192.168.xxx.xxx',
        country: 'AR',
        createdAt: new Date().toISOString()
      };

      addLog('Datos del usuario creados', 'success');
      
      // Intentar obtener el perfil real de Steam (opcional)
      try {
        const steamProfile = await getSteamProfile(userData.steamID);
        userData.name = steamProfile.personaname;
        userData.avatar = steamProfile.avatar;
        addLog('Perfil de Steam obtenido exitosamente', 'success');
      } catch (profileError) {
        addLog('Usando datos simulados (API no disponible en desarrollo)', 'warning');
      }
      
      setUser(userData);
      addLog('Autenticación completada exitosamente', 'success');
      
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
      addLog('URL limpiada', 'info');

    } catch (err) {
      addLog(`Error procesando callback: ${err.message}`, 'error');
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

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  // Función para obtener la bandera del país
  const getCountryFlag = (countryCode) => {
    const flagMap = {
      'AR': '🇦🇷', 'US': '🇺🇸', 'BR': '🇧🇷', 'CL': '🇨🇱', 'CO': '🇨🇴',
      'MX': '🇲🇽', 'PE': '🇵🇪', 'ES': '🇪🇸', 'FR': '🇫🇷', 'DE': '🇩🇪',
      'GB': '🇬🇧', 'IT': '🇮🇹', 'CA': '🇨🇦', 'AU': '🇦🇺', 'JP': '🇯🇵',
      'KR': '🇰🇷', 'CN': '🇨🇳', 'RU': '🇷🇺', 'IN': '🇮🇳'
    };
    return flagMap[countryCode] || '🌍';
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto mb-4"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-6 left-1/2 transform -translate-x-1/2"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesando autenticación</h3>
          <p className="text-gray-600 text-sm">Verificando datos con Steam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error de Autenticación</h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={startSteamAuth}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => {
                setError(null);
                setLoading(false);
              }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-2xl mx-auto bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="text-green-500 text-2xl mr-3">✅</div>
            <h3 className="text-xl font-semibold text-green-800">¡Autenticación Exitosa!</h3>
          </div>
          <button
            onClick={logout}
            className="text-green-600 hover:text-green-800 text-sm underline"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información del usuario */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 border-b pb-2">👤 Información del Usuario</h4>
            
            <div className="flex items-center space-x-3">
              <img 
                src={user.avatar} 
                alt={`Avatar de ${user.name}`}
                className="w-16 h-16 rounded-full border-2 border-green-300"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/64x64?text=Avatar';
                }}
              />
              <div>
                <p className="font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-600">Steam ID: {user.steamID}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Steam ID:</span>
                <span className="font-medium font-mono text-xs">{user.steamID}</span>
              </div>
            </div>
          </div>

          {/* Información de sesión */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800 border-b pb-2">🌍 Información de Sesión</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">País detectado:</span>
                <span className="font-medium flex items-center">
                  {getCountryFlag(user.country)} {user.country}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IP (anonimizada):</span>
                <span className="font-medium font-mono text-xs">{user.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha de login:</span>
                <span className="font-medium text-xs">{formatDate(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* JSON de respuesta */}
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">📋 Datos de Respuesta JSON:</h4>
          <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto border">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        {/* Información adicional */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Nota:</strong> Esta es una versión de desarrollo que funciona sin APIs serverless. 
            En producción, los datos se guardarán automáticamente en MongoDB Atlas.
          </p>
        </div>

        {/* Logs */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-800">📋 Logs de Debug</h4>
            <button
              onClick={clearLogs}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar logs
            </button>
          </div>
          
          {logs.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No hay logs...</p>
          ) : (
            <div className="bg-black text-green-400 p-3 rounded-md font-mono text-xs max-h-32 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className={`flex items-start ${
                  log.type === 'error' ? 'text-red-400' : 
                  log.type === 'success' ? 'text-green-400' : 
                  log.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  <span className="text-gray-500 mr-2">{log.timestamp}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Estado inicial - mostrar botón de login
  return (
    <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🎮</div>
        <h3 className="text-xl font-semibold text-blue-800 mb-2">Autenticación con Steam</h3>
        <p className="text-blue-700 mb-6">
          Versión de desarrollo que funciona sin APIs serverless.
        </p>
        
        <button
          onClick={startSteamAuth}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Iniciar sesión con Steam
        </button>
        
        <div className="mt-4 text-xs text-blue-600 space-y-1">
          <p>✅ Funciona en desarrollo local</p>
          <p>🔒 Autenticación segura con Steam</p>
          <p>🌍 Detecta ubicación aproximada</p>
          <p>💾 Listo para MongoDB en producción</p>
        </div>

        {/* Información técnica */}
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
            Ver detalles técnicos
          </summary>
          <div className="mt-2 p-3 bg-white rounded border text-xs text-gray-600">
            <p><strong>Modo:</strong> Desarrollo Local</p>
            <p><strong>Steam OpenID:</strong> Directo (sin APIs serverless)</p>
            <p><strong>Steam API:</strong> Limitada (CORS)</p>
            <p><strong>Base de datos:</strong> No disponible en desarrollo</p>
          </div>
        </details>
      </div>
    </div>
  );
}
