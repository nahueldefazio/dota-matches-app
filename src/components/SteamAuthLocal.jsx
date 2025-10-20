import React, { useState, useEffect } from 'react';
import { generateSteamAuthUrl, processSteamCallback } from '../utils/steamAuth';

/**
 * Componente de autenticación con Steam para desarrollo local
 * Funciona sin APIs serverless
 */
export default function SteamAuthLocal({ onLoginSuccess }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Verificar si hay un callback de Steam en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('openid.claimed_id') && urlParams.has('openid.identity')) {
      handleSteamCallback();
    }
  }, []);

  // Función para iniciar la autenticación
  const startSteamAuth = () => {
    try {
      const steamUrl = generateSteamAuthUrl();
      window.location.href = steamUrl;
    } catch (err) {
      setError(err.message);
    }
  };

  // Función para procesar el callback
  const handleSteamCallback = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await processSteamCallback();
      setUser(userData);
      
      // Llamar al callback de éxito si existe
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200/30"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
        </div>
        <p className="text-blue-100 mt-4 text-lg font-medium">Procesando autenticación con Steam...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error de Autenticación</h3>
        <p className="text-red-700 text-sm mb-4">{error}</p>
        <button
          onClick={startSteamAuth}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
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
      </div>
    );
  }

  // Estado inicial - mostrar botón de login
  return (
    <div className="text-center">
      <button
        onClick={startSteamAuth}
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
    </div>
  );
}
