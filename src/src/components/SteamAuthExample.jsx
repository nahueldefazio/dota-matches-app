import React, { useState, useEffect } from 'react';

/**
 * Ejemplo completo de cómo consumir el endpoint de autenticación con Steam
 * Este componente demuestra el flujo completo de autenticación
 */
export default function SteamAuthExample() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authStep, setAuthStep] = useState('idle'); // idle, redirecting, processing, success, error

  // Verificar si hay un callback de Steam en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('openid.claimed_id') && urlParams.has('openid.identity')) {
      handleSteamCallback();
    }
  }, []);

  // Función para iniciar el proceso de autenticación
  const startSteamAuth = () => {
    setAuthStep('redirecting');
    setError(null);
    
    // Redirigir al endpoint de autenticación de Steam
    window.location.href = '/api/auth/steam';
  };

  // Función para procesar el callback de Steam
  const handleSteamCallback = async () => {
    try {
      setLoading(true);
      setAuthStep('processing');
      setError(null);

      console.log('🔄 Procesando callback de Steam...');

      // Hacer fetch al callback endpoint
      const response = await fetch('/api/auth/steam/callback', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Respuesta del servidor:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const userData = await response.json();
      console.log('✅ Datos del usuario recibidos:', userData);

      // Validar que recibimos los datos esperados
      if (!userData.steamID) {
        throw new Error('No se recibieron datos válidos de Steam');
      }

      setUser(userData);
      setAuthStep('success');

      // Limpiar la URL para remover parámetros de Steam
      window.history.replaceState({}, document.title, window.location.pathname);

      console.log('🎉 Autenticación exitosa!');

    } catch (err) {
      console.error('❌ Error en callback de Steam:', err);
      setError(err.message || 'Error al procesar la autenticación');
      setAuthStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    setError(null);
    setAuthStep('idle');
    console.log('👋 Sesión cerrada');
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

  // Renderizado de estados de carga
  if (loading || authStep === 'processing') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto mb-4"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-6 left-1/2 transform -translate-x-1/2"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Procesando autenticación</h3>
          <p className="text-gray-600 text-sm">
            {authStep === 'processing' ? 'Verificando datos con Steam...' : 'Cargando...'}
          </p>
        </div>
      </div>
    );
  }

  // Renderizado de error
  if (error || authStep === 'error') {
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
                setAuthStep('idle');
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

  // Renderizado de éxito
  if (user && authStep === 'success') {
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
            <strong>ℹ️ Nota:</strong> Esta información se ha guardado de forma segura en MongoDB Atlas. 
            La IP ha sido anonimizada para proteger tu privacidad. El Steam ID se puede usar 
            automáticamente para cargar tus partidas de Dota 2.
          </p>
        </div>
      </div>
    );
  }

  // Renderizado inicial - botón de login
  return (
    <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🎮</div>
        <h3 className="text-xl font-semibold text-blue-800 mb-2">Autenticación con Steam</h3>
        <p className="text-blue-700 mb-6">
          Este es un ejemplo completo de cómo integrar la autenticación con Steam en tu aplicación React.
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
        
        <div className="mt-6 text-xs text-blue-600 space-y-1">
          <p>✅ Autenticación segura con Steam OpenID</p>
          <p>🔒 No almacenamos tu contraseña</p>
          <p>🌍 Detectamos tu ubicación aproximada</p>
          <p>💾 Guardamos datos en MongoDB Atlas</p>
        </div>

        {/* Información técnica */}
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
            Ver detalles técnicos
          </summary>
          <div className="mt-2 p-3 bg-white rounded border text-xs text-gray-600">
            <p><strong>Endpoint de inicio:</strong> /api/auth/steam</p>
            <p><strong>Endpoint de callback:</strong> /api/auth/steam/callback</p>
            <p><strong>Método:</strong> GET</p>
            <p><strong>Respuesta:</strong> JSON con datos del usuario</p>
            <p><strong>Base de datos:</strong> MongoDB Atlas</p>
          </div>
        </details>
      </div>
    </div>
  );
}
