import React, { useEffect, useState, useCallback } from "react";
import SteamAuth from "./SteamAuth";
import { processSteamCallback } from "../utils/steamAuth";

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
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsInMatches, setFriendsInMatches] = useState({});
  const [checkingFriends, setCheckingFriends] = useState(false);
  const [timeFilter, setTimeFilter] = useState("month");
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false); // day, week, month, all

  // No cargar partidas automáticamente - solo cuando el usuario seleccione un tiempo
  // useEffect(() => {
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
        console.log('🔗 Cargando partidas desde OpenDota API...');
        
        const data = await fetchWithRetry(API_URL);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Mostrar información detallada de las partidas por consola
        console.log('🎮 === INFORMACIÓN DE PARTIDAS ===');
        console.log(`📊 Total de partidas cargadas: ${data.length}`);
        
        // Mostrar información de party/amigos
        const partyMatches = data.filter(m => m.party_id && m.party_id !== 0);
        const soloMatches = data.filter(m => !m.party_id || m.party_id === 0);
        
        console.log(`👥 Partidas en party: ${partyMatches.length}`);
        console.log(`🎯 Partidas solo: ${soloMatches.length}`);
        
        // Mostrar detalles de las primeras 5 partidas en party
        if (partyMatches.length > 0) {
          console.log('👥 === PRIMERAS 5 PARTIDAS EN PARTY ===');
          partyMatches.slice(0, 5).forEach((match, index) => {
            console.log(`\n🏆 Partida ${index + 1}:`);
            console.log(`   Match ID: ${match.match_id}`);
            console.log(`   Party ID: ${match.party_id}`);
            console.log(`   Party Size: ${getPartySize(match)}`);
            console.log(`   Kills: ${match.kills}`);
            console.log(`   Deaths: ${match.deaths}`);
            console.log(`   Assists: ${match.assists}`);
            console.log(`   Resultado: ${match.radiant_win ? (match.player_slot < 128 ? 'Victoria' : 'Derrota') : (match.player_slot < 128 ? 'Derrota' : 'Victoria')}`);
            console.log(`   Fecha: ${new Date(match.start_time * 1000).toLocaleString()}`);
          });
        }
        
        // Mostrar estadísticas de party
        const partyStats = {
          total: partyMatches.length,
          wins: partyMatches.filter(m => (m.radiant_win && m.player_slot < 128) || (!m.radiant_win && m.player_slot >= 128)).length,
          losses: partyMatches.filter(m => (m.radiant_win && m.player_slot >= 128) || (!m.radiant_win && m.player_slot < 128)).length
        };
        
        console.log('\n📈 === ESTADÍSTICAS DE PARTY ===');
        console.log(`👥 Total partidas en party: ${partyStats.total}`);
        console.log(`✅ Victorias en party: ${partyStats.wins}`);
        console.log(`❌ Derrotas en party: ${partyStats.losses}`);
        console.log(`📊 Win rate en party: ${partyStats.total > 0 ? ((partyStats.wins / partyStats.total) * 100).toFixed(1) : 0}%`);
        
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
  // }, [steamId]);

  // Cargar héroes para convertir hero_id → nombre
  useEffect(() => {
    async function fetchHeroes() {
      try {
        console.log('🦸 Cargando información de héroes...');
        const data = await fetchWithRetry(HEROES_API);
        const map = {};
        data.forEach((h) => {
          map[h.id] = h.localized_name;
        });
        setHeroes(map);
        console.log(`✅ ${Object.keys(map).length} héroes cargados`);
      } catch (err) {
        console.error("Error fetching heroes:", err);
      }
    }
    fetchHeroes();
  }, []);

  // Función para manejar el callback de Steam
  const handleSteamCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      // Usar la autenticación local en lugar de fetch a APIs serverless
      const userData = await processSteamCallback();
      
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
        
        // Asegurar que no hay errores después de autenticación exitosa
        setError("");
      }
      
    } catch (err) {
      console.error('Error procesando callback de Steam:', err);
      setError(`Error de autenticación: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto para manejar la autenticación de Steam
  useEffect(() => {
    // Verificar si hay un callback de Steam en la URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('openid.claimed_id') && urlParams.has('openid.identity')) {
      // Procesar el callback de Steam
      handleSteamCallback();
    }
  }, [handleSteamCallback]);

  // Función para obtener detalles completos de una partida
  const fetchMatchDetails = async (matchId) => {
    try {
      return await fetchWithRetry(`https://api.opendota.com/api/matches/${matchId}`);
    } catch (error) {
      console.error(`Error obteniendo detalles de partida ${matchId}:`, error.message);
      return null;
    }
  };

  // Función para verificar si hay amigos en una partida
  const checkFriendsInMatch = async (match) => {
    // Verificar partidas que podrían ser incorrectamente marcadas como solo
    const partySize = getPartySize(match);
    if (partySize > 1) {
      return null; // Ya es party, no necesita verificación
    }
    
    // Verificar partidas con party_size 0, 1, o null (posiblemente mal clasificadas)
    if (partySize !== 0 && partySize !== 1 && match.party_size !== null) {
      return null;
    }

    // Obtener detalles completos de la partida
    const matchDetails = await fetchMatchDetails(match.match_id);
    if (!matchDetails || !matchDetails.players) {
      return null;
    }

    // Obtener account_ids de todos los jugadores en la partida
    const playerAccountIds = matchDetails.players
      .map(player => player.account_id)
      .filter(id => id !== null && id !== undefined);

    // Verificar si alguno de los jugadores es amigo usando múltiples métodos
    let friendsInMatch = [];
    
    if (friends.length > 0) {
      // Método normal: usar lista de amigos cargada
      friendsInMatch = friends.filter(friend => {
        // Método 1: Convertir Steam ID del amigo a account_id (últimos 9 dígitos)
        const friendAccountId = friend.steamid ? friend.steamid.slice(-9) : null;
        const isInMatchByAccountId = playerAccountIds.includes(friendAccountId);
        
        // Método 2: Verificar por nombre de usuario
        const isInMatchByName = matchDetails.players.some(player => 
          player.personaname && friend.personaname && 
          player.personaname.toLowerCase().includes(friend.personaname.toLowerCase())
        );
        
        if (isInMatchByAccountId || isInMatchByName) {
          console.log(`👥 Partida ${match.match_id}: Encontrado amigo ${friend.personaname} (Steam ID: ${friend.steamid})`);
        }
        
        return isInMatchByAccountId || isInMatchByName;
      });
    } else {
      // Método alternativo: buscar Steam ID específico conocido
      const targetFriendSteamId = '76561198097432092';
      const targetFriendAccountId = targetFriendSteamId.slice(-9);
      
      const hasTargetFriend = playerAccountIds.includes(targetFriendAccountId) || 
        matchDetails.players.some(player => 
          player.personaname && player.personaname.toLowerCase().includes('lixo_kkk')
        );
      
      if (hasTargetFriend) {
        console.log(`👥 Partida ${match.match_id}: Encontrado amigo conocido (lixo_kkk)`);
        friendsInMatch = [{ 
          steamid: targetFriendSteamId, 
          personaname: 'lixo_kkk' 
        }];
      }
    }

    return friendsInMatch.length > 0 ? friendsInMatch : null;
  };

  // Función para hacer delay entre requests
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Función para filtrar partidas por tiempo
  const filterMatchesByTime = (matches, filter) => {
    if (filter === "all") return matches;
    
    const now = Date.now() / 1000; // Convertir a segundos
    let timeThreshold;
    
    switch (filter) {
      case "day":
        timeThreshold = now - (24 * 60 * 60); // 24 horas
        break;
      case "week":
        timeThreshold = now - (7 * 24 * 60 * 60); // 7 días
        break;
      case "month":
        timeThreshold = now - (30 * 24 * 60 * 60); // 30 días
        break;
      default:
        return matches;
    }
    
    return matches.filter(match => match.start_time >= timeThreshold);
  };

  // Función genérica para hacer requests a OpenDota con rate limiting y reintentos
  const fetchWithRetry = async (url, retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        // Si es rate limit, intentar de nuevo después de esperar
        if (response.status === 429 || response.status === 503) {
          if (retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 2000; // Backoff exponencial: 2s, 4s, 8s
            console.log(`⏳ Rate limit detectado, esperando ${waitTime/1000}s... (intento ${retryCount + 1}/${maxRetries})`);
            await delay(waitTime);
            return fetchWithRetry(url, retryCount + 1);
          } else {
            throw new Error(`Rate limit excedido después de ${maxRetries} reintentos`);
          }
        }
        
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Verificar si la respuesta contiene un error de rate limit
      if (data.error && data.error.includes('rate limit')) {
        if (retryCount < maxRetries) {
          const waitTime = Math.pow(2, retryCount) * 2000;
          console.log(`⏳ Rate limit en respuesta JSON, esperando ${waitTime/1000}s...`);
          await delay(waitTime);
          return fetchWithRetry(url, retryCount + 1);
        } else {
          throw new Error(`Rate limit excedido después de ${maxRetries} reintentos`);
        }
      }
      
      return data;
    } catch (error) {
      if (retryCount < maxRetries && (error.message.includes('rate limit') || error.message.includes('429'))) {
        const waitTime = Math.pow(2, retryCount) * 2000;
        console.log(`⏳ Error de red, reintentando en ${waitTime/1000}s...`);
        await delay(waitTime);
        return fetchWithRetry(url, retryCount + 1);
      }
      
      throw error;
    }
  };

  // Función para diagnosticar una partida específica
  const diagnoseSpecificMatch = async (matchId) => {
    const targetFriendSteamId = '76561198097432092'; // Steam ID del amigo específico
    const targetFriendAccountId = '137166364'; // Account ID del amigo específico
    
    console.log(`🔍 === DIAGNÓSTICO DE PARTIDA ${matchId} ===`);
    console.log(`🎯 Buscando Steam ID específico: ${targetFriendSteamId}`);
    console.log(`🎯 Buscando Account ID específico: ${targetFriendAccountId}`);
    
    try {
      const matchDetails = await fetchMatchDetails(matchId);
      if (!matchDetails) {
        console.log('❌ No se pudieron obtener detalles de la partida');
        return;
      }

      console.log('📊 Datos de la partida:');
      console.log('   Match ID:', matchDetails.match_id);
      console.log('   Duración:', Math.floor(matchDetails.duration / 60), 'minutos');
      console.log('   Fecha:', new Date(matchDetails.start_time * 1000).toLocaleString());
      console.log('   Jugadores:', matchDetails.players.length);

      // Mostrar todos los jugadores
      console.log('\n👥 Lista de jugadores:');
      let foundTargetFriend = false;
      
      matchDetails.players.forEach((player, index) => {
        // Debug: mostrar datos brutos del jugador
        console.log(`   🔍 Jugador ${index + 1} - Datos brutos:`, {
          account_id: player.account_id,
          personaname: player.personaname,
          personaname_raw: player.personaname_raw
        });
        
        const steamId = player.account_id ? `76561198${player.account_id}` : 'No disponible';
        const isInFriendList = friends.some(f => f.steamid === steamId);
        const isTargetFriendBySteamId = steamId === targetFriendSteamId;
        const isTargetFriendByAccountId = player.account_id === targetFriendAccountId;
        
        if (isTargetFriendByAccountId) {
          foundTargetFriend = true;
        }
        
        console.log(`   ${index + 1}. ${player.personaname || 'Anónimo'}`);
        console.log(`      Account ID: ${player.account_id}`);
        console.log(`      Steam ID calculado: ${steamId}`);
        console.log(`      En lista de amigos: ${isInFriendList ? '✅ SÍ' : '❌ NO'}`);
        console.log(`      Es el amigo objetivo (por Steam ID): ${isTargetFriendBySteamId ? '🎯 ¡ENCONTRADO!' : '❌ NO'}`);
        console.log(`      Es el amigo objetivo (por Account ID): ${isTargetFriendByAccountId ? '🎯 ¡ENCONTRADO!' : '❌ NO'}`);
        
        if (isInFriendList) {
          const friend = friends.find(f => f.steamid === steamId);
          console.log(`      Nombre completo: ${friend.personaname}`);
        }
        
        // Verificar si el nombre coincide con algún amigo
        const friendByName = friends.find(f => 
          f.personaname && player.personaname && 
          f.personaname.toLowerCase().includes(player.personaname.toLowerCase())
        );
        if (friendByName) {
          console.log(`      ⚠️ POSIBLE MATCH POR NOMBRE: ${friendByName.personaname} (${friendByName.steamid})`);
          
          // Si encontramos match por nombre, también es válido
          if (friendByName.steamid === targetFriendSteamId) {
            foundTargetFriend = true;
          }
        }
        
        // Verificar usando la misma lógica que la función de verificación
        const friendAccountId = targetFriendSteamId ? targetFriendSteamId.slice(-9) : null;
        const isTargetFriendByConversion = player.account_id === friendAccountId;
        if (isTargetFriendByConversion) {
          console.log(`      🎯 ¡ENCONTRADO POR CONVERSIÓN! Account ID del amigo: ${friendAccountId}`);
          foundTargetFriend = true;
        }
      });

      // Verificar amigos específicamente
      const friendsInMatch = matchDetails.players
        .map(player => {
          const steamId = player.account_id ? `76561198${player.account_id}` : null;
          return friends.find(f => f.steamid === steamId);
        })
        .filter(friend => friend !== undefined);

      console.log(`\n🎯 RESULTADO FINAL:`);
      console.log(`   Account ID objetivo (${targetFriendAccountId}) encontrado: ${foundTargetFriend ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   Amigos de tu lista encontrados: ${friendsInMatch.length}`);
      console.log(`   Total amigos cargados en app: ${friends.length}`);
      
      if (foundTargetFriend) {
        console.log(`   🎉 ¡El amigo objetivo SÍ está en la partida!`);
        console.log(`   🔧 El party_size debería corregirse automáticamente`);
        console.log(`   📊 Ahora puedes ejecutar la verificación completa de amigos`);
      } else {
        console.log(`   ❌ El amigo objetivo NO está en la partida`);
        console.log(`   🤔 Posibles causas:`);
        console.log(`      - El account_id ${targetFriendAccountId} no está en esta partida`);
        console.log(`      - El amigo no jugó en esa partida específica`);
        console.log(`      - Verifica que sea la partida correcta`);
      }
      
      if (friendsInMatch.length > 0) {
        console.log(`\n👥 Amigos de tu lista encontrados:`);
        friendsInMatch.forEach(friend => {
          console.log(`   - ${friend.personaname} (${friend.steamid})`);
        });
      }

    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
    }
  };

  // Función para verificar amigos en todas las partidas solo
  const checkAllSoloMatchesForFriends = async () => {
    if (friends.length === 0) {
      console.log('⚠️ No hay amigos cargados, pero continuando con verificación usando Steam ID específico...');
      // Continuar sin amigos cargados, usando solo el Steam ID específico
    }

    setCheckingFriends(true);
    const friendsFound = {};

    try {
      // Filtrar partidas por tiempo primero
      const timeFilteredMatches = filterMatchesByTime(matches, timeFilter);
      console.log(`📅 Filtro de tiempo aplicado (${timeFilter}): ${timeFilteredMatches.length} partidas de ${matches.length} total`);
      
      // Filtrar partidas que podrían tener amigos (party_size 0, 1, o null)
      const matchesToCheck = timeFilteredMatches.filter(match => {
        const partySize = getPartySize(match);
        return partySize <= 1 || match.party_size === null;
      });
      console.log(`🔍 Verificando ${matchesToCheck.length} partidas (solo/mal clasificadas) para encontrar amigos...`);
      console.log('⏳ Usando rate limiting para evitar límites de API...');

      let processedCount = 0;
      let errorsCount = 0;

      for (const match of matchesToCheck) {
        try {
          // Rate limiting: esperar 1 segundo entre requests
          if (processedCount > 0) {
            await delay(1000);
          }

          const friendsInMatch = await checkFriendsInMatch(match);
          if (friendsInMatch) {
            friendsFound[match.match_id] = friendsInMatch;
            console.log(`👥 Partida ${match.match_id}: Encontrados ${friendsInMatch.length} amigos:`, 
              friendsInMatch.map(f => f.personaname));
          }

          processedCount++;
          
          // Actualizar estado cada 5 partidas procesadas
          if (processedCount % 5 === 0) {
            setFriendsInMatches({...friendsFound});
          }

        } catch (matchError) {
          errorsCount++;
          console.error(`❌ Error en partida ${match.match_id}:`, matchError.message);
          
          // Si es rate limit, esperar más tiempo
          if (matchError.message.includes('rate limit') || matchError.message.includes('429')) {
            console.log('⏳ Rate limit detectado, esperando 5 segundos...');
            await delay(5000);
          }
        }
      }

      setFriendsInMatches(friendsFound);
      
      const totalMatchesWithFriends = Object.keys(friendsFound).length;
      console.log(`✅ Verificación completada: ${totalMatchesWithFriends} partidas con amigos encontradas`);
      console.log(`📊 Procesadas: ${processedCount} partidas, Errores: ${errorsCount}`);
      
      if (totalMatchesWithFriends === 0) {
        console.log('😔 No se encontraron amigos en ninguna partida solo');
      }

      if (errorsCount > 0) {
        console.log(`⚠️ Se encontraron ${errorsCount} errores durante la verificación. Algunas partidas podrían no haberse verificado completamente.`);
      }

    } catch (error) {
      console.error('Error verificando amigos en partidas:', error);
      alert('Error verificando amigos. Revisa la consola para más detalles.');
    } finally {
      setCheckingFriends(false);
    }
  };

  // Función para obtener el party_size con fallback
  const getPartySize = (match) => {
    // Si party_size existe y es válido, lo usamos
    if (match.party_size !== undefined && match.party_size !== null && match.party_size > 0) {
      return match.party_size;
    }
    
    // Si se encontraron amigos en esta partida, corregir el party_size
    if (friendsInMatches[match.match_id] && friendsInMatches[match.match_id].length > 0) {
      const friendsCount = friendsInMatches[match.match_id].length;
      return friendsCount + 1; // amigos + el jugador actual
    }
    
    // Si party_size es null, intentar inferir desde otros campos primero
    if (match.party_size === null) {
      // Si hay party_id, probablemente sea party
      if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
        return 2; // Asumimos party de al menos 2
      }
      
      // Si no hay party_id, podría ser solo o party sin party_id
      return 1; // Asumimos solo por defecto
    }
    
    // Si party_size es 0 o undefined, intentar inferir desde otros campos
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

  // Log cuando cambie el filtro
  useEffect(() => {
    if (matches.length > 0) {
      // Calcular filteredMatches dentro del useEffect para evitar bucles
      const currentFilteredMatches = matches.filter(match => {
        const partySize = getPartySize(match);
        if (filter === "solo") return partySize === 1;
        if (filter === "party") return partySize > 1;
        return true;
      });
      
      console.log(`\n🔍 === FILTRO APLICADO: ${filter.toUpperCase()} ===`);
      console.log(`📊 Partidas mostradas: ${currentFilteredMatches.length} de ${matches.length}`);
      
      if (filter === "party") {
        console.log('👥 Mostrando solo partidas jugadas con amigos/party');
      } else if (filter === "solo") {
        console.log('🎯 Mostrando solo partidas jugadas solo');
      } else {
        console.log('📋 Mostrando todas las partidas');
      }
    }
  }, [filter, matches.length]);

  // Limpiar resultados de amigos cuando cambie el filtro de tiempo
  useEffect(() => {
    setFriendsInMatches({});
  }, [timeFilter]);

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
    console.log('🎮 Iniciando autenticación con Steam...');
    
    // Usar la autenticación local - Steam regresará a la página actual
    const realm = window.location.origin;
    const returnUrl = window.location.href; // Regresar a la página actual
    
    console.log('📍 Realm:', realm);
    console.log('📍 Return URL:', returnUrl);
    
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnUrl,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
    console.log('🔗 Steam Auth URL:', steamAuthUrl);
    
    // Intentar redirección
    try {
      window.location.href = steamAuthUrl;
      console.log('✅ Redirección iniciada');
    } catch (error) {
      console.error('❌ Error en redirección:', error);
      setError(`Error de redirección: ${error.message}`);
    }
  };

  // Función para cargar partidas manualmente con selector de tiempo
  const loadMatchesWithTimeFilter = async (timeFilter) => {
    if (!steamId || steamId.trim() === "") {
      alert('Primero debes autenticarte con Steam');
      return;
    }

    try {
      setLoading(true);
      setError("");
      console.log(`🆔 Cargando partidas para Steam ID: ${steamId} con filtro: ${timeFilter}`);
      
      const API_URL = `https://api.opendota.com/api/players/${steamId}/matches?lobby_type=7`;
      console.log('🔗 Cargando partidas desde OpenDota API...');
      
      const data = await fetchWithRetry(API_URL);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Aplicar filtro de tiempo
      const filteredData = filterMatchesByTime(data, timeFilter);
      setMatches(filteredData);
      setTimeFilter(timeFilter);
      setMatchesLoaded(true);
      setShowTimeSelector(false);
      
      console.log(`✅ ${filteredData.length} partidas cargadas con filtro ${timeFilter}`);
      
    } catch (error) {
      console.error('❌ Error cargando partidas:', error);
      setError(`Error cargando partidas: ${error.message}`);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener amigos de Steam usando el backend
  const fetchSteamFriends = async () => {
    if (!steam64Id) {
      console.log('❌ No hay Steam ID disponible para obtener amigos');
      return;
    }

    try {
      setLoadingFriends(true);
      console.log(`🆔 Obteniendo amigos para Steam ID: ${steam64Id}`);
      
      // Usar la API del backend en lugar de peticiones directas
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://dota-matches-9hzo0po8h-nahueldefazios-projects.vercel.app';
      const response = await fetch(`${apiBaseUrl}/api/auth/steam/friends?steamId=${steam64Id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`👥 Amigos obtenidos: ${data.count} amigos`);
      
      if (data.friends && data.friends.length > 0) {
        setFriends(data.friends);
        console.log(`✅ Lista de amigos cargada exitosamente: ${data.friends.length} amigos`);
        
        // Mostrar información de los amigos en consola
        data.friends.forEach((friend, index) => {
          const statusText = {
            0: '🔴 Offline',
            1: '🟢 Online',
            2: '🟡 Busy',
            3: '🟠 Away',
            4: '😴 Snooze',
            5: '💼 Looking to trade',
            6: '🎮 Looking to play'
          }[friend.personastate] || '❓ Unknown';
          
          console.log(`👤 Amigo ${index + 1}: ${friend.personaname} (${friend.steamid}) - ${statusText}`);
        });
      } else {
        console.log('❌ No se encontraron amigos');
        setFriends([]);
      }
      
    } catch (error) {
      console.error('❌ Error obteniendo amigos de Steam:', error);
      setError(`Error obteniendo amigos: ${error.message}`);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    setAuthenticatedUser(null);
    setSteamId("");
    setSteam64Id("");
    setMatches([]);
    setFriends([]);
    setError("");
    setLoading(false);
    setLoadingFriends(false);
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

      {/* Selector de tiempo para cargar partidas */}
      {authenticatedUser && !matchesLoaded && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">📅 Selecciona el período de partidas a cargar</h3>
          <p className="text-sm text-blue-700 mb-4">
            Elige qué período de tiempo quieres analizar para encontrar amigos en tus partidas.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => loadMatchesWithTimeFilter("day")}
              className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">📅</div>
              <div className="font-medium">Último día</div>
              <div className="text-xs opacity-90">Partidas de hoy</div>
            </button>
            
            <button
              onClick={() => loadMatchesWithTimeFilter("week")}
              className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">📆</div>
              <div className="font-medium">Última semana</div>
              <div className="text-xs opacity-90">7 días</div>
            </button>
            
            <button
              onClick={() => loadMatchesWithTimeFilter("month")}
              className="px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">📊</div>
              <div className="font-medium">Último mes</div>
              <div className="text-xs opacity-90">30 días</div>
            </button>
            
            <button
              onClick={() => loadMatchesWithTimeFilter("2months")}
              className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">📈</div>
              <div className="font-medium">Últimos 2 meses</div>
              <div className="text-xs opacity-90">60 días</div>
            </button>
            
            <button
              onClick={() => loadMatchesWithTimeFilter("3months")}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">📉</div>
              <div className="font-medium">Últimos 3 meses</div>
              <div className="text-xs opacity-90">90 días</div>
            </button>
            
            <button
              onClick={() => loadMatchesWithTimeFilter("all")}
              className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-center"
            >
              <div className="text-lg">🌐</div>
              <div className="font-medium">Todas las partidas</div>
              <div className="text-xs opacity-90">Sin límite</div>
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

          <div className="flex justify-center gap-4 flex-wrap">
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
            
            {steam64Id && (
              <button
                type="button"
                onClick={fetchSteamFriends}
                disabled={loadingFriends}
                className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors flex items-center gap-2 ${
                  loadingFriends 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {loadingFriends ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    👥 Ver Amigos
                  </>
                )}
              </button>
            )}
            
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
        
        {error && !authenticatedUser && (
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

      {/* Sección de Amigos de Steam */}
      {friends.length > 0 && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3 text-purple-800">
            👥 Amigos de Steam ({friends.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend, index) => {
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
                <div key={friend.steamid} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    <img 
                      src={friend.avatar} 
                      alt={friend.personaname}
                      className="w-10 h-10 rounded-full border-2 border-purple-300"
                      onError={(e) => {
                        e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(friend.personaname) + '&size=40&background=9333EA&color=ffffff';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 text-sm">{friend.personaname}</h3>
                      <p className="text-xs text-gray-600">{statusText}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Steam ID:</strong> {friend.steamid}</p>
                    <p><strong>Último login:</strong> {new Date(friend.lastlogoff * 1000).toLocaleDateString()}</p>
                    {friend.realname && friend.realname !== 'No disponible' && (
                      <p><strong>Nombre real:</strong> {friend.realname}</p>
                    )}
                  </div>
                  <a 
                    href={friend.profileurl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs text-purple-600 hover:text-purple-800 underline"
                  >
                    Ver perfil →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          
          {/* Filtros de tiempo para verificación de amigos */}
          {matches.length > 0 && (
            <div className="mt-3 mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">📅 Filtrar partidas por tiempo:</h4>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTimeFilter("day")}
                  className={`px-3 py-1 rounded text-sm ${
                    timeFilter === "day" ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Último día
                </button>
                <button
                  onClick={() => setTimeFilter("week")}
                  className={`px-3 py-1 rounded text-sm ${
                    timeFilter === "week" ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Última semana
                </button>
                <button
                  onClick={() => setTimeFilter("month")}
                  className={`px-3 py-1 rounded text-sm ${
                    timeFilter === "month" ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Último mes
                </button>
                <button
                  onClick={() => setTimeFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${
                    timeFilter === "all" ? "bg-green-500 text-white" : "bg-gray-200 hover:bg-gray-300"
                  }`}
                >
                  Todas
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {timeFilter !== "all" && (
                  <span>
                    📊 Partidas a verificar en el período: {filterMatchesByTime(matches, timeFilter).filter(m => getPartySize(m) <= 1 || m.party_size === null).length} de {matches.filter(m => getPartySize(m) <= 1 || m.party_size === null).length} total
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Botón para verificar amigos en partidas solo */}
          {matches.length > 0 && (
            <div className="mt-2 mb-2">
              <button
                onClick={checkAllSoloMatchesForFriends}
                disabled={checkingFriends}
                className={`px-4 py-2 rounded text-sm ${
                  checkingFriends 
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed" 
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {checkingFriends ? (
                  <>
                    🔍 Verificando amigos... ({Object.keys(friendsInMatches).length} encontradas)
                  </>
                ) : (
                  <>
                    👥 Verificar amigos en partidas ({filterMatchesByTime(matches, timeFilter).filter(m => getPartySize(m) <= 1 || m.party_size === null).length} partidas {timeFilter !== "all" ? `del ${timeFilter === "day" ? "último día" : timeFilter === "week" ? "última semana" : "último mes"}` : ""})
                  </>
                )}
              </button>
              
              {friends.length === 0 && (
                <div className="mt-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                  ℹ️ Sin amigos cargados - verificando usando Steam ID específico conocido (lixo_kkk)
                </div>
              )}
              
              {checkingFriends && (
                <div className="mt-2 text-xs text-gray-600">
                  ⏳ Usando rate limiting (1s entre requests) para evitar límites de API
                </div>
              )}
              
              {Object.keys(friendsInMatches).length > 0 && (
                <div className="mt-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span className="font-medium">✅ {Object.keys(friendsInMatches).length} partida(s) con amigos encontradas</span>
                  <div className="text-xs text-green-600 mt-1">
                    🔧 El party_size se corrige automáticamente cuando se detectan amigos en partidas marcadas como "solo"
                  </div>
                </div>
              )}
              
              {/* Botón de diagnóstico para partida específica */}
              <div className="mt-2 space-y-2">
                <div>
                  <button
                    onClick={() => diagnoseSpecificMatch('8490796592')}
                    className="px-3 py-1 rounded text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    🔍 Diagnosticar partida 8490796592
                  </button>
                  <span className="text-xs text-gray-600 ml-2">(Revisar consola para detalles)</span>
                </div>
                
                <div>
                  <button
                    onClick={() => {
                      const targetFriendId = '76561198097432092';
                      const isInList = friends.some(f => f.steamid === targetFriendId);
                      const friend = friends.find(f => f.steamid === targetFriendId);
                      console.log(`🔍 Verificando Steam ID ${targetFriendId} en lista de amigos:`);
                      console.log(`   Está en la lista: ${isInList ? '✅ SÍ' : '❌ NO'}`);
                      if (isInList && friend) {
                        console.log(`   Nombre: ${friend.personaname}`);
                        console.log(`   Steam ID: ${friend.steamid}`);
                      }
                      console.log(`   Total amigos cargados: ${friends.length}`);
                    }}
                    className="px-3 py-1 rounded text-xs bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    🔍 Verificar Steam ID del amigo en lista
                  </button>
                </div>
                
                <div>
                  <button
                    onClick={() => {
                      console.log('🔍 === COMPARANDO AMBAS PARTIDAS ===');
                      Promise.all([
                        diagnoseSpecificMatch('8490823086'),
                        new Promise(resolve => setTimeout(() => resolve(diagnoseSpecificMatch('8490796592')), 2000))
                      ]).then(() => {
                        console.log('✅ Comparación completada - Revisa los resultados arriba');
                      });
                    }}
                    className="px-3 py-1 rounded text-xs bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    🔍 Comparar ambas partidas (8490823086 vs 8490796592)
                  </button>
                </div>
                
                <div>
                  <button
                    onClick={() => {
                      console.log('🔧 === PROBANDO DIFERENTES CONVERSIONES DE STEAM ID ===');
                      const targetFriendId = '76561198097432092';
                      
                      // Método 1: Restar el offset estándar
                      const method1 = (parseInt(targetFriendId) - 76561197960265728).toString();
                      console.log(`Método 1 (restar offset): ${targetFriendId} -> ${method1}`);
                      
                      // Método 2: Usar los últimos dígitos
                      const method2 = targetFriendId.slice(-10);
                      console.log(`Método 2 (últimos 10 dígitos): ${targetFriendId} -> ${method2}`);
                      
                      // Método 3: Usar los últimos 9 dígitos
                      const method3 = targetFriendId.slice(-9);
                      console.log(`Método 3 (últimos 9 dígitos): ${targetFriendId} -> ${method3}`);
                      
                      // Método 4: Convertir a 32-bit
                      const method4 = (parseInt(targetFriendId) & 0xFFFFFFFF).toString();
                      console.log(`Método 4 (32-bit): ${targetFriendId} -> ${method4}`);
                      
                      console.log('\n🎯 Prueba estos account_ids en la partida:');
                      console.log(`   - ${method1}`);
                      console.log(`   - ${method2}`);
                      console.log(`   - ${method3}`);
                      console.log(`   - ${method4}`);
                    }}
                    className="px-3 py-1 rounded text-xs bg-red-500 hover:bg-red-600 text-white"
                  >
                    🔧 Probar conversiones de Steam ID
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Nota sobre party_size inferido */}
          {matches.some(m => m.party_size === undefined || m.party_size === null) && (
            <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
              <span className="font-medium">ℹ️ Nota:</span> Algunas partidas muestran valores inferidos de party size (⚠️) 
              cuando la API no proporciona esta información (null/undefined). Se usa lógica de respaldo basada en party_id.
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto mt-3">
                <p className="text-sm text-green-800">
                  <strong>⚡ Rate Limiting:</strong> La aplicación usa control de velocidad automático para evitar límites de API
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
              <p className="text-xs text-blue-600 mt-2">💡 Usando rate limiting para evitar límites de API</p>
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
                    {(m.party_size === undefined || m.party_size === null) && (
                      <span 
                        className="text-xs text-orange-500 ml-1 cursor-help" 
                        title="Valor inferido - La API no proporcionó party_size (null/undefined)"
                      >
                        ⚠️
                      </span>
                    )}
                    {friendsInMatches[m.match_id] && (
                      <span 
                        className="text-xs text-blue-500 ml-1 cursor-help" 
                        title={`🔧 Party size corregido! Amigos en la partida: ${friendsInMatches[m.match_id].map(f => f.personaname).join(', ')}`}
                      >
                        👥{friendsInMatches[m.match_id].length}
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
