import React, { useEffect } from 'react';
import { useSteamAuth } from '../hooks/useSteamAuth';

/**
 * Componente de autenticación con Steam
 * Maneja el login/logout y muestra la información del usuario
 */
export default function SteamAuth() {
  const {
    user,
    loading,
    error,
    friends,
    loadingFriends,
    loginWithSteam,
    handleSteamCallback,
    logout,
    isSteamCallback,
    isAuthenticated
  } = useSteamAuth();

  // Efecto para manejar el callback de Steam automáticamente
  useEffect(() => {
    if (isSteamCallback() && !isAuthenticated && !loading) {
      handleSteamCallback();
    }
  }, [isSteamCallback, isAuthenticated, loading, handleSteamCallback]);

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

  // Función para obtener la bandera del país (usando emoji)
  const getCountryFlag = (countryCode) => {
    const flagMap = {
      'AR': '🇦🇷',
      'US': '🇺🇸',
      'BR': '🇧🇷',
      'CL': '🇨🇱',
      'CO': '🇨🇴',
      'MX': '🇲🇽',
      'PE': '🇵🇪',
      'ES': '🇪🇸',
      'FR': '🇫🇷',
      'DE': '🇩🇪',
      'GB': '🇬🇧',
      'IT': '🇮🇹',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
      'JP': '🇯🇵',
      'KR': '🇰🇷',
      'CN': '🇨🇳',
      'RU': '🇷🇺',
      'IN': '🇮🇳'
    };
    
    return flagMap[countryCode] || '🌍';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto mb-4"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-8 left-1/2 transform -translate-x-1/2"></div>
          <p className="text-gray-600">Procesando autenticación con Steam...</p>
        </div>
      </div>
    );
  }


  if (isAuthenticated && user) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="text-green-500 text-xl mr-2">✅</div>
            <h3 className="text-green-800 font-semibold text-lg">¡Autenticado con Steam!</h3>
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
            <h4 className="font-semibold text-gray-800 border-b pb-2">Información del Usuario</h4>
            
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
            <h4 className="font-semibold text-gray-800 border-b pb-2">Información de Sesión</h4>
            
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

            {/* Información adicional */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>ℹ️ Nota:</strong> Tu información se ha guardado de forma segura en nuestra base de datos. 
                La IP ha sido anonimizada para proteger tu privacidad.
              </p>
            </div>
          </div>
        </div>

        {/* Sección de amigos */}
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">Lista de Amigos de Steam</h4>
          
          {loadingFriends ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 mx-auto mr-3"></div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent absolute"></div>
              <span className="text-gray-600">Cargando lista de amigos...</span>
            </div>
          ) : friends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.slice(0, 12).map((friend, index) => {
                const statusText = {
                  0: '🔴 Offline',
                  1: '🟢 Online',
                  2: '🟡 Busy',
                  3: '🟠 Away',
                  4: '😴 Snooze',
                  5: '💼 Looking to trade',
                  6: '🎮 Looking to play'
                }[friend.personastate] || '❓ Unknown';
                
                return (
                  <div key={friend.steamid} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={friend.avatar} 
                        alt={`Avatar de ${friend.personaname}`}
                        className="w-10 h-10 rounded-full border border-gray-300"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/40x40?text=Avatar';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{friend.personaname}</p>
                        <p className="text-xs text-gray-500">{statusText}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-600">No se encontraron amigos o la lista está vacía</p>
            </div>
          )}
          
          {friends.length > 12 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              Mostrando 12 de {friends.length} amigos
            </p>
          )}
        </div>

        {/* JSON de respuesta (para desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-2">Datos de respuesta (Desarrollo):</h4>
            <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // Estado inicial - no mostrar nada
  return null;
}
