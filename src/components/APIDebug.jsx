import React, { useState } from 'react';

/**
 * Componente simple para debuggear las APIs
 */
export default function APIDebug() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const testEndpoint = async (endpoint, name) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    
    try {
      console.log(`Testing ${name}: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        type: response.type,
        ok: response.ok
      };
      
      // Intentar obtener el contenido si es texto
      try {
        const text = await response.text();
        result.text = text.substring(0, 500); // Limitar a 500 caracteres
      } catch (e) {
        result.text = 'No se pudo leer el contenido';
      }
      
      setResults(prev => ({ ...prev, [name]: result }));
      console.log(`${name} result:`, result);
      
    } catch (error) {
      const errorResult = {
        error: error.message,
        type: 'network_error'
      };
      setResults(prev => ({ ...prev, [name]: errorResult }));
      console.error(`${name} error:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const endpoints = [
    { name: 'Steam Auth', url: '/api/auth/steam' },
    { name: 'Steam Callback', url: '/api/auth/steam/callback' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">🔧 Debug de APIs</h2>
        
        <div className="space-y-4">
          {endpoints.map(endpoint => (
            <div key={endpoint.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">{endpoint.name}</h3>
                <button
                  onClick={() => testEndpoint(endpoint.url, endpoint.name)}
                  disabled={loading[endpoint.name]}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    loading[endpoint.name]
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading[endpoint.name] ? '⏳ Probando...' : '🧪 Probar'}
                </button>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <strong>URL:</strong> {endpoint.url}
              </div>
              
              {results[endpoint.name] && (
                <div className="bg-gray-100 p-3 rounded-md">
                  <h4 className="font-medium mb-2">Resultado:</h4>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(results[endpoint.name], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Información del entorno */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🌍 Información del Entorno</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>URL Actual:</strong> {window.location.href}</p>
            <p><strong>Host:</strong> {window.location.host}</p>
            <p><strong>Puerto:</strong> {window.location.port}</p>
            <p><strong>Protocolo:</strong> {window.location.protocol}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">📋 Instrucciones</h3>
          <div className="text-sm text-green-700 space-y-2">
            <p>1. Haz clic en "🧪 Probar" para cada endpoint</p>
            <p>2. Revisa los resultados en la consola del navegador (F12)</p>
            <p>3. El endpoint de Steam Auth debería devolver una redirección (302)</p>
            <p>4. Si hay errores, verifica que el servidor esté corriendo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
