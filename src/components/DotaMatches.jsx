import React, { useEffect, useState } from "react";
import SteamAuth from "./SteamAuth";

const DEFAULT_STEAM32_ID = 72810287;
const HEROES_API = "https://api.opendota.com/api/heroes";

export default function DotaMatches() {
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [filter, setFilter] = useState("all"); // all, solo, party
  const [loading, setLoading] = useState(false);
  const [steamId, setSteamId] = useState("");
  const [steam64Id, setSteam64Id] = useState("");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // Cargar partidas solo cuando hay un Steam ID
  useEffect(() => {
    async function fetchMatches() {
      if (!steamId || steamId.trim() === "") {
        setMatches([]);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      
      try {
        const API_URL = `https://api.opendota.com/api/players/${steamId}/matches?lobby_type=7`;
        const res = await fetch(API_URL);
        
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setMatches(data);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError(`Error al cargar partidas: ${err.message}`);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [steamId]);

  // Cargar héroes para convertir hero_id → nombre
  useEffect(() => {
    async function fetchHeroes() {
      try {
        const res = await fetch(HEROES_API);
        const data = await res.json();
        const map = {};
        data.forEach((h) => {
          map[h.id] = h.localized_name;
        });
        setHeroes(map);
      } catch (err) {
        console.error("Error fetching heroes:", err);
      }
    }
    fetchHeroes();
  }, []);

  // Efecto para manejar la autenticación de Steam
  useEffect(() => {
    // Verificar si hay un callback de Steam en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('openid.claimed_id') && urlParams.has('openid.identity')) {
      // Procesar el callback de Steam
      handleSteamCallback();
    }
  }, []);

  // Función para manejar el callback de Steam
  const handleSteamCallback = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/steam/callback', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      
      if (userData.steamID) {
        setAuthenticatedUser(userData);
        
        // Convertir SteamID64 a SteamID32 automáticamente
        const steam32Id = convertSteam64ToSteam32(userData.steamID);
        if (steam32Id && steam32Id !== "0") {
          setSteamId(steam32Id);
          setSteam64Id(userData.steamID);
        }
        
        // Limpiar la URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
    } catch (err) {
      console.error('Error procesando callback de Steam:', err);
      setError(`Error de autenticación: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el party_size con fallback
  const getPartySize = (match) => {
    // Si party_size existe y es válido, lo usamos
    if (match.party_size !== undefined && match.party_size !== null && match.party_size > 0) {
      return match.party_size;
    }
    
    // Fallback: intentar inferir desde otros campos
    // Si hay party_id, probablemente sea party
    if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
      // Si hay party_id pero no party_size, asumimos que es un party
      // En la mayoría de casos, party_id > 0 indica que no es solo
      return 2; // Asumimos party de al menos 2
    }
    
    // Verificar si hay otros indicadores de party
    // Por ejemplo, si hay lobby_type específico para party
    if (match.lobby_type === 7) { // Ranked matchmaking
      // En ranked, si no hay party_id, probablemente sea solo
      return 1;
    }
    
    // Si no hay información suficiente, asumimos que es solo (1)
    return 1;
  };

  const filteredMatches = matches.filter((m) => {
    const partySize = getPartySize(m);
    if (filter === "solo") return partySize === 1;
    if (filter === "party") return partySize > 1;
    return true;
  });

  const formatDate = (timestamp) =>
    new Date(timestamp * 1000).toLocaleString();

  const didWin = (match) => {
    // Radiant = 0, Dire = 1
    const isRadiant = match.player_slot < 128;
    return (isRadiant && match.radiant_win) || (!isRadiant && !match.radiant_win);
  };

  // Calcular estadísticas por filtro
  const calculateStats = (matches) => {
    const total = matches.length;
    const wins = matches.filter(didWin).length;
    const losses = total - wins;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    return {
      total,
      wins,
      losses,
      winRate
    };
  };

  const currentStats = calculateStats(filteredMatches);

  // Función para convertir Steam64 a Steam32
  const convertSteam64ToSteam32 = (steam64) => {
    if (!steam64 || steam64.trim() === "") return "";
    
    const steam64Num = BigInt(steam64);
    // Steam32 = Steam64 - 76561197960265728
    const steam32 = steam64Num - BigInt("76561197960265728");
    return steam32.toString();
  };

  const handleSteamIdChange = (e) => {
    setSteamId(e.target.value);
  };

  const handleSteam64IdChange = (e) => {
    const steam64 = e.target.value;
    setSteam64Id(steam64);
    
    // Convertir automáticamente a Steam32
    if (steam64.trim() !== "") {
      setConverting(true);
      setTimeout(() => {
        try {
          const steam32 = convertSteam64ToSteam32(steam64);
          if (steam32 && steam32 !== "0") {
            setSteamId(steam32);
          }
        } catch (error) {
          console.error("Error converting Steam64:", error);
        }
        setConverting(false);
      }, 300); // Pequeño delay para mostrar el spinner
    } else {
      setSteamId("");
      setConverting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (steamId.trim() !== "") {
      setSteamId(steamId.trim());
    }
  };

  // Función para iniciar sesión con Steam
  const loginWithSteam = () => {
    window.location.href = '/api/auth/steam';
  };

  // Función para cerrar sesión
  const logout = () => {
    setAuthenticatedUser(null);
    setSteamId("");
    setSteam64Id("");
    setMatches([]);
    setError("");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dota 2 Ranked Matches</h1>

      {/* Componente de autenticación con Steam */}
      <SteamAuth />

      {/* Mostrar información del usuario autenticado */}
      {authenticatedUser && (
        <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={authenticatedUser.avatar} 
                alt={`Avatar de ${authenticatedUser.name}`}
                className="w-10 h-10 rounded-full border-2 border-green-300"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/40x40?text=Avatar';
                }}
              />
              <div>
                <p className="font-medium text-gray-800">¡Hola, {authenticatedUser.name}!</p>
                <p className="text-sm text-gray-600">Steam ID cargado automáticamente</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Input para Steam ID */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Steam64 Input */}
            <div>
              <label htmlFor="steam64Id" className="block text-sm font-medium text-gray-700 mb-2">
                Steam ID (64-bit) - Fácil de encontrar
              </label>
              <input
                type="text"
                id="steam64Id"
                value={steam64Id}
                onChange={handleSteam64IdChange}
                placeholder="Ej: 76561198045611095"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tu Steam ID completo (se convierte automáticamente)
              </p>
            </div>

            {/* Steam32 Input */}
            <div>
              <label htmlFor="steamId" className="block text-sm font-medium text-gray-700 mb-2">
                Steam ID (32-bit) - Para la API
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="steamId"
                  value={steamId}
                  onChange={handleSteamIdChange}
                  placeholder="Ej: 72810287"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {converting && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {converting ? "Convirtiendo..." : "Se genera automáticamente desde Steam64"}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-8 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Buscando...
                </>
              ) : (
                <>
                  🔍 Buscar Partidas
                </>
              )}
            </button>
            
            {!authenticatedUser && (
              <button
                type="button"
                onClick={loginWithSteam}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
              >
                🎮 Iniciar sesión con Steam
              </button>
            )}
          </div>
        </form>
        
        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Información sobre cómo encontrar Steam ID */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">💡 ¿Cómo encontrar tu Steam ID?</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Opción 1:</strong> Ve a tu perfil de Steam → URL del perfil → copia los números al final</p>
            <p><strong>Opción 2:</strong> Usa <a href="https://steamid.io" target="_blank" rel="noopener noreferrer" className="underline">steamid.io</a> y pega tu URL de Steam</p>
            <p><strong>Opción 3:</strong> En Dota 2, ve a Configuración → Cuenta → tu Steam ID está ahí</p>
          </div>
        </div>
      </div>

      {/* Filtros solo se muestran cuando hay datos */}
      {steamId && matches.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded ${
                filter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("solo")}
              className={`px-4 py-2 rounded ${
                filter === "solo" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              Solo Queue
            </button>
            <button
              onClick={() => setFilter("party")}
              className={`px-4 py-2 rounded ${
                filter === "party" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              Party
            </button>
          </div>
          
          {/* Nota sobre party_size inferido */}
          {matches.some(m => m.party_size === undefined) && (
            <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
              <span className="font-medium">ℹ️ Nota:</span> Algunas partidas muestran valores inferidos de party size (⚠️) 
              cuando la API no proporciona esta información. Se usa lógica de respaldo basada en party_id.
            </div>
          )}
        </div>
      )}

      {/* Estadísticas por filtro */}
      {!loading && !error && steamId && matches.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">
            Estadísticas - Steam ID: {steamId} - {filter === "all" ? "Todas las partidas" : filter === "solo" ? "Solo Queue" : "Party"}
          </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentStats.total}</div>
            <div className="text-sm text-gray-600">Total Partidas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentStats.wins}</div>
            <div className="text-sm text-gray-600">Victorias</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{currentStats.losses}</div>
            <div className="text-sm text-gray-600">Derrotas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{currentStats.winRate}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
        </div>
        {currentStats.total > 0 && (
          <div className="mt-3 text-center">
            <div className="text-sm text-gray-600">
              Promedio: {currentStats.wins}W - {currentStats.losses}L 
              {currentStats.wins > 0 && currentStats.losses > 0 && (
                <span className="ml-2">(Ratio: {(currentStats.wins / currentStats.losses).toFixed(2)})</span>
              )}
            </div>
          </div>
        )}
        </div>
      )}

      {!steamId && !loading && !error ? (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center space-y-4">
            <div className="text-6xl mb-4">🎮</div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">¡Bienvenido a Dota Matches!</h3>
              <p className="text-gray-600 mb-4">Ingresa un Steam ID para comenzar a analizar partidas</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Puedes usar tu Steam ID completo (64-bit) o el formato corto (32-bit)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="inline-flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">Cargando partidas...</p>
              <p className="text-sm text-gray-500 mt-1">Analizando datos del jugador</p>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-gray-600">No se pudieron cargar las partidas</p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-2 py-1">Match ID</th>
              <th className="border px-2 py-1">Hero</th>
              <th className="border px-2 py-1">K/D/A</th>
              <th className="border px-2 py-1">Duration (min)</th>
              <th className="border px-2 py-1">Party Size</th>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.map((m) => (
              <tr
                key={m.match_id}
                className={`hover:bg-gray-100 ${
                  didWin(m) ? "bg-green-100" : "bg-red-100"
                }`}
              >
                <td className="border px-2 py-1">{m.match_id}</td>
                <td className="border px-2 py-1">{heroes[m.hero_id] || m.hero_id}</td>
                <td className="border px-2 py-1">
                  {m.kills}/{m.deaths}/{m.assists}
                </td>
                <td className="border px-2 py-1">{Math.floor(m.duration / 60)}</td>
                <td className="border px-2 py-1">
                  <span className="flex items-center">
                    {getPartySize(m)}
                    {m.party_size === undefined && (
                      <span 
                        className="text-xs text-orange-500 ml-1 cursor-help" 
                        title="Valor inferido - La API no proporcionó party_size"
                      >
                        ⚠️
                      </span>
                    )}
                  </span>
                </td>
                <td className="border px-2 py-1">{formatDate(m.start_time)}</td>
                <td className="border px-2 py-1">{didWin(m) ? "Win" : "Lose"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
