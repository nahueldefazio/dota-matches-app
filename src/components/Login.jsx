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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl border border-white/20">
        {/* Logo and Title */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-4">
            Dota Matches
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Analiza tus partidas de Dota 2 con tus amigos
          </p>
        </div>

        {/* Login Section */}
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
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>🔒 Tus datos están seguros</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>📊 Solo accedemos a información pública de Steam</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-blue-200">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>⚡ Análisis en tiempo real</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
