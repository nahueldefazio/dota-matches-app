import React, { useState } from "react";

export default function DotaMatchesSimple() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dota 2 Ranked Matches - Simple Version</h1>
      
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">📅 Selecciona el período de partidas a cargar</h3>
        <p className="text-sm text-blue-700 mb-4">
          Elige qué período de tiempo quieres analizar para encontrar amigos en tus partidas.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={() => console.log('Último día')}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-center"
          >
            <div className="text-lg">📅</div>
            <div className="font-medium">Último día</div>
            <div className="text-xs opacity-90">Partidas de hoy</div>
          </button>
          
          <button
            onClick={() => console.log('Última semana')}
            className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-center"
          >
            <div className="text-lg">📆</div>
            <div className="font-medium">Última semana</div>
            <div className="text-xs opacity-90">7 días</div>
          </button>
          
          <button
            onClick={() => console.log('Último mes')}
            className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-center"
          >
            <div className="text-lg">📊</div>
            <div className="font-medium">Último mes</div>
            <div className="text-xs opacity-90">30 días</div>
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 mx-auto mb-4"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-8 left-1/2 transform -translate-x-1/2"></div>
          <p className="text-gray-600">Cargando partidas...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {matches.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">Partidas cargadas: {matches.length}</h2>
        </div>
      )}
    </div>
  );
}
