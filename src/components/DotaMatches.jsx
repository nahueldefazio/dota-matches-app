import React, { useEffect, useState } from "react";

const DEFAULT_STEAM32_ID = 72810287;
const HEROES_API = "https://api.opendota.com/api/heroes";

export default function DotaMatches() {
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [filter, setFilter] = useState("all"); // all, solo, party
  const [loading, setLoading] = useState(true);
  const [steamId, setSteamId] = useState(DEFAULT_STEAM32_ID.toString());
  const [steam64Id, setSteam64Id] = useState("");
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(false);

  // Cargar partidas
  useEffect(() => {
    async function fetchMatches() {
      if (!steamId || steamId.trim() === "") {
        setError("Por favor ingresa un Steam ID válido");
        setLoading(false);
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

  const filteredMatches = matches.filter((m) => {
    if (filter === "solo") return m.party_size === 1;
    if (filter === "party") return m.party_size > 1;
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dota 2 Ranked Matches</h1>

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

          <div className="flex justify-center">
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

      <div className="mb-4 flex gap-2">
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

      {/* Estadísticas por filtro */}
      {!loading && !error && (
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

      {loading ? (
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
                <td className="border px-2 py-1">{m.party_size}</td>
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
