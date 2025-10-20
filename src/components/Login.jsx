import React from 'react';
import { useNavigate } from 'react-router-dom';
import SteamAuth from './SteamAuth';

const Login = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    console.log('🎯 Login exitoso - Redirigiendo a la página principal...');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl border border-white/20">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mb-6 shadow-2xl">
            <span className="text-3xl">⚔️</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Dota 2 Matches
          </h1>
          <p className="text-blue-100 text-lg">
            Análisis profesional de partidas
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-3">
                Iniciar Sesión
              </h2>
              <p className="text-blue-100 leading-relaxed">
                Conecta tu cuenta de Steam para acceder a tus partidas y estadísticas
              </p>
            </div>
            <SteamAuth onLoginSuccess={handleLoginSuccess} />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <span>📊</span>
              <span>Análisis detallado de partidas</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <span>👥</span>
              <span>Detección de amigos en partidas</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <span>📈</span>
              <span>Estadísticas y tendencias</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <span>🔒</span>
              <span>Datos seguros y privados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
