import React, { useEffect, useState } from "react";

const DEFAULT_STEAM32_ID = 72810287;
const HEROES_API = "https://api.opendota.com/api/heroes";

export default function DotaMatches() {
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [filter, setFilter] = useState("all"); // all, solo, party
  const [loading, setLoading] = useState(true);
  const [steamId, setSteamId] = useState(DEFAULT_STEAM32_ID.toString());
  const [error, setError] = useState("");

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

  const handleSteamIdChange = (e) => {
    setSteamId(e.target.value);
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
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="steamId" className="block text-sm font-medium text-gray-700 mb-2">
              Steam ID (32-bit)
            </label>
            <input
              type="text"
              id="steamId"
              value={steamId}
              onChange={handleSteamIdChange}
              placeholder="Ej: 72810287"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa el Steam ID de 32-bit del jugador que quieres analizar
            </p>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Buscar
          </button>
        </form>
        
        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
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
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Cargando partidas...</p>
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
