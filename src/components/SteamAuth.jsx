import React, { useEffect } from 'react';
import { useSteamAuth } from '../hooks/useSteamAuth';

/**
 * Componente de autenticación con Steam
 * Maneja el login/logout y muestra la información del usuario
 */
export default function SteamAuth({ onLoginSuccess }) {
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

  // Efecto para llamar al callback cuando el usuario se autentica
  useEffect(() => {
    console.log('🔍 SteamAuth - Estado de autenticación:', { isAuthenticated, user: !!user, onLoginSuccess: !!onLoginSuccess });
    if (isAuthenticated && user && onLoginSuccess) {
      console.log('🚀 Ejecutando callback de login exitoso...');
      onLoginSuccess();
    }
  }, [isAuthenticated, user, onLoginSuccess]);

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
      <div className="flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200/30"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <p className="text-blue-100 mt-4 text-lg font-medium">Procesando autenticación con Steam...</p>
        <div className="flex space-x-1 mt-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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

  // Estado inicial - mostrar botón de login
  return (
    <div className="text-center">
      <button
        onClick={loginWithSteam}
        className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center mx-auto min-w-[280px]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
        <div className="relative flex items-center space-x-3">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span className="text-lg">Iniciar Sesión con Steam</span>
        </div>
      </button>
      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
