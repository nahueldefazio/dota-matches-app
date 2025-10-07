import React from 'react';
import { useNavigate } from 'react-router-dom';
import SteamAuth from './SteamAuth';

const Login = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    console.log('🎯 Login exitoso - Redirigiendo a la página principal...');
    // Redirigir a la página principal después del login exitoso
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🎮 Dota Matches
          </h1>
          <p className="text-blue-200 text-lg">
            Analiza tus partidas de Dota 2 con tus amigos
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Iniciar Sesión
            </h2>
            <p className="text-blue-200 mb-6">
              Conecta tu cuenta de Steam para acceder a tus partidas y estadísticas
            </p>
            
            <SteamAuth onLoginSuccess={handleLoginSuccess} />
          </div>

          <div className="text-sm text-blue-300">
            <p>🔒 Tus datos están seguros</p>
            <p>📊 Solo accedemos a información pública de Steam</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
