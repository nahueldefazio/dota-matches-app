import React, { useState, useEffect } from "react";
import { useSteamAuth } from "../hooks/useSteamAuth";

export default function DotaMatchesFixed() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rateLimitWaiting, setRateLimitWaiting] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [cache, setCache] = useState({});
  const [timeFilter, setTimeFilter] = useState("month");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchPopup, setShowMatchPopup] = useState(false);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatchDetails, setLoadingMatchDetails] = useState(false);
  const [showSteamProfile, setShowSteamProfile] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasShownInitialSelector, setHasShownInitialSelector] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [friendsInMatches, setFriendsInMatches] = useState({});
  const [checkingFriends, setCheckingFriends] = useState(false);
  const [heroes, setHeroes] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [autoCheckFriends, setAutoCheckFriends] = useState(false);
  const [friendsLoadingProgress, setFriendsLoadingProgress] = useState({ current: 0, total: 0 });
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [playerPerformanceAnalysis, setPlayerPerformanceAnalysis] = useState({});
  const [throwAnalysis, setThrowAnalysis] = useState({});
  const [matchStats, setMatchStats] = useState({ solo: { wins: 0, losses: 0 }, party: { wins: 0, losses: 0 } });
  const [statsReady, setStatsReady] = useState(false);
  const [friendsNote, setFriendsNote] = useState('');
  const [companionsAnalysisComplete, setCompanionsAnalysisComplete] = useState(false);

  // Usar el hook de autenticación de Steam
  const {
    user: authenticatedUser,
    loading: authLoading,
    error: authError,
    friends,
    loadingFriends,
    isAuthenticated,
    logout: logoutUser,
    fetchSteamFriends
  } = useSteamAuth();
  
  // Flag global de actividad para deshabilitar botones durante cualquier carga
  const isBusy = loading || rateLimitWaiting || loadingMatchDetails || authLoading || loadingFriends || checkingFriends;
  const isSteamCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('openid.claimed_id') && urlParams.has('openid.identity');
  };

  // Función para obtener datos reales de Steam usando nuestro backend
  const getSteamProfileData = async (steamId) => {
    try {
      console.log(`🔍 Obteniendo datos de Steam para ID: ${steamId}`);
      
      // Usar nuestro backend que maneja la API de Steam
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://dota-matches-od0z93kch-nahueldefazios-projects.vercel.app';
      const response = await fetch(`${apiBaseUrl}/api/auth/steam/profile?steamId=${steamId}`);
      
      console.log(`📡 Respuesta del backend: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`No se pudo obtener datos de Steam: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📊 Datos recibidos del backend:`, data);
      
      if (!data || !data.personaname) {
        throw new Error('Usuario de Steam no encontrado');
      }
      
      console.log(`✅ Datos del jugador obtenidos:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error obteniendo datos de Steam:`, error);
      
      // Fallback: datos básicos si la API falla
      return {
        personaname: `Usuario Steam ${steamId.substring(0, 8)}`,
        avatarfull: `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="184" height="184" viewBox="0 0 184 184"><rect width="184" height="184" fill="#2196F3"/><text x="92" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">Steam</text><text x="92" y="130" text-anchor="middle" fill="white" font-family="Arial" font-size="12">${steamId.substring(0, 4)}</text></svg>`)}`,
        profileurl: `https://steamcommunity.com/profiles/${steamId}`,
        personastate: 0
      };
    }
  };

  // Función para iniciar autenticación con Steam
  const loginWithSteam = () => {
    try {
      // Usar autenticación local - Steam regresará a la página actual
      const realm = window.location.origin;
      const returnUrl = window.location.href;
      
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': realm,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
      });

      const steamAuthUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
      window.location.href = steamAuthUrl;
      
    } catch (err) {
      console.error('Error iniciando sesión con Steam:', err);
    }
  };

  // Función para procesar el callback de Steam
  const handleSteamCallback = async () => {
    try {

      const urlParams = new URLSearchParams(window.location.search);
      
      if (!urlParams.has('openid.claimed_id') || !urlParams.has('openid.identity')) {
        throw new Error('No se encontraron parámetros de Steam en la URL');
      }

      const claimedId = urlParams.get('openid.claimed_id');
      const steamIdMatch = claimedId.match(/\/id\/(\d+)/);
      
      if (!steamIdMatch) {
        throw new Error('No se pudo extraer SteamID de la URL');
      }

      const steamId = steamIdMatch[1];
      
      // Obtener datos reales del perfil de Steam
      console.log('🔍 Obteniendo perfil real de Steam...');
      const profileData = await getSteamProfileData(steamId);
      
      // Crear datos del usuario con información real de Steam
      const userData = {
        steamID: steamId,
        name: profileData.personaname,
        avatar: profileData.avatarfull || profileData.avatarmedium || profileData.avatar,
        profileUrl: profileData.profileurl,
        personState: profileData.personastate,
        communityVisibility: profileData.communityvisibilitystate,
        createdAt: new Date().toISOString()
      };

      setAuthenticatedUser(userData);
      
      // Cargar automáticamente los amigos después de la autenticación
      console.log('👥 Cargando amigos automáticamente después de la autenticación...');
      try {
        await fetchSteamFriends(steamId); // Usar Steam ID del usuario autenticado
      } catch (error) {
        console.error('❌ Error cargando amigos:', error);
        setErrorMessage('Error cargando lista de amigos de Steam. Verifica tu conexión a internet y que tu perfil sea público.');
        setShowErrorPopup(true);
      }
      
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
    } catch (err) {
      console.error('Error procesando callback de Steam:', err);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    // Limpiar todos los estados
    setAuthenticatedUser(null);
    setFriends([]);
    setMatches([]);
    setMatchesLoaded(false);
    setStatsReady(false);
    setFriendsInMatches({});
    setLoading(false);
    setError("");
    setCheckingFriends(false);
    setCompanionsAnalysisComplete(false);
    setLoadingProgress({ current: 0, total: 0 });
    setCache({});
    
    // Limpiar localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpiar cookies si las hay
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    // Limpiar la URL para remover parámetros de Steam
    window.history.replaceState({}, document.title, window.location.pathname);
    
    console.log('🧹 Sesión cerrada - Todos los datos han sido eliminados');
    
    // Redirigir al login
    window.location.href = '/login';
  };


  // Función para convertir Steam64 a Steam32
  const convertSteam64ToSteam32 = (steam64) => {
    if (!steam64 || steam64.trim() === "") return "";
    
    const steam64Num = BigInt(steam64);
    // Steam32 = Steam64 - 76561197960265728
    const steam32 = steam64Num - BigInt("76561197960265728");
    return steam32.toString();
  };

  // Obtener Steam IDs del usuario autenticado
  const steam64Id = authenticatedUser?.steamID || "";
  const steamId = steam64Id ? convertSteam64ToSteam32(steam64Id) : "";
  

  // Manejar callback de Steam
  useEffect(() => {
    if (isSteamCallback()) {
      handleSteamCallback();
    }
  }, []);

  // Mostrar selector automáticamente
  useEffect(() => {
    if (!hasShownInitialSelector && !matchesLoaded) {
      console.log('🎯 Mostrando selector de período');
      setShowCalendar(true);
      setHasShownInitialSelector(true);
    }
  }, [hasShownInitialSelector, matchesLoaded]);

  // Recalcular estadísticas cuando cambien los amigos detectados
  useEffect(() => {
    if (matches.length > 0 && Object.keys(friendsInMatches).length > 0) {
      console.log('🔄 Recalculando estadísticas debido a cambios en amigos detectados...');
      const stats = calculateMatchStats(matches);
      setMatchStats(stats);
      setStatsReady(true);
      console.log('📊 Estadísticas recalculadas:', stats);
    }
  }, [friendsInMatches, matches]);

  // useEffect para simular progreso de carga de amigos
  useEffect(() => {
    if (loadingFriends && friends.length > 0) {
      const totalFriends = friends.length;
      let currentFriend = 0;
      
      const progressInterval = setInterval(() => {
        currentFriend += 1;
        setFriendsLoadingProgress({ current: currentFriend, total: totalFriends });
        
        if (currentFriend >= totalFriends) {
          clearInterval(progressInterval);
        }
      }, 50); // Actualizar cada 50ms para simular progreso
      
      return () => clearInterval(progressInterval);
    }
  }, [loadingFriends, friends.length]);

  // Función para cargar héroes
  const fetchHeroes = async () => {
    try {
      const response = await fetch('https://api.opendota.com/api/heroes');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const heroesData = await response.json();
      const heroesMap = {};
      heroesData.forEach(hero => {
        heroesMap[hero.id] = hero.localized_name;
      });
      setHeroes(heroesMap);
      console.log('✅ Héroes cargados:', Object.keys(heroesMap).length);
    } catch (error) {
      console.error('❌ Error cargando héroes:', error);
    }
  };

  // Función para filtrar partidas por tiempo
  const filterMatchesByTime = (matches, timeFilter) => {
    if (!matches || matches.length === 0) return [];
    
    const now = Date.now() / 1000;
    let timeLimit;
    
    switch (timeFilter) {
      case "day":
        timeLimit = now - (24 * 60 * 60); // 1 día
        break;
      case "week":
        timeLimit = now - (7 * 24 * 60 * 60); // 1 semana
        break;
      case "month":
        timeLimit = now - (30 * 24 * 60 * 60); // 1 mes
        break;
      case "2months":
        timeLimit = now - (60 * 24 * 60 * 60); // 2 meses
        break;
      case "3months":
        timeLimit = now - (90 * 24 * 60 * 60); // 3 meses
        break;
      case "all":
      default:
        return matches; // Sin filtro de tiempo
    }
    
    return matches.filter(match => match.start_time >= timeLimit);
  };

  // Función para determinar si el jugador ganó la partida
  const didWin = (match) => {
    // Radiant = slots 0-127, Dire = slots 128-255
    const isRadiant = match.player_slot < 128;
    return (isRadiant && match.radiant_win) || (!isRadiant && !match.radiant_win);
  };

  // Función para obtener el party size de una partida
  const getPartySize = (match) => {
    if (match.party_size !== undefined && match.party_size !== null && match.party_size > 0) {
      return match.party_size;
    }
    // Si amigos fueron encontrados en esta partida, corregir el party_size
    if (friendsInMatches[match.match_id] && friendsInMatches[match.match_id].length > 0) {
      const friendsCount = friendsInMatches[match.match_id].length;
      return friendsCount + 1; // amigos + jugador actual
    }
    // Si party_size es null, intentar inferir de otros campos
    if (match.party_size === null) {
      if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
        return 2; // Asumir party de al menos 2
      }
      return 1; // Asumir solo por defecto
    }
    // Si party_size es 0 o undefined, intentar inferir de otros campos
    if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
      return 2; // Asumir party de al menos 2
    }
    if (match.lobby_type === 7) { // Ranked matchmaking
      return 1;
    }
    return 1;
  };

  // Función para obtener el party size original (sin modificar por amigos)
  const getOriginalPartySize = (match) => {
    // Usar el party_size original de la API, sin modificaciones
    if (match.party_size !== undefined && match.party_size !== null && match.party_size > 0) {
      return match.party_size;
    }
    // Si party_size es null o 0, intentar inferir de otros campos
    if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
      return 2; // Asumir party de al menos 2
    }
    return 1; // Asumir solo por defecto
  };

  // Función para obtener la URL de imagen del héroe usando OpenDota API
  const getHeroImageUrl = (heroId) => {
    // Buscar el héroe en el objeto heroes (que viene de OpenDota API)
    const hero = heroes[heroId];
    if (!hero) {
      return 'https://cdn.dota2.com/apps/dota2/images/heroes/unknown_full.png';
    }
    
    // El objeto heroes contiene el nombre del héroe como string (ej: "Skywrath Mage", "Invoker")
    // Necesitamos convertir el nombre localizado a formato de imagen
    let heroImageName = 'unknown';
    
    if (typeof hero === 'string') {
      // Convertir el nombre localizado a formato de imagen
      // Ej: "Skywrath Mage" -> "skywrath_mage"
      heroImageName = hero.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Mapeo especial para nombres que no coinciden exactamente
      const specialNames = {
        'outworld_destroyer': 'obsidian_destroyer',
        'queen_of_pain': 'queenofpain',
        'shadow_fiend': 'nevermore',
        'windrunner': 'windranger',
        'obsidian_destroyer': 'obsidian_destroyer', // Por si acaso
        'centaur_warrunner': 'centaur'
      };
      
      if (specialNames[heroImageName]) {
        heroImageName = specialNames[heroImageName];
      }
    } else if (hero.name) {
      // Si es un objeto con propiedad name (formato OpenDota completo)
      heroImageName = hero.name.replace('npc_dota_hero_', '');
    } else if (hero.localized_name) {
      // Fallback: convertir el nombre localizado a formato de imagen
      heroImageName = hero.localized_name.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Aplicar el mismo mapeo especial
      const specialNames = {
        'outworld_destroyer': 'obsidian_destroyer',
        'queen_of_pain': 'queenofpain',
        'shadow_fiend': 'nevermore',
        'windrunner': 'windranger',
        'obsidian_destroyer': 'obsidian_destroyer',
        'centaur_warrunner': 'centaur'
      };
      
      if (specialNames[heroImageName]) {
        heroImageName = specialNames[heroImageName];
      }
    }
    
    if (heroImageName === 'timbersaw' || heroImageName === 'shredder') {
      return 'https://cdn.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/shredder.png';
    }
    const imageUrl = `https://cdn.dota2.com/apps/dota2/images/heroes/${heroImageName}_full.png`;
    
    return imageUrl;
  };

  // Función para calcular estadísticas de partidas
  const calculateMatchStats = (matchesData) => {
    const stats = { solo: { wins: 0, losses: 0 }, party: { wins: 0, losses: 0 } };
    
    console.log('📊 === CALCULANDO ESTADÍSTICAS ===');
    console.log('📊 Total partidas:', matchesData.length);
    console.log('📊 Partidas con amigos detectados:', Object.keys(friendsInMatches).length);
    
    matchesData.forEach((match, index) => {
      const partySize = getPartySize(match); // Usar getPartySize que incluye detección de amigos
      const isWin = didWin(match);
      const hasFriends = friendsInMatches[match.match_id] && friendsInMatches[match.match_id].length > 0;
      
      // Debug para las primeras 5 partidas
      if (index < 5) {
        console.log(`Partida ${index + 1}: ID=${match.match_id}, party_size=${match.party_size}, calculatedPartySize=${partySize}, isWin=${isWin}, hasFriends=${hasFriends}`);
        if (hasFriends) {
          console.log(`  └─ Amigos:`, friendsInMatches[match.match_id].map(f => f.personaname));
        }
      }
      
      if (partySize === 1) {
        // Partida solo (party_size = 1)
        if (isWin) {
          stats.solo.wins++;
        } else {
          stats.solo.losses++;
        }
      } else if (partySize > 1) {
        // Partida en grupo (party_size > 1)
        if (isWin) {
          stats.party.wins++;
        } else {
          stats.party.losses++;
        }
      }
      // Si partySize es 0 o null, no se cuenta en ninguna categoría
    });
    
    console.log('📊 === RESULTADO ESTADÍSTICAS ===');
    console.log('📊 Solo - Victorias:', stats.solo.wins, 'Derrotas:', stats.solo.losses);
    console.log('📊 Party - Victorias:', stats.party.wins, 'Derrotas:', stats.party.losses);
    console.log('📊 Total partidas contadas:', stats.solo.wins + stats.solo.losses + stats.party.wins + stats.party.losses);
    
    return stats;
  };

  // Función para calcular estadísticas con amigos pasados como parámetro
  const calculateMatchStatsWithFriends = (matchesData, friendsData) => {
    const stats = { solo: { wins: 0, losses: 0 }, party: { wins: 0, losses: 0 } };
    
    console.log('📊 Calculando estadísticas para', matchesData.length, 'partidas');
    console.log('📊 friendsData:', Object.keys(friendsData).length, 'partidas con amigos');
    console.log('📊 friendsData contenido:', friendsData);
    
    matchesData.forEach((match, index) => {
      // Calcular party size usando los amigos pasados como parámetro
      let partySize = match.party_size;
      
      // Si amigos fueron encontrados en esta partida, corregir el party_size
      if (friendsData[match.match_id] && friendsData[match.match_id].length > 0) {
        const friendsCount = friendsData[match.match_id].length;
        partySize = friendsCount + 1; // amigos + jugador actual
      } else if (partySize === null || partySize === 0) {
        // Si party_size es null o 0, intentar inferir de otros campos
        if (match.party_id !== undefined && match.party_id !== null && match.party_id !== 0) {
          partySize = 2; // Asumir party de al menos 2
        } else {
          partySize = 1; // Asumir solo por defecto
        }
      }
      
      const isWin = didWin(match);
      
      // Debug: mostrar las primeras 5 partidas
      if (index < 5) {
        console.log(`Partida ${index + 1}: match_id=${match.match_id}, party_size=${match.party_size}, calculatedPartySize=${partySize}, isWin=${isWin}, hasFriends=${!!friendsData[match.match_id]}`);
        if (friendsData[match.match_id]) {
          console.log(`  └─ Amigos encontrados:`, friendsData[match.match_id].map(f => f.personaname));
        }
      }
      
      if (partySize === 1) {
        // Partida solo (party_size = 1)
        if (isWin) {
          stats.solo.wins++;
        } else {
          stats.solo.losses++;
        }
      } else if (partySize > 1) {
        // Partida en grupo (party_size > 1)
        if (isWin) {
          stats.party.wins++;
        } else {
          stats.party.losses++;
        }
      }
      // Si partySize es 0 o null, no se cuenta en ninguna categoría
    });
    
    console.log('📊 Estadísticas calculadas con amigos:', stats);
    return stats;
  };

  // Función para analizar si un jugador "throweó" la partida
  const analyzeThrowPotential = (player, matchDuration) => {
    if (!player) return null;
    
    // Calcular métricas tempranas vs tardías
    const earlyGame = {
      kills: Math.floor(player.kills * 0.4), // 40% de kills en early game
      deaths: Math.floor(player.deaths * 0.3), // 30% de deaths en early game
      assists: Math.floor(player.assists * 0.4), // 40% de assists en early game
      lastHits: Math.floor(player.last_hits * 0.5), // 50% de last hits en early game
      heroDamage: Math.floor(player.hero_damage * 0.3), // 30% de damage en early game
    };
    
    const lateGame = {
      kills: Math.floor(player.kills * 0.6), // 60% de kills en late game
      deaths: Math.floor(player.deaths * 0.7), // 70% de deaths en late game
      assists: Math.floor(player.assists * 0.6), // 60% de assists en late game
      lastHits: Math.floor(player.last_hits * 0.5), // 50% de last hits en late game
      heroDamage: Math.floor(player.hero_damage * 0.7), // 70% de damage en late game
    };
    
    // Análisis de Net Worth a lo largo de la partida
    const netWorth = player.net_worth || 0;
    const gpm = player.gold_per_min || 0;
    const xpm = player.xp_per_min || 0;
    
    // Simular progresión de Net Worth basada en GPM
    const earlyNetWorth = Math.floor(netWorth * 0.3); // 30% del net worth en early game
    const midNetWorth = Math.floor(netWorth * 0.6); // 60% del net worth en mid game
    const lateNetWorth = netWorth; // 100% del net worth en late game
    
    // Calcular GPM por fases
    const earlyGPM = Math.floor(gpm * 0.8); // GPM más bajo en early game
    const midGPM = Math.floor(gpm * 1.1); // GPM más alto en mid game
    const lateGPM = Math.floor(gpm * 0.9); // GPM decayendo en late game
    
    // Análisis de XPM por fases
    const earlyXPM = Math.floor(xpm * 0.7); // XPM más bajo en early game
    const midXPM = Math.floor(xpm * 1.2); // XPM más alto en mid game
    const lateXPM = Math.floor(xpm * 0.8); // XPM decayendo en late game
    
    // Calcular KDA temprano vs tardío
    const earlyKDA = (earlyGame.kills + earlyGame.assists) / Math.max(earlyGame.deaths, 1);
    const lateKDA = (lateGame.kills + lateGame.assists) / Math.max(lateGame.deaths, 1);
    
    // Calcular score de rendimiento temprano (incluyendo Net Worth)
    let earlyScore = 0;
    if (earlyKDA >= 3) earlyScore += 30;
    else if (earlyKDA >= 2) earlyScore += 25;
    else if (earlyKDA >= 1.5) earlyScore += 20;
    else if (earlyKDA >= 1) earlyScore += 15;
    else if (earlyKDA >= 0.5) earlyScore += 10;
    else earlyScore += 5;
    
    // Bonus por Net Worth temprano
    if (earlyNetWorth >= 10000) earlyScore += 20;
    else if (earlyNetWorth >= 8000) earlyScore += 15;
    else if (earlyNetWorth >= 6000) earlyScore += 10;
    else if (earlyNetWorth >= 4000) earlyScore += 5;
    
    // Bonus por GPM temprano
    if (earlyGPM >= 500) earlyScore += 15;
    else if (earlyGPM >= 400) earlyScore += 10;
    else if (earlyGPM >= 300) earlyScore += 5;
    
    // Calcular score de rendimiento tardío (incluyendo Net Worth)
    let lateScore = 0;
    if (lateKDA >= 3) lateScore += 30;
    else if (lateKDA >= 2) lateScore += 25;
    else if (lateKDA >= 1.5) lateScore += 20;
    else if (lateKDA >= 1) lateScore += 15;
    else if (lateKDA >= 0.5) lateScore += 10;
    else lateScore += 5;
    
    // Bonus por Net Worth tardío
    if (lateNetWorth >= 20000) lateScore += 20;
    else if (lateNetWorth >= 15000) lateScore += 15;
    else if (lateNetWorth >= 10000) lateScore += 10;
    else if (lateNetWorth >= 5000) lateScore += 5;
    
    // Bonus por GPM tardío
    if (lateGPM >= 600) lateScore += 15;
    else if (lateGPM >= 500) lateScore += 10;
    else if (lateGPM >= 400) lateScore += 5;
    
    // Agregar factores adicionales
    const earlyLHPerMin = earlyGame.lastHits / Math.max(matchDuration / 60 * 0.4, 1);
    const lateLHPerMin = lateGame.lastHits / Math.max(matchDuration / 60 * 0.6, 1);
    
    if (earlyLHPerMin >= 4) earlyScore += 20;
    else if (earlyLHPerMin >= 3) earlyScore += 15;
    else if (earlyLHPerMin >= 2) earlyScore += 10;
    else earlyScore += 5;
    
    if (lateLHPerMin >= 4) lateScore += 20;
    else if (lateLHPerMin >= 3) lateScore += 15;
    else if (lateLHPerMin >= 2) lateScore += 10;
    else lateScore += 5;
    
    // Calcular diferencia de rendimiento
    const performanceDiff = earlyScore - lateScore;
    const throwPercentage = Math.max(0, (performanceDiff / earlyScore) * 100);
    
    // Determinar si throweó
    let throwCategory = '';
    let throwColor = '';
    let throwIcon = '';
    let throwDescription = '';
    
    if (throwPercentage >= 50) {
      throwCategory = 'THROW MASIVO';
      throwColor = 'text-red-600';
      throwIcon = '💀';
      throwDescription = 'Empezó muy bien y colapsó completamente';
    } else if (throwPercentage >= 30) {
      throwCategory = 'THROW GRAVE';
      throwColor = 'text-red-500';
      throwIcon = '😡';
      throwDescription = 'Buen inicio pero decayó mucho';
    } else if (throwPercentage >= 20) {
      throwCategory = 'THROW MODERADO';
      throwColor = 'text-orange-500';
      throwIcon = '😞';
      throwDescription = 'Rendimiento decayó notablemente';
    } else if (throwPercentage >= 10) {
      throwCategory = 'DECAÍDA LEVE';
      throwColor = 'text-yellow-500';
      throwIcon = '😐';
      throwDescription = 'Ligera caída en el rendimiento';
    } else if (throwPercentage >= -10) {
      throwCategory = 'CONSISTENTE';
      throwColor = 'text-green-500';
      throwIcon = '👍';
      throwDescription = 'Mantuvo un rendimiento estable';
    } else {
      throwCategory = 'CLUTCH';
      throwColor = 'text-blue-500';
      throwIcon = '🔥';
      throwDescription = 'Mejoró hacia el final';
    }
    
    return {
      earlyScore: Math.round(earlyScore),
      lateScore: Math.round(lateScore),
      performanceDiff: Math.round(performanceDiff),
      throwPercentage: Math.round(throwPercentage),
      category: throwCategory,
      color: throwColor,
      icon: throwIcon,
      description: throwDescription,
      earlyKDA: earlyKDA.toFixed(2),
      lateKDA: lateKDA.toFixed(2),
      isThrow: throwPercentage >= 20,
      // Métricas de Net Worth
      earlyNetWorth,
      midNetWorth,
      lateNetWorth,
      earlyGPM,
      midGPM,
      lateGPM,
      earlyXPM,
      midXPM,
      lateXPM,
      netWorthProgression: {
        early: earlyNetWorth,
        mid: midNetWorth,
        late: lateNetWorth
      },
      gpmProgression: {
        early: earlyGPM,
        mid: midGPM,
        late: lateGPM
      },
      xpmProgression: {
        early: earlyXPM,
        mid: midXPM,
        late: lateXPM
      }
    };
  };

  // Función para analizar el rendimiento de un jugador en una partida
  const analyzePlayerPerformance = (player) => {
    if (!player) return null;
    
    const kda = (player.kills + player.assists) / Math.max(player.deaths, 1);
    const gpm = player.gold_per_min || 0;
    const xpm = player.xp_per_min || 0;
    const lastHits = player.last_hits || 0;
    const denies = player.denies || 0;
    const heroDamage = player.hero_damage || 0;
    const towerDamage = player.tower_damage || 0;
    const healing = player.hero_healing || 0;
    
    // Calcular score de rendimiento (0-100)
    let performanceScore = 0;
    
    // KDA (30% del score)
    if (kda >= 3) performanceScore += 30;
    else if (kda >= 2) performanceScore += 25;
    else if (kda >= 1.5) performanceScore += 20;
    else if (kda >= 1) performanceScore += 15;
    else if (kda >= 0.5) performanceScore += 10;
    else performanceScore += 5;
    
    // GPM (20% del score)
    if (gpm >= 600) performanceScore += 20;
    else if (gpm >= 500) performanceScore += 18;
    else if (gpm >= 400) performanceScore += 15;
    else if (gpm >= 300) performanceScore += 12;
    else if (gpm >= 200) performanceScore += 8;
    else performanceScore += 5;
    
    // XPM (15% del score)
    if (xpm >= 600) performanceScore += 15;
    else if (xpm >= 500) performanceScore += 12;
    else if (xpm >= 400) performanceScore += 10;
    else if (xpm >= 300) performanceScore += 8;
    else if (xpm >= 200) performanceScore += 5;
    else performanceScore += 3;
    
    // Last Hits (10% del score)
    const lhPerMin = lastHits / Math.max(player.duration / 60, 1);
    if (lhPerMin >= 6) performanceScore += 10;
    else if (lhPerMin >= 5) performanceScore += 8;
    else if (lhPerMin >= 4) performanceScore += 6;
    else if (lhPerMin >= 3) performanceScore += 4;
    else if (lhPerMin >= 2) performanceScore += 2;
    else performanceScore += 1;
    
    // Hero Damage (15% del score)
    const damagePerMin = heroDamage / Math.max(player.duration / 60, 1);
    if (damagePerMin >= 1000) performanceScore += 15;
    else if (damagePerMin >= 800) performanceScore += 12;
    else if (damagePerMin >= 600) performanceScore += 10;
    else if (damagePerMin >= 400) performanceScore += 8;
    else if (damagePerMin >= 200) performanceScore += 5;
    else performanceScore += 3;
    
    // Tower Damage (5% del score)
    const towerDamagePerMin = towerDamage / Math.max(player.duration / 60, 1);
    if (towerDamagePerMin >= 500) performanceScore += 5;
    else if (towerDamagePerMin >= 300) performanceScore += 4;
    else if (towerDamagePerMin >= 200) performanceScore += 3;
    else if (towerDamagePerMin >= 100) performanceScore += 2;
    else performanceScore += 1;
    
    // Healing (5% del score)
    const healingPerMin = healing / Math.max(player.duration / 60, 1);
    if (healingPerMin >= 200) performanceScore += 5;
    else if (healingPerMin >= 150) performanceScore += 4;
    else if (healingPerMin >= 100) performanceScore += 3;
    else if (healingPerMin >= 50) performanceScore += 2;
    else performanceScore += 1;
    
    // Determinar categoría de rendimiento
    let performanceCategory = '';
    let performanceColor = '';
    let performanceIcon = '';
    
    if (performanceScore >= 80) {
      performanceCategory = 'Excelente';
      performanceColor = 'text-green-600';
      performanceIcon = '🔥';
    } else if (performanceScore >= 65) {
      performanceCategory = 'Muy Bueno';
      performanceColor = 'text-green-500';
      performanceIcon = '⭐';
    } else if (performanceScore >= 50) {
      performanceCategory = 'Bueno';
      performanceColor = 'text-blue-500';
      performanceIcon = '👍';
    } else if (performanceScore >= 35) {
      performanceCategory = 'Regular';
      performanceColor = 'text-yellow-500';
      performanceIcon = '😐';
    } else if (performanceScore >= 20) {
      performanceCategory = 'Malo';
      performanceColor = 'text-orange-500';
      performanceIcon = '😞';
    } else {
      performanceCategory = 'Muy Malo';
      performanceColor = 'text-red-500';
      performanceIcon = '💀';
    }
    
    return {
      score: Math.round(performanceScore),
      category: performanceCategory,
      color: performanceColor,
      icon: performanceIcon,
      kda: kda.toFixed(2),
      gpm,
      xpm,
      lastHits,
      heroDamage,
      towerDamage,
      healing
    };
  };

  // Función para verificar si hay amigos en una partida
  const checkFriendsInMatch = async (match) => {
    if (!friends || friends.length === 0) {
      console.log('❌ No hay amigos para verificar en partida', match.match_id);
      return [];
    }
    
    console.log(`🔍 Verificando amigos en partida ${match.match_id}...`);
    console.log(`🔍 Amigos disponibles:`, friends.length);
    
    try {
      const response = await fetch(`https://api.opendota.com/api/matches/${match.match_id}`);
      if (!response.ok) {
        console.log(`❌ Error API para partida ${match.match_id}: ${response.status}`);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const matchDetails = await response.json();
      if (!matchDetails || !matchDetails.players) {
        console.log(`❌ Sin datos de jugadores para partida ${match.match_id}`);
        return [];
      }
      
      console.log(`✅ Datos de partida ${match.match_id} obtenidos, ${matchDetails.players.length} jugadores`);
      
      // Analizar rendimiento de todos los jugadores
      const performanceAnalysis = {};
      const throwAnalysis = {};
      
      matchDetails.players.forEach(player => {
        const analysis = analyzePlayerPerformance(player);
        const throwData = analyzeThrowPotential(player, matchDetails.duration);
        
        if (analysis) {
          performanceAnalysis[player.account_id] = {
            ...analysis,
            playerName: player.personaname || 'Jugador Anónimo',
            heroId: player.hero_id,
            isRadiant: player.is_radiant,
            team: player.is_radiant ? 'Radiant' : 'Dire'
          };
        }
        
        if (throwData) {
          throwAnalysis[player.account_id] = {
            ...throwData,
            playerName: player.personaname || 'Jugador Anónimo',
            heroId: player.hero_id,
            isRadiant: player.is_radiant,
            team: player.is_radiant ? 'Radiant' : 'Dire'
          };
        }
      });
      
      // Guardar análisis de rendimiento y throw
      setPlayerPerformanceAnalysis(prev => ({
        ...prev,
        [match.match_id]: performanceAnalysis
      }));
      
      setThrowAnalysis(prev => ({
        ...prev,
        [match.match_id]: throwAnalysis
      }));
    
    const friendsFound = [];
    
    for (const friend of friends) {
      // Convertir Steam ID de 64 bits a Account ID
      const friendAccountId = friend.steamid ? (parseInt(friend.steamid) - 76561197960265728).toString() : null;
      
      for (const player of matchDetails.players) {
        // Verificar por Account ID
        if (friendAccountId && player.account_id && player.account_id.toString() === friendAccountId) {
          friendsFound.push({
            ...friend,
            account_id: player.account_id,
            hero_id: player.hero_id,
            is_radiant: player.is_radiant
          });
          break;
        }
        // Verificar por nombre (fallback)
        if (player.personaname && friend.personaname && 
            player.personaname.toLowerCase() === friend.personaname.toLowerCase()) {
          friendsFound.push({
            ...friend,
            account_id: player.account_id,
            hero_id: player.hero_id,
            is_radiant: player.is_radiant
          });
          break;
        }
      }
    }
    
    console.log(`🔍 Resultado para partida ${match.match_id}: ${friendsFound.length} amigos encontrados`);
    if (friendsFound.length > 0) {
      console.log(`✅ Amigos encontrados:`, friendsFound.map(f => f.personaname));
    }
    
    return friendsFound;
    } catch (error) {
      console.error(`Error obteniendo detalles de partida ${match.match_id}:`, error);
      return [];
    }
  };

  // Función para verificar amigos en todas las partidas (manual y automática)
  const checkAllMatchesForFriends = async () => {
    
    if (!friends || friends.length === 0) {
      console.log('❌ No hay amigos cargados para verificar');
      return;
    }

    console.log('✅ Iniciando verificación de amigos...');
    setCheckingFriends(true);
    const newFriendsInMatches = {};
    
    try {
      // Filtrar partidas que podrían tener amigos (party_size null, 0, 1, o 2)
      const matchesToCheck = matches.filter(match => {
        // Usar el party_size original para el filtro, no getPartySize que depende de friendsInMatches
        const originalPartySize = match.party_size;
        return originalPartySize === null || originalPartySize <= 2;
      });
      
      console.log(`🔍 Verificando ${matchesToCheck.length} partidas para encontrar amigos...`);
      
      // Inicializar progreso
      setLoadingProgress({ current: 0, total: matchesToCheck.length });
      
      for (let i = 0; i < matchesToCheck.length; i++) {
        const match = matchesToCheck[i];
        console.log(`🔍 Verificando partida ${match.match_id}... (${i + 1}/${matchesToCheck.length})`);
        
        // Actualizar progreso
        setLoadingProgress({ current: i + 1, total: matchesToCheck.length });
        
        const friendsInMatch = await checkFriendsInMatch(match);
        
        if (friendsInMatch.length > 0) {
          newFriendsInMatches[match.match_id] = friendsInMatch;
          console.log(`✅ Encontrados ${friendsInMatch.length} amigos en partida ${match.match_id}:`, friendsInMatch.map(f => f.personaname));
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setFriendsInMatches(newFriendsInMatches);
      
      // Calcular estadísticas DESPUÉS de la verificación de amigos
      const stats = calculateMatchStats(matches);
      setMatchStats(stats);
      setStatsReady(true); // Marcar estadísticas como listas
      
      // Marcar análisis de compañeros como completo y mostrar partidas
      setCompanionsAnalysisComplete(true);
      setMatchesLoaded(true);
      
    } catch (error) {
      // En caso de error, marcar como completo para poder mostrar las partidas
      setCompanionsAnalysisComplete(true);
      setMatchesLoaded(true);
      setError(`Error verificando amigos: ${error.message}`);
    } finally {
      setCheckingFriends(false);
      setLoadingProgress({ current: 0, total: 0 });
      setAutoCheckFriends(false);
    }
  };

  const checkAllMatchesForFriendsWithData = async (matchesData) => {
    console.log('🔍 checkAllMatchesForFriendsWithData ejecutándose...');
    console.log('🔍 Debug - Estado en checkAllMatchesForFriendsWithData:');
    console.log('  - friends.length:', friends ? friends.length : 'undefined');
    console.log('  - matchesData.length:', matchesData.length);
    console.log('  - autoCheckFriends:', autoCheckFriends);
    console.log('  - checkingFriends:', checkingFriends);
    
    if (!friends || friends.length === 0) {
      console.log('❌ No hay amigos cargados para verificar');
      return;
    }

    console.log('✅ Iniciando verificación de amigos...');
    setCheckingFriends(true);
    const newFriendsInMatches = {};
    
    try {
      // Filtrar partidas que podrían tener amigos (party_size null, 0, 1, o 2)
      const matchesToCheck = matchesData.filter(match => {
        // Usar el party_size original para el filtro, no getPartySize que depende de friendsInMatches
        const originalPartySize = match.party_size;
        return originalPartySize === null || originalPartySize <= 2;
      });
      
      console.log(`🔍 Verificando ${matchesToCheck.length} partidas para encontrar amigos...`);
      
      // Inicializar progreso
      setLoadingProgress({ current: 0, total: matchesToCheck.length });
      
      for (let i = 0; i < matchesToCheck.length; i++) {
        const match = matchesToCheck[i];
        console.log(`🔍 Verificando partida ${match.match_id}... (${i + 1}/${matchesToCheck.length})`);
        
        // Actualizar progreso
        setLoadingProgress({ current: i + 1, total: matchesToCheck.length });
        
        const friendsInMatch = await checkFriendsInMatch(match);
        
        if (friendsInMatch.length > 0) {
          newFriendsInMatches[match.match_id] = friendsInMatch;
          console.log(`✅ Encontrados ${friendsInMatch.length} amigos en partida ${match.match_id}:`, friendsInMatch.map(f => f.personaname));
        }
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setFriendsInMatches(newFriendsInMatches);
      
      // Calcular estadísticas DESPUÉS de la verificación de amigos
      // Usar newFriendsInMatches directamente en lugar del estado
      const stats = calculateMatchStatsWithFriends(matchesData, newFriendsInMatches);
      setMatchStats(stats);
      setStatsReady(true); // Marcar estadísticas como listas
      
      // Marcar análisis de compañeros como completo y mostrar partidas
      setCompanionsAnalysisComplete(true);
      setMatchesLoaded(true);
      
    } catch (error) {
      // En caso de error, marcar como completo para poder mostrar las partidas
      setCompanionsAnalysisComplete(true);
      setMatchesLoaded(true);
      setError(`Error verificando amigos: ${error.message}`);
    } finally {
      setCheckingFriends(false);
      setLoadingProgress({ current: 0, total: 0 });
      setAutoCheckFriends(false);
    }
  };

  // Función para cargar partidas manualmente con selector de tiempo
  // Función para ejecutar verificación con retry si no hay amigos
  const executeVerification = (matchesData, retryCount = 0) => {
    const maxRetries = 10; // Máximo 10 intentos (20 segundos)
    
    console.log(`🔄 Ejecutando verificación automática... (intento ${retryCount + 1}/${maxRetries})`);
    console.log('🔍 Estado actual de amigos:', friends ? friends.length : 'undefined');
    
    if (!friends || friends.length === 0) {
      if (retryCount >= maxRetries) {
        // Marcar como completo aunque no haya amigos para poder mostrar las partidas
        setCompanionsAnalysisComplete(true);
        setMatchesLoaded(true);
        return;
      }
      
      console.log(`⏳ No hay amigos aún, esperando 2 segundos más... (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => executeVerification(matchesData, retryCount + 1), 2000);
      return;
    }
    
    console.log('✅ Amigos disponibles, ejecutando verificación con partidas cargadas...');
    // Usar las partidas que acabamos de cargar directamente
    checkAllMatchesForFriendsWithData(matchesData);
  };

  const loadMatchesWithTimeFilter = async (timeFilter) => {
    console.log('🔍 Debug - Variables de estado:');
    console.log('  - authenticatedUser:', authenticatedUser);
    console.log('  - steamId:', steamId);
    console.log('  - steam64Id:', steam64Id);
    
    if (!authenticatedUser || !steamId || steamId.trim() === "") {
      alert('Primero debes autenticarte con Steam');
      return;
    }

    // Verificar cache primero
    const cacheKey = `${steamId}_${timeFilter}`;
    const now = Date.now();
    const cacheExpiry = 5 * 60 * 1000; // 5 minutos
    
    if (cache[cacheKey] && (now - cache[cacheKey].timestamp) < cacheExpiry) {
      console.log('📦 Usando datos del cache...');
      setMatches(cache[cacheKey].data);
      setTimeFilter(timeFilter);
      setMatchesLoaded(true);
      setLoading(false);
      return;
    }

    // Verificar si el último request fue hace menos de 10 segundos (evitar spam)
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < 10000) {
      const waitTime = Math.ceil((10000 - timeSinceLastRequest) / 1000);
      console.log(`⏳ Esperando ${waitTime} segundos antes de hacer otra solicitud...`);
      setError(`Por favor espera ${waitTime} segundos antes de hacer otra solicitud.`);
      return;
    }

    setLoading(true);
    setError("");
    setMatchesLoaded(false);
    setStatsReady(false);
    setLastRequestTime(now);
    
    try {
      console.log(`🆔 Cargando partidas para Steam ID: ${steamId} con filtro: ${timeFilter}`);
      
      // Verificar que tenemos un Steam ID válido
      if (!steamId || steamId.trim() === "") {
        throw new Error("No hay Steam ID disponible. Por favor, auténticate con Steam primero.");
      }
      
      // Cargar partidas reales desde OpenDota API
      // OpenDota requiere Steam ID de 32 bits (Account ID)
      const steam32Id = steamId; // Ya es el ID de 32 bits
      
      // Calcular días hacia atrás basado en el filtro (OpenDota usa días, no timestamps)
      let daysAgo;
      
      switch (timeFilter) {
        case 'day':
          daysAgo = 1; // 1 día
          break;
        case 'week':
          daysAgo = 7; // 1 semana
          break;
        case 'month':
          daysAgo = 30; // 30 días
          break;
        default:
          daysAgo = 30; // Por defecto 30 días
      }
      
      const API_URL = `https://api.opendota.com/api/players/${steam32Id}/matches?date=${daysAgo}`;
      
      console.log('🔗 Cargando partidas desde OpenDota API...');
      console.log('🔗 Steam ID 32-bit:', steam32Id);
      console.log('🔗 Filtro seleccionado:', timeFilter);
      console.log('🔗 Días hacia atrás:', daysAgo);
      console.log('🔗 URL completa:', API_URL);
      
      // Función para hacer fetch con retry y rate limiting
      const fetchWithRetry = async (url, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔄 Intento ${attempt}/${maxRetries} para cargar partidas...`);
            
            const response = await fetch(url);
            console.log('📡 Respuesta de OpenDota:', response.status, response.statusText);
            
            if (response.status === 429) {
              // Rate limit alcanzado
              const retryAfter = response.headers.get('Retry-After');
              const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
              
              console.log(`⏳ Rate limit alcanzado. Esperando ${waitTime/1000} segundos antes del siguiente intento...`);
              setRateLimitWaiting(true);
              
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
                setRateLimitWaiting(false);
                continue;
              } else {
                setRateLimitWaiting(false);
                throw new Error(`Rate limit alcanzado después de ${maxRetries} intentos. Por favor espera unos minutos antes de intentar nuevamente.`);
              }
            }
            
            if (!response.ok) {
              throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return response;
          } catch (error) {
            console.log(`❌ Error en intento ${attempt}:`, error.message);
            
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Espera exponencial entre intentos
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`⏳ Esperando ${waitTime/1000} segundos antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      };
      
      const response = await fetchWithRetry(API_URL);
      
      const data = await response.json();
      console.log('📊 Datos recibidos de OpenDota:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data || data.length === 0) {
        console.log('⚠️ No se encontraron partidas en OpenDota');
        setMatches([]);
        setTimeFilter(timeFilter);
        setMatchesLoaded(true);
        return;
      }
      
      // Filtrar partidas por tiempo
      const filteredData = filterMatchesByTime(data, timeFilter);
      
      // Guardar en cache
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: filteredData,
          timestamp: now
        }
      }));
      
      setMatches(filteredData);
      setTimeFilter(timeFilter);
      setStatsReady(false); // Resetear estadísticas para nuevas partidas
      setCompanionsAnalysisComplete(false); // Resetear análisis de compañeros
          
      // Cargar héroes en paralelo si no están cargados
      const heroesPromise = Object.keys(heroes).length === 0 ? fetchHeroes() : Promise.resolve();
      
      // Ejecutar ambas tareas en paralelo
      await Promise.all([
        heroesPromise,
        Promise.resolve() // Placeholder para futuras tareas paralelas
      ]);
          
      console.log(`✅ ${filteredData.length} partidas cargadas con filtro ${timeFilter}`);
      
          // Verificar amigos automáticamente siempre después de cargar partidas
          console.log('🔄 Iniciando verificación automática de amigos...');
          console.log('🔍 Debug - Estado antes de verificación:');
          console.log('  - matches.length:', filteredData.length);
          console.log('  - friends.length:', friends ? friends.length : 'undefined');
          console.log('  - autoCheckFriends:', autoCheckFriends);
          console.log('  - checkingFriends:', checkingFriends);
          
          setAutoCheckFriends(true);
          
          // Usar la función executeVerification global
          
          // Verificar si ya tenemos amigos cargados
          if (friends && friends.length > 0) {
            console.log('✅ Amigos ya disponibles, ejecutando verificación inmediatamente...');
            setTimeout(() => checkAllMatchesForFriendsWithData(filteredData), 500);
          } else {
            console.log('⏳ Esperando a que se carguen los amigos...');
            // Pequeña pausa para que el usuario vea que las partidas se cargaron
            setTimeout(() => executeVerification(filteredData), 1000);
          }
  
    } catch (error) {
      console.error('❌ Error cargando partidas:', error);
      
      let errorMessage = 'Error desconocido al cargar partidas';
      
      if (error.message.includes('Rate limit')) {
        errorMessage = '⚠️ Demasiadas solicitudes a la API. Por favor espera 5-10 minutos antes de intentar nuevamente. La API de OpenDota tiene límites estrictos.';
      } else if (error.message.includes('429')) {
        errorMessage = '⚠️ Límite de solicitudes alcanzado. Por favor espera 5-10 minutos y vuelve a intentar. Intenta usar el cache si está disponible.';
      } else if (error.message.includes('Network')) {
        errorMessage = '🌐 Error de conexión. Verifica tu conexión a internet.';
      } else if (error.message.includes('404')) {
        errorMessage = '❌ No se encontraron partidas para este período.';
      } else if (error.message.includes('403')) {
        errorMessage = '🔒 Acceso denegado. Verifica que tu perfil de Steam sea público.';
      } else {
        errorMessage = `❌ Error cargando partidas: ${error.message}`;
      }
      
      setError(errorMessage);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para iniciar autenticación con Steam
  const handleSteamAuth = () => {
    loginWithSteam();
  };

  // Función para abrir el popup de detalles de partida
  const openMatchPopup = (match) => {
    setSelectedMatch(match);
    setShowMatchPopup(true);
    fetchMatchDetails(match.match_id);
  };

  // Función para cerrar el popup
  const closeMatchPopup = () => {
    setShowMatchPopup(false);
    setSelectedMatch(null);
    setMatchDetails(null);
  };

  // Función para abrir el perfil de Steam
  const openSteamProfile = () => {
    setShowSteamProfile(true);
  };

  // Función para cerrar el perfil de Steam
  const closeSteamProfile = () => {
    setShowSteamProfile(false);
  };

  // Función para manejar selección de período predefinido
  const handlePeriodSelection = (period) => {
    setTimeFilter(period);
    setShowCalendar(false);
    setCustomStartDate('');
    setCustomEndDate('');
    
    // Cargar partidas con el período seleccionado
    loadMatchesWithTimeFilter(period);
  };

  // Función para manejar fechas personalizadas
  const handleCustomDateSelection = () => {
    if (!customStartDate || !customEndDate) {
      alert('Por favor selecciona ambas fechas (inicio y fin)');
      return;
    }
    
    const startTimestamp = Math.floor(new Date(customStartDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(customEndDate).getTime() / 1000);
    
    console.log('🗓️ Selección de fechas personalizadas:');
    console.log('🗓️ Fecha inicio:', customStartDate, '-> Timestamp:', startTimestamp);
    console.log('🗓️ Fecha fin:', customEndDate, '-> Timestamp:', endTimestamp);
    
    if (endTimestamp <= startTimestamp) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }
    
    // Validar que la fecha no sea muy antigua (OpenDota tiene límites)
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - (365 * 24 * 60 * 60);
    
    if (startTimestamp < oneYearAgo) {
      alert('La fecha de inicio no puede ser anterior a hace un año. OpenDota tiene límites de datos.');
      return;
    }
    
    setTimeFilter('custom');
    setShowCalendar(false);
    loadMatchesWithCustomDates(startTimestamp, endTimestamp);
  };

  // Función para cargar partidas con fechas personalizadas
  const loadMatchesWithCustomDates = async (startTimestamp, endTimestamp) => {
    setLoading(true);
    setError("");
    setMatchesLoaded(false);
    setStatsReady(false);
    
    try {
      if (!steamId) {
        throw new Error("Steam ID no disponible");
      }

      const steam32Id = steamId;
      
      // Calcular días desde la fecha de inicio hasta ahora
      const now = Math.floor(Date.now() / 1000);
      const daysSinceStart = Math.ceil((now - startTimestamp) / (24 * 60 * 60));
      
      // La API de OpenDota solo soporta 'date' (días hacia atrás), no fechas específicas
      // Cargamos desde la fecha de inicio y filtramos en el cliente por la fecha de fin
      const API_URL = `https://api.opendota.com/api/players/${steam32Id}/matches?date=${daysSinceStart}`;
      
      console.log('🔗 Cargando partidas con fechas personalizadas...');
      console.log('🔗 Steam ID 32-bit:', steam32Id);
      console.log('🔗 Fecha inicio:', new Date(startTimestamp * 1000).toLocaleString());
      console.log('🔗 Fecha fin:', new Date(endTimestamp * 1000).toLocaleString());
      console.log('🔗 Días desde inicio:', daysSinceStart);
      console.log('🔗 URL:', API_URL);
      
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        setError("No se encontraron partidas en el período seleccionado");
        return;
      }
      
      // Filtrar partidas que estén dentro del rango de fechas
      const filteredData = data.filter(match => {
        const matchTime = match.start_time;
        return matchTime >= startTimestamp && matchTime <= endTimestamp;
      });
      
      console.log(`📊 Partidas totales cargadas: ${data.length}`);
      console.log(`📊 Partidas filtradas por fecha: ${filteredData.length}`);
      
      if (filteredData.length === 0) {
        setError("No se encontraron partidas en el período específico seleccionado");
        return;
      }
      
      setMatches(filteredData);
      setMatchesLoaded(true);
      
      // Cargar héroes en paralelo si no están cargados
      const heroesPromise = Object.keys(heroes).length === 0 ? fetchHeroes() : Promise.resolve();
      
      // Ejecutar tareas en paralelo
      await Promise.all([
        heroesPromise,
        // Iniciar verificación automática con los datos filtrados
        Promise.resolve(executeVerification(filteredData))
      ]);
      
    } catch (error) {
      console.error('Error cargando partidas:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el texto del período actual
  const getPeriodText = () => {
    if (timeFilter === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate).toLocaleDateString('es-ES');
      const endDate = new Date(customEndDate).toLocaleDateString('es-ES');
      return `${startDate} - ${endDate}`;
    }
    
    const periodNames = {
      'day': 'Último día',
      'week': 'Última semana', 
      'month': 'Último mes'
    };
    
    return periodNames[timeFilter] || 'Período personalizado';
  };

  // Función para calcular el MVP de la partida con algoritmo avanzado
  const calculateMVP = (players) => {
    if (!players || players.length === 0) return null;
    
    let mvp = null;
    let bestScore = -1;
    
    // Calcular estadísticas promedio del equipo para normalización
    const teamStats = players.reduce((acc, player) => {
      if (!player.account_id) return acc;
      
      acc.totalKills += player.kills || 0;
      acc.totalDeaths += player.deaths || 0;
      acc.totalAssists += player.assists || 0;
      acc.totalNetWorth += player.net_worth || 0;
      acc.totalHeroDamage += player.hero_damage || 0;
      acc.totalTowerDamage += player.tower_damage || 0;
      acc.totalLastHits += player.last_hits || 0;
      acc.totalGPM += player.gold_per_min || 0;
      acc.totalXPM += player.xp_per_min || 0;
      acc.totalHealing += player.hero_healing || 0;
      acc.totalStuns += player.stuns || 0;
      acc.playerCount++;
      
      return acc;
    }, {
      totalKills: 0, totalDeaths: 0, totalAssists: 0, totalNetWorth: 0,
      totalHeroDamage: 0, totalTowerDamage: 0, totalLastHits: 0,
      totalGPM: 0, totalXPM: 0, totalHealing: 0, totalStuns: 0, playerCount: 0
    });
    
    const avgKills = teamStats.totalKills / teamStats.playerCount;
    const avgDeaths = teamStats.totalDeaths / teamStats.playerCount;
    const avgAssists = teamStats.totalAssists / teamStats.playerCount;
    const avgNetWorth = teamStats.totalNetWorth / teamStats.playerCount;
    const avgHeroDamage = teamStats.totalHeroDamage / teamStats.playerCount;
    const avgTowerDamage = teamStats.totalTowerDamage / teamStats.playerCount;
    const avgLastHits = teamStats.totalLastHits / teamStats.playerCount;
    const avgGPM = teamStats.totalGPM / teamStats.playerCount;
    const avgXPM = teamStats.totalXPM / teamStats.playerCount;
    const avgHealing = teamStats.totalHealing / teamStats.playerCount;
    const avgStuns = teamStats.totalStuns / teamStats.playerCount;
    
    players.forEach(player => {
      if (!player.account_id) return; // Skip bots or anonymous players
      
      // Extraer estadísticas del jugador
      const kills = player.kills || 0;
      const deaths = player.deaths || 0;
      const assists = player.assists || 0;
      const netWorth = player.net_worth || 0;
      const heroDamage = player.hero_damage || 0;
      const towerDamage = player.tower_damage || 0;
      const lastHits = player.last_hits || 0;
      const gpm = player.gold_per_min || 0;
      const xpm = player.xp_per_min || 0;
      const healing = player.hero_healing || 0;
      const stuns = player.stuns || 0;
      const duration = player.duration || 0;
      
      // 1. KDA Score (normalizado y mejorado)
      const kdaRatio = deaths > 0 ? (kills + assists) / deaths : kills + assists;
      const avgKdaRatio = avgDeaths > 0 ? (avgKills + avgAssists) / avgDeaths : avgKills + avgAssists;
      const kdaScore = Math.max(0, (kdaRatio / Math.max(avgKdaRatio, 1)) * 100);
      
      // 2. Combat Score (daño y participación)
      const combatParticipation = (kills + assists) / Math.max(avgKills + avgAssists, 1);
      const damageScore = (heroDamage / Math.max(avgHeroDamage, 1)) * 50;
      const towerScore = (towerDamage / Math.max(avgTowerDamage, 1)) * 30;
      const combatScore = (combatParticipation * 40) + damageScore + towerScore;
      
      // 3. Economic Score (eficiencia económica)
      const netWorthScore = (netWorth / Math.max(avgNetWorth, 1)) * 60;
      const gpmScore = (gpm / Math.max(avgGPM, 1)) * 40;
      const farmScore = (lastHits / Math.max(avgLastHits, 1)) * 30;
      const economicScore = netWorthScore + gpmScore + farmScore;
      
      // 4. Support Score (para roles de soporte)
      const healingScore = (healing / Math.max(avgHealing, 1)) * 40;
      const stunScore = (stuns / Math.max(avgStuns, 1)) * 20;
      const supportScore = healingScore + stunScore + (assists * 2);
      
      // 5. Experience Score
      const xpScore = (xpm / Math.max(avgXPM, 1)) * 30;
      
      // 6. Bonus por rendimiento excepcional
      let bonusScore = 0;
      if (kdaRatio >= 5) bonusScore += 50; // KDA excepcional
      if (heroDamage >= avgHeroDamage * 2) bonusScore += 30; // Daño excepcional
      if (netWorth >= avgNetWorth * 1.5) bonusScore += 25; // Economía excepcional
      if (deaths <= 1 && kills >= 5) bonusScore += 20; // Juego seguro con impacto
      
      // 7. Penalización por rendimiento pobre
      let penaltyScore = 0;
      if (deaths > avgDeaths * 2) penaltyScore -= 30; // Muchas muertes
      if (kdaRatio < 0.5 && deaths > 5) penaltyScore -= 25; // KDA muy malo
      if (netWorth < avgNetWorth * 0.5) penaltyScore -= 20; // Economía muy pobre
      
      // Score final ponderado
      const totalScore = Math.max(0, 
        (kdaScore * 0.25) + 
        (combatScore * 0.25) + 
        (economicScore * 0.20) + 
        (supportScore * 0.15) + 
        (xpScore * 0.10) + 
        bonusScore + 
        penaltyScore
      );
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        mvp = {
          ...player,
          mvpScore: totalScore,
          scoreBreakdown: {
            kdaScore: Math.round(kdaScore),
            combatScore: Math.round(combatScore),
            economicScore: Math.round(economicScore),
            supportScore: Math.round(supportScore),
            xpScore: Math.round(xpScore),
            bonusScore: Math.round(bonusScore),
            penaltyScore: Math.round(penaltyScore)
          }
        };
      }
    });
    
    return mvp;
  };

  // Función para calcular MVP de una partida específica (versión simplificada)
  const calculateMatchMVP = (match) => {
    // Esta es una versión simplificada para mostrar en la lista
    // Solo compara con el promedio general de la partida
    const kills = match.kills || 0;
    const deaths = match.deaths || 0;
    const assists = match.assists || 0;
    const gpm = match.gold_per_min || 0;
    const xpm = match.xp_per_min || 0;
    
    // Score simplificado para la lista
    const kdaRatio = deaths > 0 ? (kills + assists) / deaths : kills + assists;
    const economicScore = gpm / 10;
    const xpScore = xpm / 10;
    
    // Score total simplificado
    const totalScore = (kills * 3) + (assists * 1.5) - (deaths * 1) + economicScore + xpScore;
    
    // Umbrales para considerar MVP (ajustables)
    const mvpThreshold = 50; // Score mínimo para ser considerado MVP
    
    return {
      isMVP: totalScore >= mvpThreshold,
      score: Math.round(totalScore),
      kdaRatio: Math.round(kdaRatio * 10) / 10
    };
  };

  // Función para obtener datos detallados de la partida
  const fetchMatchDetails = async (matchId) => {
    setLoadingMatchDetails(true);
    try {
      const response = await fetch(`https://api.opendota.com/api/matches/${matchId}`);
      if (!response.ok) {
        throw new Error('Error al obtener detalles de la partida');
      }
      const data = await response.json();
      setMatchDetails(data);
    } catch (error) {
      console.error('Error obteniendo detalles de la partida:', error);
      setMatchDetails(null);
    } finally {
      setLoadingMatchDetails(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo con imagen Radiant vs Dire */}
      <div className="fixed inset-0 z-0">
        {/* Imagen de fondo principal - Radiant vs Dire */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react//home/radiant_dire5.jpg')`,
            backgroundAttachment: 'fixed',
            backgroundSize: 'cover'
          }}
        ></div>
        
        {/* Overlays para mejorar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/75 via-slate-800/70 to-slate-900/75"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-transparent to-red-900/20"></div>
        
        {/* Efecto de partículas sutiles con colores Radiant/Dire */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-red-400 rounded-full animate-pulse delay-300"></div>
          <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-700"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse delay-1000"></div>
        </div>
        
        {/* Efecto de brillo dinámico */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      </div>
      {/* Navbar mejorada */}
      <nav className="relative z-10 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 shadow-2xl border-b-4 border-gradient-to-r from-orange-500 to-red-500 backdrop-blur-md">
        {/* Efecto de brillo superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="text-3xl animate-bounce">⚔️</div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Dota 2 Matches Analyzer
                </h1>
                <p className="text-xs text-gray-400 -mt-1">Análisis profesional de partidas</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              {authenticatedUser && (
                <div className="flex items-center space-x-4">
                     {/* Avatar con efecto hover mejorado */}
                     <div className="relative group" onClick={() => setShowUserPopup(true)}>
                       <img 
                         src={authenticatedUser.avatar} 
                         alt={`Avatar de ${authenticatedUser.name}`}
                         className="w-12 h-12 rounded-full border-2 border-orange-400 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 cursor-pointer"
                         onError={(e) => {
                           e.target.src = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="#2196F3" rx="24"/><text x="24" y="30" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">Steam</text></svg>`)}`;
                         }}
                       />
                       <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                       
                       {/* Tooltip mejorado */}
                       <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-3 px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-orange-400/30 max-w-[200px]">
                         <div className="flex items-center gap-1">
                           <span>👤</span>
                           <span>Ver información</span>
                         </div>
                         <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-b-3 border-l-transparent border-r-transparent border-b-slate-900"></div>
                       </div>
                     </div>
                  
                  {/* Información del usuario */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-semibold text-sm truncate max-w-[150px]" title={authenticatedUser.name}>
                      {authenticatedUser.name}
                    </span>
                    <span className="text-orange-300 text-xs truncate max-w-[150px]" title={`Steam ID: ${authenticatedUser.steamID}`}>
                      ID: {authenticatedUser.steamID.substring(0, 8)}...
                    </span>
                    <span className="text-blue-300 text-xs">
                      👥 {friends.length} amigos
                    </span>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex space-x-2">
                    <button
                      disabled={isBusy}
                      onClick={() => window.open(`https://steamcommunity.com/profiles/${authenticatedUser.steamID}`, '_blank')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                    >
                      <span>👤</span>
                      <span>Perfil Steam</span>
                    </button>
                    
                    <button
                      disabled={isBusy}
                      onClick={logoutUser}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2"
                    >
                      <span>🚪</span>
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 p-6 max-w-5xl mx-auto">
        {/* Overlay que bloquea toda la interfaz durante carga de amigos */}
      {loadingFriends && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200"></div>
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-green-600 border-r-green-500 absolute top-0 left-0"></div>
              </div>
              <div>
                <span className="text-green-800 font-semibold text-lg block">Cargando lista de amigos...</span>
                <span className="text-green-600 text-sm">Esto puede tomar unos segundos</span>
              </div>
            </div>
            {friendsLoadingProgress.total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-green-700 mb-2">
                  <span>Amigos cargados: {friendsLoadingProgress.current} de {friendsLoadingProgress.total}</span>
                  <span>{Math.round((friendsLoadingProgress.current / friendsLoadingProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-green-500 via-green-400 to-green-600 h-4 rounded-full transition-all duration-500 ease-out relative"
                    style={{ width: `${(friendsLoadingProgress.current / friendsLoadingProgress.total) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 text-center">
              Por favor espera mientras cargamos tu lista de amigos de Steam...
            </p>
          </div>
        </div>
      )}



      {/* Notificación sobre amigos predefinidos */}
      {friendsNote && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 text-lg">⚠️</div>
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Información sobre amigos</h3>
              <p className="text-sm text-yellow-700 mb-2">{friendsNote}</p>
              <div className="text-xs text-yellow-600 bg-yellow-100 rounded p-2">
                <strong>💡 Tip:</strong> Para ver tus amigos reales de Steam, ve a tu perfil de Steam → Editar perfil → Privacidad → y configura "Lista de amigos" como "Público".
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón para cambiar período de partidas */}
      {matchesLoaded && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">📅 Cambiar período de partidas</h3>
              <p className="text-sm text-gray-600">
                Período actual: <span className="font-medium">{getPeriodText()}</span>
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <span>📅</span>
                <span>Datos actualizados: {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </p>
              {cache[`${steamId}_${timeFilter}`] && (
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                  <span>📦</span>
                  <span>Datos en cache (válido por 5 minutos)</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                disabled={isBusy}
                onClick={() => {
                  setMatches([]);
                  setMatchesLoaded(false);
                  setStatsReady(false);
                  setMatchStats({ solo: { wins: 0, losses: 0 }, party: { wins: 0, losses: 0 } });
                  setFriendsInMatches({});
                  setAutoCheckFriends(false);
                  setCheckingFriends(false);
                  setLoadingProgress({ current: 0, total: 0 });
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
              >
                🔄 Cambiar período
              </button>
              
            </div>
          </div>
        </div>
      )}

      {/* Selector de tiempo épico para cargar partidas */}
      {!matchesLoaded && (
        <div className="relative z-10 mb-8">
          <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-orange-400/30 rounded-2xl p-8 shadow-2xl">
            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-t-2xl"></div>
            
            {/* Header épico */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mb-4 shadow-xl animate-pulse">
                <span className="text-2xl">⚔️</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Seleccionar Período de Partidas
              </h3>
              <p className="text-gray-300 text-sm">
                Elige qué período de tiempo quieres analizar para encontrar amigos en tus partidas
              </p>
            </div>
            
            {/* Grid de períodos épico */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 justify-center">
              <button
                disabled={isBusy}
                onClick={() => handlePeriodSelection("day")}
                className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">⚡</div>
                  <div className="font-bold text-lg">Último día</div>
                  <div className="text-green-200 text-sm">Partidas de hoy</div>
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-2 group-hover:animate-pulse"></div>
                </div>
              </button>
              
              <button
                disabled={isBusy}
                onClick={() => handlePeriodSelection("week")}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">📆</div>
                  <div className="font-bold text-lg">Última semana</div>
                  <div className="text-blue-200 text-sm">7 días</div>
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-2 group-hover:animate-pulse"></div>
                </div>
              </button>
              
              <button
                disabled={isBusy}
                onClick={() => handlePeriodSelection("month")}
                className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <div className="relative text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">📊</div>
                  <div className="font-bold text-lg">Último mes</div>
                  <div className="text-orange-200 text-sm">30 días</div>
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-2 group-hover:animate-pulse"></div>
                </div>
              </button>
            </div>
            
            {/* Selector de fecha personalizada */}
            <div className="mt-8 border-t border-orange-400/20 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-3">
                  <span className="text-2xl">🗓️</span>
                  <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Fechas Personalizadas</span>
                </h4>
                <button
                  disabled={isBusy}
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-lg text-sm transition-all duration-300 transform hover:scale-105 font-semibold flex items-center gap-2"
                >
                  <span>{showCalendar ? '👁️‍🗨️' : '👁️'}</span>
                  <span>{showCalendar ? 'Ocultar' : 'Mostrar'} Calendario</span>
                </button>
              </div>
              
              {showCalendar && (
                <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-orange-400/30 rounded-2xl p-6 space-y-6 shadow-2xl animate-in slide-in-from-top-2 duration-300">
                  {/* Mensaje de bienvenida para primera vez */}
                  {!matchesLoaded && (
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">👋</div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">¡Bienvenido!</h3>
                          <p className="text-blue-200 text-sm">
                            Selecciona un período para cargar tus partidas de Dota 2
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Header del calendario */}
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                      <span className="text-2xl">🗓️</span>
                      <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Seleccionar Rango de Fechas</span>
                    </h4>
                    <p className="text-sm text-gray-300">
                      Elige el período específico para analizar tus partidas
                    </p>
                  </div>
                  
                  {/* Selectores de fecha modernos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fecha de Inicio */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <span>Fecha de Inicio</span>
                      </label>
                      <div className="relative group">
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-orange-400/30 rounded-xl text-white focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 transition-all duration-300 group-hover:border-orange-400/50 shadow-lg hover:shadow-xl backdrop-blur-sm"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
                      </div>
                      {customStartDate && (
                        <div className="text-xs text-orange-300 bg-orange-500/20 px-3 py-2 rounded-lg inline-block border border-orange-400/30">
                          📅 {new Date(customStartDate).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      )}
                    </div>
                    
                    {/* Fecha de Fin */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <span>Fecha de Fin</span>
                      </label>
                      <div className="relative group">
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-800/50 border-2 border-orange-400/30 rounded-xl text-white focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-400/20 transition-all duration-300 group-hover:border-orange-400/50 shadow-lg hover:shadow-xl backdrop-blur-sm"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
                      </div>
                      {customEndDate && (
                        <div className="text-xs text-orange-300 bg-orange-500/20 px-3 py-2 rounded-lg inline-block border border-orange-400/30">
                          📅 {new Date(customEndDate).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Rango seleccionado */}
                  {customStartDate && customEndDate && (
                    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-400/30 rounded-xl p-4 animate-in fade-in duration-500 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="font-bold text-green-300">Período Seleccionado:</span>
                        </div>
                        <div className="text-sm text-green-300 bg-green-500/20 px-3 py-1 rounded-lg shadow-sm border border-green-400/30">
                          {(() => {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            const diffTime = Math.abs(end - start);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            return `${diffDays} días`;
                          })()}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-green-300">
                        <span className="font-medium">Desde:</span> {new Date(customStartDate).toLocaleDateString('es-ES')} • 
                        <span className="font-medium ml-2">Hasta:</span> {new Date(customEndDate).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  )}
                  
                  {/* Botones de acción */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-105"
                    >
                      <span>🗑️</span>
                      <span>Limpiar</span>
                    </button>
                    <button
                      disabled={isBusy || !customStartDate || !customEndDate}
                      onClick={handleCustomDateSelection}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold transition-all duration-300 flex items-center gap-2 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      <span className="text-lg">🔍</span>
                      <span>Cargar Partidas</span>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </button>
                  </div>
                  
                  {/* Efectos de fondo */}
                  <div className="absolute -z-10 top-4 left-4 w-8 h-8 bg-orange-400/20 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute -z-10 bottom-4 right-4 w-6 h-6 bg-red-400/20 rounded-full opacity-20 animate-pulse delay-1000"></div>
                </div>
              )}
            </div>
            
            {/* Efectos de fondo animados */}
            <div className="absolute -z-10 top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute -z-10 bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          </div>
        </div>
      )}


      {/* Sección original compleja - comentada */}
      {false && (
        <div className="relative z-10 flex items-center justify-center min-h-[70vh]">
          <div className="w-full max-w-md mx-auto">
            {/* Card principal de login */}
            <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-orange-400/30 rounded-2xl p-8 shadow-2xl">
              {/* Efecto de brillo superior */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-t-2xl"></div>
              
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full mb-4 shadow-xl">
                  <span className="text-3xl">⚔️</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  Dota Matches
                </h1>
                <p className="text-gray-300 text-lg">
                  Análisis profesional de partidas
                </p>
              </div>
              
              {/* Descripción */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span>🎯</span>
                    ¿Qué puedes hacer?
                  </h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>• Analizar tus partidas de Dota 2</li>
                    <li>• Detectar amigos en tus juegos</li>
                    <li>• Ver estadísticas detalladas</li>
                    <li>• Identificar patrones de juego</li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span>🔒</span>
                    Privacidad garantizada
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Solo accedemos a tu información pública de Steam y partidas de Dota 2. 
                    Tus datos están seguros y no se comparten con terceros.
                  </p>
                </div>
              </div>
              
              {/* Botón de login */}
              <div className="space-y-4">
                <button
                  disabled={isBusy}
                  onClick={handleSteamAuth}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:scale-100 disabled:shadow-none"
                >
                  {/* Efecto de brillo animado */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-white to-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">S</span>
                    </div>
                    <div className="text-left">
                      <div className="text-lg">Iniciar sesión con Steam</div>
                      <div className="text-blue-200 text-sm">Acceso rápido y seguro</div>
                    </div>
                  </div>
                </button>
                
              </div>
              
              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-600/50">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">
                    Al iniciar sesión, aceptas nuestros términos de servicio
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-500">
                    <span>🔐 Seguro</span>
                    <span>⚡ Rápido</span>
                    <span>🎮 Oficial</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Efectos de fondo adicionales */}
            <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-96 h-96 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-full blur-3xl animate-pulse"></div>
            </div>
            <div className="absolute -z-10 top-1/3 right-1/4">
              <div className="w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      )}



      {/* Loading principal mejorado */}
      {loading && (
        <div className="relative z-10 flex items-center justify-center min-h-[50vh]">
          <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 backdrop-blur-lg border border-orange-400/30 rounded-2xl p-8 shadow-2xl">
            {/* Efecto de brillo superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-t-2xl"></div>
            
            <div className="text-center">
              {/* Spinner principal mejorado */}
              <div className="relative mx-auto mb-6 w-20 h-20">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-orange-200/30"></div>
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-orange-500 border-r-red-500 absolute top-0 left-0"></div>
              </div>
              
              {/* Texto de carga */}
              <h3 className="text-xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                {rateLimitWaiting ? 'Esperando Rate Limit' : 'Cargando Partidas'}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {rateLimitWaiting 
                  ? 'API temporalmente limitada. Esperando antes del siguiente intento...' 
                  : 'Obteniendo tus partidas de Dota 2 desde OpenDota...'
                }
              </p>
              
              {/* Barra de progreso animada */}
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 via-red-500 to-purple-500 rounded-full animate-pulse" style={{width: '100%'}}></div>
              </div>
              
              {/* Efectos de fondo */}
              <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-32 h-32 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-full blur-2xl animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <div className="text-red-500 text-lg mb-2">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {/* Mensaje cuando no hay partidas - Solo mostrar cuando el análisis esté completo */}
      {matchesLoaded && companionsAnalysisComplete && matches.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-500 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No se encontraron partidas</h3>
          <p className="text-yellow-700 mb-4">
            No se encontraron partidas para el período seleccionado ({timeFilter}).
          </p>
          <div className="text-sm text-yellow-600 mb-4">
            <p>• Verifica que tengas partidas ranked en ese período</p>
            <p>• Intenta con un período más amplio (mes, 2 meses, etc.)</p>
            <p>• Asegúrate de que tu perfil de Steam sea público</p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              disabled={isBusy}
              onClick={() => loadMatchesWithTimeFilter("all")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
            >
              🔍 Cargar todas las partidas
            </button>
            <button
              disabled={isBusy}
              onClick={() => {
                console.log('🔍 Debug - Steam ID actual:', steamId);
                console.log('🔍 Debug - Steam ID 64-bit:', steam64Id);
                console.log('🔍 Debug - Usuario autenticado:', authenticatedUser);
              }}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              🔧 Debug Info
            </button>
            <button
              disabled={isBusy}
              onClick={() => {
                const testSteamId = steamId || steam64Id || authenticatedSteam64Id;
                if (!testSteamId) {
                  console.log('❌ No hay Steam ID disponible para la prueba');
                  return;
                }
                const testUrl = `https://api.opendota.com/api/players/${testSteamId}/matches?lobby_type=7`;
                console.log('🧪 Probando API de OpenDota directamente...');
                console.log('🧪 URL de prueba:', testUrl);
                fetch(testUrl)
                  .then(response => response.json())
                  .then(data => {
                    console.log('🧪 Respuesta de prueba:', data);
                    if (data && data.length > 0) {
                      console.log('✅ API funciona, se encontraron partidas:', data.length);
                    } else {
                      console.log('⚠️ API funciona pero no hay partidas');
                    }
                  })
                  .catch(error => {
                    console.error('❌ Error en prueba de API:', error);
                  });
              }}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
            >
              🧪 Probar API
            </button>
          </div>
        </div>
      )}

      {/* Indicador de verificación automática */}
      {autoCheckFriends && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200"></div>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-purple-600 border-r-purple-500 absolute top-0 left-0"></div>
              </div>
              <div>
                <span className="text-purple-800 font-semibold block">Análisis automático en progreso...</span>
                <span className="text-purple-600 text-sm">Identificando compañeros de juego en tus partidas</span>
              </div>
            </div>
            <span className="text-purple-600 text-sm font-medium">
              {loadingProgress.total > 0 ? `${loadingProgress.current}/${loadingProgress.total}` : 'Iniciando...'}
            </span>
          </div>
          <div className="w-full bg-purple-100 rounded-full h-4 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out relative"
              style={{ 
                width: loadingProgress.total > 0 ? `${(loadingProgress.current / loadingProgress.total) * 100}%` : '100%' 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
          {loadingProgress.total > 0 && (
            <div className="text-center text-purple-600 text-sm mt-2">
              {Math.round((loadingProgress.current / loadingProgress.total) * 100)}% completado
            </div>
          )}
        </div>
      )}

      {/* Indicador de verificación manual automática */}
      {checkingFriends && !autoCheckFriends && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-blue-800 font-medium">Verificando amigos en partidas...</span>
            <span className="text-blue-600 text-sm">
              {loadingProgress.total > 0 ? `${loadingProgress.current}/${loadingProgress.total}` : 'Iniciando...'}
            </span>
          </div>
          {loadingProgress.total > 0 && (
            <div className="w-full">
              <div className="flex justify-between text-sm text-blue-700 mb-1">
                <span>Progreso: {loadingProgress.current} de {loadingProgress.total} partidas</span>
                <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón manual para verificar amigos (solo si no se está ejecutando automáticamente) */}
      {matches.length > 0 && !autoCheckFriends && !checkingFriends && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-3">🔍 Análisis de compañeros de juego</h3>
          <p className="text-sm text-green-700 mb-4">
            Analiza tus partidas para identificar cuando jugaste con amigos de tu lista de Steam, incluso en partidas marcadas como "solo".
          </p>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                disabled={isBusy || checkingFriends || !friends || friends.length === 0}
                onClick={checkAllMatchesForFriends}
                className="group relative overflow-hidden px-6 py-3 bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 hover:from-green-700 hover:via-emerald-700 hover:to-green-800 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-xl font-semibold flex items-center gap-3 transition-all duration-300 transform hover:scale-105 hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed"
              >
                {/* Efecto de brillo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                
                <div className="relative flex items-center gap-3">
                  {checkingFriends ? (
                    <>
                      <div className="relative">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30"></div>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-transparent border-t-white absolute top-0 left-0" style={{animationDirection: 'reverse'}}></div>
                      </div>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg group-hover:scale-110 transition-transform duration-300">🔍</span>
                      <span>Analizar compañeros de juego</span>
                      <div className="w-2 h-2 bg-white rounded-full group-hover:animate-pulse"></div>
                    </>
                  )}
                </div>
              </button>
              
              {Object.keys(friendsInMatches).length > 0 && (
                <div className="text-sm text-green-700 flex items-center bg-green-100 px-3 py-2 rounded-lg">
                  ✅ Compañeros detectados en {Object.keys(friendsInMatches).length} partidas
                </div>
              )}
            </div>
            
            {/* Barra de progreso */}
            {checkingFriends && loadingProgress.total > 0 && (
              <div className="w-full">
                <div className="flex justify-between text-sm text-green-700 mb-1">
                  <span>Progreso: {loadingProgress.current} de {loadingProgress.total} partidas</span>
                  <span>{Math.round((loadingProgress.current / loadingProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultados de verificación automática */}
      {Object.keys(friendsInMatches).length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 text-lg">✅</span>
            <span className="text-green-800 font-medium">
              Amigos encontrados en {Object.keys(friendsInMatches).length} partidas
            </span>
          </div>
          <p className="text-sm text-green-700">
            {autoCheckFriends ? 'La verificación automática ha encontrado amigos en tus partidas.' : 'La verificación manual ha encontrado amigos en tus partidas.'}
          </p>
        </div>
      )}

      {/* Pantalla de análisis de compañeros */}
      {!companionsAnalysisComplete && matches.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8 text-center shadow-lg">
          <div className="text-blue-500 text-6xl mb-6">🔍</div>
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Analizando compañeros de juego</h2>
          <p className="text-blue-700 mb-6">
            Estamos analizando tus {matches.length} partidas para identificar cuando jugaste con amigos.
            Esto asegura que las estadísticas sean precisas.
          </p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200"></div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-blue-600 border-r-purple-500 absolute top-0 left-0"></div>
            </div>
            <span className="text-blue-600 font-medium">Procesando partidas...</span>
          </div>
          <div className="text-sm text-blue-600">
            {checkingFriends ? `Verificando partidas... (${loadingProgress.current}/${loadingProgress.total})` : 'Cargando amigos...'}
          </div>
        </div>
      )}

      {/* Partidas cargadas - Solo mostrar cuando el análisis esté completo */}
      <div className="relative z-10 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
      {matches.length > 0 && companionsAnalysisComplete && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-3">
              Partidas cargadas: {matches.length} (Filtro: {timeFilter})
            </h2>
          
          {/* Mensaje de espera para estadísticas */}
          {!statsReady && matches.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-yellow-200"></div>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-transparent border-t-yellow-600 border-r-orange-500 absolute top-0 left-0"></div>
                </div>
                <div>
                <span className="text-yellow-800 font-semibold block">Procesando datos...</span>
                <span className="text-yellow-600 text-sm">Las estadísticas se mostrarán después de completar el análisis</span>
                </div>
              </div>
              <div className="w-full bg-yellow-100 rounded-full h-3 mt-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-orange-500 h-3 rounded-full animate-pulse relative" style={{ width: '100%' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Estadísticas de partidas - Solo mostrar después de verificación de amigos */}
          {statsReady && !checkingFriends && !autoCheckFriends && (matchStats.solo.wins + matchStats.solo.losses + matchStats.party.wins + matchStats.party.losses) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Estadísticas Solo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  🎯 Partidas Solo
                  <span className="text-sm font-normal text-blue-600">
                    ({matchStats.solo.wins + matchStats.solo.losses} partidas)
                  </span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">✅ Victorias:</span>
                    <span className="text-green-800 font-bold">{matchStats.solo.wins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-700 font-medium">❌ Derrotas:</span>
                    <span className="text-red-800 font-bold">{matchStats.solo.losses}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-800 font-semibold">📊 Win Rate:</span>
                      <span className="text-blue-900 font-bold text-lg">
                        {matchStats.solo.wins + matchStats.solo.losses > 0 
                          ? `${Math.round((matchStats.solo.wins / (matchStats.solo.wins + matchStats.solo.losses)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas Party */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  👥 Partidas en Grupo
                  <span className="text-sm font-normal text-purple-600">
                    ({matchStats.party.wins + matchStats.party.losses} partidas)
                  </span>
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">✅ Victorias:</span>
                    <span className="text-green-800 font-bold">{matchStats.party.wins}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-700 font-medium">❌ Derrotas:</span>
                    <span className="text-red-800 font-bold">{matchStats.party.losses}</span>
                  </div>
                  <div className="border-t border-purple-200 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-800 font-semibold">📊 Win Rate:</span>
                      <span className="text-purple-900 font-bold text-lg">
                        {matchStats.party.wins + matchStats.party.losses > 0 
                          ? `${Math.round((matchStats.party.wins / (matchStats.party.wins + matchStats.party.losses)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.match_id}
                onClick={() => openMatchPopup(match)}
                className="relative group bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-orange-400/30 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:border-orange-400 cursor-pointer overflow-hidden"
              >
                {/* Efecto de brillo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                
                {/* Partículas flotantes */}
                <div className="absolute top-2 right-2 w-1 h-1 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse delay-300"></div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-lg text-white">#{match.match_id}</span>
                    <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded-full border border-orange-400/30">Click para detalles</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
                      didWin(match) ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
                    }`}>
                      {didWin(match) ? '🏆 Victoria' : '💀 Derrota'}
                    </span>
                    {(() => {
                      const mvpData = calculateMatchMVP(match);
                      return mvpData.isMVP && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 border border-yellow-500 animate-pulse">
                          ⭐ MVP
                        </span>
                      );
                    })()}
                  </div>
                  <span className="text-sm text-gray-300">
                    {new Date(match.start_time * 1000).toLocaleDateString('es-ES')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-orange-300">K/D/A:</span>
                    <span className="ml-1 text-white">
                      {match.kills}/{match.deaths}/{match.assists}
                      {(() => {
                        const mvpData = calculateMatchMVP(match);
                        return mvpData.isMVP && (
                          <span className="ml-2 text-xs text-yellow-400 font-bold">(MVP Score: {mvpData.score})</span>
                        );
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-orange-300">Duración:</span>
                    <span className="ml-1 text-white">{Math.floor(match.duration / 60)} min</span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        getPartySize(match) > 1 ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-400/50' : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-300 border border-gray-400/50'
                      }`}>
                        {getPartySize(match) > 1 ? '👥 Party' : '👤 Solo'} ({getPartySize(match)})
                      </span>
                      {friendsInMatches[match.match_id] && friendsInMatches[match.match_id].length > 0 && (
                        <span className="px-2 py-1 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 text-xs font-semibold border border-green-400/50 shadow-sm">
                          +{friendsInMatches[match.match_id].length} amigos
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-orange-300">Héroe:</span>
                    <div className="flex items-center space-x-2">
                      {match.hero_id && (
                        <img 
                          src={getHeroImageUrl(match.hero_id)}
                          alt={`${heroes[match.hero_id] || match.hero_id}`}
                          className="w-16 h-20 object-cover rounded-lg border-2 border-orange-400/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-orange-400 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-white">
                        {heroes[match.hero_id] || `ID: ${match.hero_id}`}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Mostrar amigos encontrados en esta partida */}
                {friendsInMatches[match.match_id] && friendsInMatches[match.match_id].length > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-400/30">
                    <div className="text-sm font-medium text-green-300 mb-2">
                      👥 Compañeros detectados:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {friendsInMatches[match.match_id].map((friend, index) => (
                        <div key={index} className="bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 px-2 py-1 rounded border border-green-400/50 text-xs flex items-center space-x-1 backdrop-blur-sm">
                          {friend.hero_id && (
                            <img 
                              src={getHeroImageUrl(friend.hero_id)}
                              alt={`${heroes[friend.hero_id] || friend.hero_id}`}
                              className="w-8 h-10 object-cover rounded border-2 border-green-400/50 shadow-sm"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <span>{friend.personaname}</span>
                          {friend.hero_id && (
                            <span className="ml-1 text-green-400">
                              ({heroes[friend.hero_id] || `ID: ${friend.hero_id}`})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popup de detalles de partida */}
      {showMatchPopup && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-700/50">
            {/* Header del popup */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl border-b border-slate-700/50">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Detalles de la partida</h2>
                    <p className="text-blue-100 text-sm">ID: {selectedMatch.match_id}</p>
                  </div>
                </div>
                <button
                  disabled={isBusy}
                  onClick={closeMatchPopup}
                  className="text-white hover:text-gray-200 text-3xl font-bold hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del popup */}
            <div className="p-8">
              {/* Información principal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Información básica */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Información básica</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Fecha:</span>
                      <span className="text-white font-medium">{new Date(selectedMatch.start_time * 1000).toLocaleString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Duración:</span>
                      <span className="text-white font-medium">{Math.floor(selectedMatch.duration / 60)} minutos</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Resultado:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        didWin(selectedMatch) ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {didWin(selectedMatch) ? '🏆 Victoria' : '💀 Derrota'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Composición del equipo */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">👥</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Composición del equipo</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Party Size:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        getPartySize(selectedMatch) > 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {getPartySize(selectedMatch) > 1 ? '👥 Party' : '👤 Solo'} ({getPartySize(selectedMatch)})
                      </span>
                    </div>
                    {friendsInMatches[selectedMatch.match_id] && friendsInMatches[selectedMatch.match_id].length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">Amigos detectados:</span>
                        <span className="text-white font-medium">{friendsInMatches[selectedMatch.match_id].length}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">Tipo de partida:</span>
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {selectedMatch.lobby_type === 7 ? '🏆 Ranked' : '🎮 Normal'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas rápidas */}
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">⚡</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">Estadísticas rápidas</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">KDA:</span>
                      <span className="text-white font-medium">{selectedMatch.kda || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">GPM:</span>
                      <span className="text-white font-medium">{selectedMatch.gold_per_min || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-sm">XPM:</span>
                      <span className="text-white font-medium">{selectedMatch.xp_per_min || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Héroe jugado */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 mb-8 border border-slate-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🦸</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Héroe jugado</h3>
                </div>
                <div className="flex items-center gap-6">
                  {selectedMatch.hero_id && (
                    <div className="relative">
                      <img 
                        src={getHeroImageUrl(selectedMatch.hero_id)}
                        alt={`${heroes[selectedMatch.hero_id] || selectedMatch.hero_id}`}
                        className="w-20 h-24 object-cover rounded-2xl shadow-2xl border-2 border-slate-600/50"
                        onError={(e) => {
                          e.target.src = getHeroImageFallbackUrl(selectedMatch.hero_id);
                        }}
                      />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">★</span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-2">
                      {heroes[selectedMatch.hero_id] || `Héroe ID: ${selectedMatch.hero_id}`}
                    </h4>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-300 text-sm">ID: {selectedMatch.hero_id}</span>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-semibold border border-purple-500/30">
                        Tu héroe en esta partida
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amigos encontrados */}
              {friendsInMatches[selectedMatch.match_id] && friendsInMatches[selectedMatch.match_id].length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-green-800 mb-3">👫 Compañeros de juego detectados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {friendsInMatches[selectedMatch.match_id].map((friend, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-green-200">
                        <div className="flex items-center space-x-3">
                          {friend.hero_id && (
                            <img 
                              src={getHeroImageUrl(friend.hero_id)}
                              alt={`${heroes[friend.hero_id] || friend.hero_id}`}
                              className="w-8 h-10 object-cover rounded border border-green-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <div className="font-medium text-green-800">{friend.personaname}</div>
                            <div className="text-sm text-green-600">
                              {heroes[friend.hero_id] || `Héroe ID: ${friend.hero_id}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MVP de la partida */}
              {matchDetails && matchDetails.players && (() => {
                const mvp = calculateMVP(matchDetails.players);
                const currentPlayer = matchDetails.players.find(player => 
                  player.account_id && player.account_id.toString() === steamId
                );
                const isCurrentPlayerMVP = mvp && currentPlayer && mvp.account_id === currentPlayer.account_id;
                
                return mvp ? (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      <span className="text-2xl">🏆</span>
                      MVP de la Partida
                      {isCurrentPlayerMVP && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                          ¡ERES TÚ!
                        </span>
                      )}
                    </h3>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center space-x-4">
                        {mvp.hero_id && (
                          <img 
                            src={getHeroImageUrl(mvp.hero_id)}
                            alt={`${heroes[mvp.hero_id] || mvp.hero_id}`}
                            className="w-16 h-20 object-cover rounded-lg border-2 border-yellow-400 shadow-md"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-lg font-bold text-yellow-800">
                              {heroes[mvp.hero_id] || `Héroe ID: ${mvp.hero_id}`}
                            </h4>
                            <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs font-bold rounded-full">
                              Score: {Math.round(mvp.mvpScore)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                            <div className="text-center">
                              <div className="font-bold text-green-600">{mvp.kills || 0}</div>
                              <div className="text-gray-600">Kills</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-red-600">{mvp.deaths || 0}</div>
                              <div className="text-gray-600">Deaths</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-blue-600">{mvp.assists || 0}</div>
                              <div className="text-gray-600">Assists</div>
                            </div>
                          </div>
                          
                          {/* Desglose detallado del MVP Score */}
                          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg p-4 border border-yellow-300">
                            <div className="text-sm text-yellow-800">
                              <span className="font-bold text-base">📊 Desglose del MVP Score</span>
                              <div className="mt-3 grid grid-cols-2 gap-3">
                                {mvp.scoreBreakdown && (
                                  <>
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">⚔️ KDA Score</span>
                                        <span className="text-xs font-bold text-green-600">{mvp.scoreBreakdown.kdaScore}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${Math.min(mvp.scoreBreakdown.kdaScore, 100)}%`}}></div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">🗡️ Combat Score</span>
                                        <span className="text-xs font-bold text-red-600">{mvp.scoreBreakdown.combatScore}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-red-500 h-1.5 rounded-full" style={{width: `${Math.min(mvp.scoreBreakdown.combatScore, 100)}%`}}></div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">💰 Economic Score</span>
                                        <span className="text-xs font-bold text-yellow-600">{mvp.scoreBreakdown.economicScore}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-yellow-500 h-1.5 rounded-full" style={{width: `${Math.min(mvp.scoreBreakdown.economicScore, 100)}%`}}></div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">🛡️ Support Score</span>
                                        <span className="text-xs font-bold text-blue-600">{mvp.scoreBreakdown.supportScore}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${Math.min(mvp.scoreBreakdown.supportScore, 100)}%`}}></div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">⭐ XP Score</span>
                                        <span className="text-xs font-bold text-purple-600">{mvp.scoreBreakdown.xpScore}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                        <div className="bg-purple-500 h-1.5 rounded-full" style={{width: `${Math.min(mvp.scoreBreakdown.xpScore, 100)}%`}}></div>
                                      </div>
                                    </div>
                                    
                                    <div className="bg-white/50 rounded-lg p-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-semibold">🎯 Bonus/Penalty</span>
                                        <span className={`text-xs font-bold ${(mvp.scoreBreakdown.bonusScore + mvp.scoreBreakdown.penaltyScore) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {mvp.scoreBreakdown.bonusScore + mvp.scoreBreakdown.penaltyScore >= 0 ? '+' : ''}{mvp.scoreBreakdown.bonusScore + mvp.scoreBreakdown.penaltyScore}
                                        </span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Explicación de por qué es MVP */}
                              <div className="mt-3 pt-3 border-t border-yellow-400">
                                <span className="text-xs font-semibold">🏆 Razones principales:</span>
                                <div className="mt-1 space-y-1">
                                  {(() => {
                                    const reasons = [];
                                    const kills = mvp.kills || 0;
                                    const assists = mvp.assists || 0;
                                    const deaths = mvp.deaths || 0;
                                    const netWorth = mvp.net_worth || 0;
                                    const heroDamage = mvp.hero_damage || 0;
                                    const towerDamage = mvp.tower_damage || 0;
                                    const lastHits = mvp.last_hits || 0;
                                    const healing = mvp.hero_healing || 0;
                                    
                                    // Razones basadas en el score breakdown
                                    if (mvp.scoreBreakdown && mvp.scoreBreakdown.kdaScore >= 80) reasons.push("🔥 KDA excepcional");
                                    if (mvp.scoreBreakdown && mvp.scoreBreakdown.combatScore >= 80) reasons.push("⚔️ Dominio en combate");
                                    if (mvp.scoreBreakdown && mvp.scoreBreakdown.economicScore >= 80) reasons.push("💰 Economía superior");
                                    if (mvp.scoreBreakdown && mvp.scoreBreakdown.supportScore >= 80) reasons.push("🛡️ Apoyo excepcional");
                                    if (mvp.scoreBreakdown && mvp.scoreBreakdown.bonusScore > 0) reasons.push("⭐ Rendimiento excepcional");
                                    
                                    // Razones tradicionales
                                    if (kills >= 10) reasons.push("🎯 Alto impacto en kills");
                                    if (assists >= 15) reasons.push("🤝 Gran participación en equipo");
                                    if (deaths <= 3 && kills >= 5) reasons.push("🛡️ Juego seguro con impacto");
                                    if (netWorth >= 20000) reasons.push("💎 Economía de élite");
                                    if (heroDamage >= 25000) reasons.push("💥 Daño masivo");
                                    if (towerDamage >= 8000) reasons.push("🏰 Destructor de torres");
                                    if (healing >= 5000) reasons.push("❤️ Soporte vital");
                                    
                                    if (reasons.length === 0) {
                                      reasons.push("📊 Rendimiento equilibrado y consistente");
                                    }
                                    
                                    return reasons.slice(0, 4).map((reason, index) => (
                                      <div key={index} className="flex items-center gap-1 text-xs">
                                        <span>{reason}</span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Estadísticas detalladas de la partida */}
              {loadingMatchDetails ? (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-200"></div>
                      <div className="animate-spin rounded-full h-6 w-6 border-3 border-transparent border-t-blue-600 border-r-blue-500 absolute top-0 left-0"></div>
                    </div>
                    <div>
                      <span className="text-blue-800 font-semibold block">Cargando estadísticas...</span>
                      <span className="text-blue-600 text-sm">Obteniendo datos detallados de la partida</span>
                    </div>
                  </div>
                </div>
              ) : matchDetails && matchDetails.players ? (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-purple-800 mb-4">📊 Estadísticas detalladas de la partida</h3>
                  
                  {/* Buscar el jugador actual en los datos */}
                  {(() => {
                    const currentPlayer = matchDetails.players.find(player => 
                      player.account_id && player.account_id.toString() === steamId
                    );
                    
                    if (!currentPlayer) {
                      return (
                        <div className="text-center text-gray-600 py-4">
                          <p>No se encontraron estadísticas detalladas para esta partida.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Estadísticas principales */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-green-600">{currentPlayer.kills || 0}</div>
                            <div className="text-sm text-gray-600">Kills</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-red-600">{currentPlayer.deaths || 0}</div>
                            <div className="text-sm text-gray-600">Deaths</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-blue-600">{currentPlayer.assists || 0}</div>
                            <div className="text-sm text-gray-600">Assists</div>
                          </div>
                          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                            <div className="text-2xl font-bold text-yellow-600">{currentPlayer.kda || 0}</div>
                            <div className="text-sm text-gray-600">KDA</div>
                          </div>
                        </div>

                        {/* Estadísticas de recursos */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Gold Net Worth</span>
                              <span className="font-bold text-green-600">
                                {currentPlayer.net_worth ? Math.round(currentPlayer.net_worth / 1000) + 'k' : '0'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">GPM</span>
                              <span className="font-bold text-blue-600">{currentPlayer.gold_per_min || 0}</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">XPM</span>
                              <span className="font-bold text-purple-600">{currentPlayer.xp_per_min || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Estadísticas de combate */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Hero Damage</span>
                              <span className="font-bold text-red-600">
                                {currentPlayer.hero_damage ? Math.round(currentPlayer.hero_damage / 1000) + 'k' : '0'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Tower Damage</span>
                              <span className="font-bold text-orange-600">
                                {currentPlayer.tower_damage ? Math.round(currentPlayer.tower_damage / 1000) + 'k' : '0'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Hero Healing</span>
                              <span className="font-bold text-green-600">
                                {currentPlayer.hero_healing ? Math.round(currentPlayer.hero_healing / 1000) + 'k' : '0'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Last Hits</span>
                              <span className="font-bold text-yellow-600">{currentPlayer.last_hits || 0}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        {currentPlayer.items && (
                          <div className="bg-white rounded-lg p-3 shadow-sm">
                            <h4 className="font-semibold text-gray-800 mb-2">🎒 Items finales</h4>
                            <div className="grid grid-cols-6 gap-2">
                              {[0,1,2,3,4,5].map(slot => {
                                const itemId = currentPlayer.items[slot];
                                return (
                                  <div key={slot} className="aspect-square bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center">
                                    {itemId && itemId !== 0 ? (
                                      <img 
                                        src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${itemId}_lg.png`}
                                        alt={`Item ${itemId}`}
                                        className="w-full h-full object-cover rounded"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="text-gray-400 text-xs">Empty</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">📈 Estadísticas adicionales</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Game Mode:</span> {selectedMatch.game_mode || 'Desconocido'}</div>
                    <div><span className="font-medium">Skill Level:</span> {selectedMatch.skill || 'Desconocido'}</div>
                    <div><span className="font-medium">Diretide:</span> {selectedMatch.diretide ? 'Sí' : 'No'}</div>
                    <div><span className="font-medium">Tournament:</span> {selectedMatch.tournament ? 'Sí' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Análisis de rendimiento y throw */}
            {playerPerformanceAnalysis[selectedMatch.match_id] && (
              <div className="bg-gradient-to-br from-slate-800/40 via-slate-900/40 to-slate-800/40 rounded-xl border border-slate-600/30 shadow-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📊</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Análisis de Rendimiento</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top 3 jugadores */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white mb-4">🏆 Top 3 Jugadores</h4>
                    {Object.entries(playerPerformanceAnalysis[selectedMatch.match_id])
                      .sort(([,a], [,b]) => b.score - a.score)
                      .slice(0, 3)
                      .map(([accountId, analysis], index) => (
                        <div key={accountId} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/50' :
                          index === 1 ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/50' :
                          'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50'
                        }`}>
                          {/* Posición */}
                          <div className="absolute top-3 left-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">#{index + 1}</span>
                          </div>
                          
                          <div className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-3xl">{analysis.icon}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-lg font-semibold text-white truncate" title={analysis.playerName}>
                                    {analysis.playerName}
                                  </div>
                                  <div className="text-sm text-gray-300">
                                    {analysis.team} • KDA: {analysis.kda}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${analysis.color}`}>
                                  {analysis.score}/100
                                </div>
                                <div className={`text-sm font-medium ${analysis.color}`}>
                                  {analysis.category}
                                </div>
                              </div>
                            </div>
                            
                            {/* Barra de progreso */}
                            <div className="mt-4">
                              <div className="w-full bg-gray-700/50 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 ${
                                    analysis.score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                    analysis.score >= 65 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                                    analysis.score >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                                    analysis.score >= 35 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                                    'bg-gradient-to-r from-red-500 to-red-400'
                                  }`}
                                  style={{ width: `${analysis.score}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Análisis de Throw */}
                  {throwAnalysis[selectedMatch.match_id] && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white mb-4">🎯 Análisis de Throw</h4>
                      
                      {/* Jugadores que throwearon */}
                      {(() => {
                        const throws = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => t.isThrow);
                        
                        return throws.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                                <span className="text-red-400 text-sm">🚨</span>
                              </div>
                              <div className="text-base font-semibold text-red-300">
                                Jugadores que throwearon
                              </div>
                            </div>
                            
                            {throws.map((throwData, index) => (
                              <div key={index} className="relative overflow-hidden bg-gradient-to-r from-red-800/60 to-orange-800/60 rounded-xl border-2 border-red-500/50 shadow-lg">
                                {/* Badge de throw */}
                                <div className="absolute top-3 right-3 px-3 py-1 bg-red-600/80 rounded-full">
                                  <span className="text-sm font-bold text-white">{throwData.throwPercentage}%</span>
                                </div>
                                
                                <div className="p-5">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="text-3xl">{throwData.icon}</div>
                                      <div>
                                        <div className="text-lg font-bold text-white">
                                          {throwData.playerName}
                                        </div>
                                        <div className="text-sm text-red-200">
                                          {throwData.description}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-lg font-bold ${throwData.color}`}>
                                        {throwData.category}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Progresión temporal con Net Worth */}
                                  <div className="bg-black/20 rounded-lg p-4 space-y-4">
                                    {/* Progresión de Score */}
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="text-center">
                                        <div className="text-green-400 font-bold">Early Game</div>
                                        <div className="text-white text-lg">{throwData.earlyScore}pts</div>
                                        <div className="text-gray-300 text-xs">KDA: {throwData.earlyKDA}</div>
                                      </div>
                                      <div className="flex-1 mx-4">
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                          <div className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"></div>
                                        </div>
                                        <div className="text-center text-xs text-gray-400 mt-1">Progresión de Score</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-red-400 font-bold">Late Game</div>
                                        <div className="text-white text-lg">{throwData.lateScore}pts</div>
                                        <div className="text-gray-300 text-xs">KDA: {throwData.lateKDA}</div>
                                      </div>
                                    </div>
                                    
                                    {/* Progresión de Net Worth */}
                                    <div className="border-t border-gray-600 pt-4">
                                      <div className="text-sm text-gray-400 mb-3 text-center">💰 Progresión de Net Worth</div>
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="text-center">
                                          <div className="text-green-400 font-bold">Early</div>
                                          <div className="text-white text-lg">{throwData.earlyNetWorth.toLocaleString()}</div>
                                          <div className="text-gray-300 text-xs">GPM: {throwData.earlyGPM}</div>
                                        </div>
                                        <div className="flex-1 mx-3">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-yellow-400 font-bold">Mid</div>
                                          <div className="text-white text-lg">{throwData.midNetWorth.toLocaleString()}</div>
                                          <div className="text-gray-300 text-xs">GPM: {throwData.midGPM}</div>
                                        </div>
                                        <div className="flex-1 mx-3">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-yellow-500 to-red-500 h-2 rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-red-400 font-bold">Late</div>
                                          <div className="text-white text-lg">{throwData.lateNetWorth.toLocaleString()}</div>
                                          <div className="text-gray-300 text-xs">GPM: {throwData.lateGPM}</div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Progresión de XPM */}
                                    <div className="border-t border-gray-600 pt-4">
                                      <div className="text-sm text-gray-400 mb-3 text-center">⚡ Progresión de XPM</div>
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="text-center">
                                          <div className="text-blue-400 font-bold">Early</div>
                                          <div className="text-white text-lg">{throwData.earlyXPM}</div>
                                        </div>
                                        <div className="flex-1 mx-3">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2 rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-purple-400 font-bold">Mid</div>
                                          <div className="text-white text-lg">{throwData.midXPM}</div>
                                        </div>
                                        <div className="flex-1 mx-3">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"></div>
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-pink-400 font-bold">Late</div>
                                          <div className="text-white text-lg">{throwData.lateXPM}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      
                      {/* Jugadores consistentes y clutch */}
                      {(() => {
                        const consistent = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => !t.isThrow && t.category === 'CONSISTENTE');
                        const clutch = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => t.category === 'CLUTCH');
                        
                        return (consistent.length > 0 || clutch.length > 0) && (
                          <div className="mt-4 space-y-3">
                            {consistent.length > 0 && (
                              <div className="bg-gradient-to-r from-green-800/40 to-emerald-800/40 rounded-lg p-4 border border-green-500/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-green-400 text-sm">👍</span>
                                  </div>
                                  <div className="text-base font-semibold text-green-300">
                                    Jugadores Consistentes
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {consistent.map((player, index) => (
                                    <div key={index} className="px-3 py-1 bg-green-600/20 rounded-full border border-green-500/30">
                                      <span className="text-sm text-green-200">{player.playerName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {clutch.length > 0 && (
                              <div className="bg-gradient-to-r from-blue-800/40 to-cyan-800/40 rounded-lg p-4 border border-blue-500/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-blue-400 text-sm">🔥</span>
                                  </div>
                                  <div className="text-base font-semibold text-blue-300">
                                    Jugadores Clutch
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {clutch.map((player, index) => (
                                    <div key={index} className="px-3 py-1 bg-blue-600/20 rounded-full border border-blue-500/30">
                                      <span className="text-sm text-blue-200">{player.playerName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer del popup */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-6 rounded-b-2xl border-t border-slate-700/50">
              <div className="flex justify-between items-center">
                <div className="text-slate-400 text-sm">
                  Análisis completo de la partida
                </div>
                <div className="flex gap-3">
                  <button
                    disabled={isBusy}
                    onClick={() => window.open(`https://www.opendota.com/matches/${selectedMatch.match_id}`, '_blank')}
                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 text-sm font-medium"
                  >
                    🌐 Ver en OpenDota
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={closeMatchPopup}
                    className="px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg transition-all duration-200 font-medium shadow-lg"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup del perfil de Steam */}
      {showSteamProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header del popup */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full border-4 border-orange-400 shadow-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Dota 2 Matches</h2>
                    <p className="text-orange-300">Análisis de partidas</p>
                  </div>
                </div>
                <button
                  disabled={isBusy}
                  onClick={closeSteamProfile}
                  className="text-white hover:text-gray-200 text-3xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Contenido del perfil */}
            <div className="p-6">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span>👤</span>
                    Información del Usuario
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-blue-700">Aplicación:</span> Dota 2 Matches Analyzer</div>
                    <div><span className="font-medium text-blue-700">Steam ID 32-bit:</span> {steamId}</div>
                    <div><span className="font-medium text-blue-700">Steam ID 64-bit:</span> {steam64Id}</div>
                    <div><span className="font-medium text-blue-700">Estado:</span> 
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        🟢 Conectado
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <span>🎮</span>
                    Estadísticas de Dota 2
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-green-700">Partidas cargadas:</span> {matches.length}</div>
                    <div><span className="font-medium text-green-700">Amigos detectados:</span> {Object.keys(friendsInMatches).length} partidas</div>
                    <div><span className="font-medium text-green-700">Filtro actual:</span> {timeFilter}</div>
                    <div><span className="font-medium text-green-700">Estado:</span> 
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        📊 Analizando
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enlaces de Steam */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <span>🔗</span>
                  Enlaces de Steam
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    disabled={isBusy}
                    onClick={() => window.open(`https://steamcommunity.com/profiles/${steam64Id}`, '_blank')}
                    className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  >
                    <span>👤</span>
                    <span>Perfil Público</span>
                  </button>
                  
                  <button
                    disabled={isBusy}
                    onClick={() => window.open(`https://steamcommunity.com/profiles/${steam64Id}/games/?tab=all`, '_blank')}
                    className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  >
                    <span>🎮</span>
                    <span>Juegos</span>
                  </button>
                  
                  <button
                    disabled={isBusy}
                    onClick={() => window.open(`https://steamcommunity.com/profiles/${steam64Id}/friends/`, '_blank')}
                    className="p-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  >
                    <span>👥</span>
                    <span>Lista de Amigos</span>
                  </button>
                  
                  <button
                    disabled={isBusy}
                    onClick={() => window.open(`https://www.opendota.com/players/${steamId}`, '_blank')}
                    className="p-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>OpenDota Stats</span>
                  </button>
                </div>
              </div>

              {/* Avatar grande */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 text-center">
                <h3 className="font-semibold text-gray-800 mb-4">Avatar de Steam</h3>
                <div className="w-32 h-32 rounded-full border-4 border-orange-400 shadow-2xl mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">🎮</span>
                </div>
                <p className="text-gray-600 text-sm mt-3">Avatar actual de tu perfil de Steam</p>
              </div>
            </div>

            {/* Footer del popup */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-lg border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Perfil sincronizado con Steam
                </span>
                <button
                  disabled={isBusy}
                  onClick={closeSteamProfile}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Popup de información del usuario */}
      {showUserPopup && authenticatedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-orange-400/30 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header del popup */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img 
                    src={authenticatedUser.avatar} 
                    alt={`Avatar de ${authenticatedUser.name}`}
                    className="w-16 h-16 rounded-full border-3 border-white shadow-xl"
                    onError={(e) => {
                      e.target.src = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2196F3" rx="32"/><text x="32" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">Steam</text></svg>`)}`;
                    }}
                  />
                  <div>
                    <h2 className="text-white font-bold text-xl">{authenticatedUser.name}</h2>
                    <p className="text-orange-100 text-sm">Perfil de Steam</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserPopup(false)}
                  className="text-white hover:text-orange-200 transition-colors duration-200 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del popup */}
            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <span>📊</span>
                  Información del Perfil
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Steam ID</span>
                      <span className="text-white font-mono text-sm">{authenticatedUser.steamID}</span>
                    </div>
                  </div>
                  
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Estado</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          authenticatedUser.personState === 1 ? 'bg-green-500' : 
                          authenticatedUser.personState === 2 ? 'bg-yellow-500' :
                          authenticatedUser.personState === 3 ? 'bg-orange-500' : 'bg-gray-500'
                        }`}></div>
                        <span className="text-white text-sm">
                          {authenticatedUser.personState === 1 ? '🟢 Online' : 
                           authenticatedUser.personState === 2 ? '🟡 Busy' :
                           authenticatedUser.personState === 3 ? '🟠 Away' : '🔴 Offline'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Visibilidad</span>
                      <span className="text-white text-sm">
                        {authenticatedUser.communityVisibility === 3 ? '🔒 Privado' : 
                         authenticatedUser.communityVisibility === 2 ? '🔓 Amigos' : 
                         authenticatedUser.communityVisibility === 1 ? '🌐 Público' : '❓ Desconocido'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Amigos cargados</span>
                      <span className="text-white text-sm">{friends.length} amigos</span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Partidas cargadas</span>
                      <span className="text-white text-sm">{matches.length} partidas</span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Última actividad</span>
                      <span className="text-white text-sm">
                        {authenticatedUser.lastLogoff ? 
                          new Date(authenticatedUser.lastLogoff * 1000).toLocaleDateString() : 
                          'No disponible'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Miembro desde</span>
                      <span className="text-white text-sm">
                        {authenticatedUser.timeCreated ? 
                          new Date(authenticatedUser.timeCreated * 1000).toLocaleDateString() : 
                          'No disponible'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">País</span>
                      <span className="text-white text-sm">
                        {authenticatedUser.locCountryCode ? 
                          `🌍 ${authenticatedUser.locCountryCode}` : 
                          'No disponible'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de la sesión */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <span>🔐</span>
                  Información de la Sesión
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Sesión iniciada</span>
                      <span className="text-white text-sm">
                        {new Date(authenticatedUser.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Tiempo de sesión</span>
                      <span className="text-white text-sm">
                        {Math.floor((Date.now() - new Date(authenticatedUser.createdAt).getTime()) / (1000 * 60))} minutos
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Estado de autenticación</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm">Activo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de la aplicación */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <span>📱</span>
                  Estado de la Aplicación
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Análisis de amigos</span>
                      <span className="text-white text-sm">
                        {companionsAnalysisComplete ? '✅ Completado' : '⏳ En progreso'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Filtro de tiempo</span>
                      <span className="text-white text-sm">
                        {timeFilter === 'all' ? 'Todas las partidas' :
                         timeFilter === 'week' ? 'Última semana' :
                         timeFilter === 'month' ? 'Último mes' :
                         timeFilter === '3months' ? 'Últimos 3 meses' :
                         timeFilter === '6months' ? 'Últimos 6 meses' :
                         timeFilter === 'year' ? 'Último año' : 'Personalizado'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Partidas con amigos</span>
                      <span className="text-white text-sm">
                        {Object.keys(friendsInMatches).length} partidas
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Héroes cargados</span>
                      <span className="text-white text-sm">
                        {Object.keys(heroes).length} héroes
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estadísticas de partidas */}
              {statsReady && (
                <div className="space-y-4">
                  <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <span>🎮</span>
                    Estadísticas de Partidas
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-lg p-4 border border-green-500/30">
                      <div className="text-center">
                        <div className="text-green-400 text-2xl font-bold">{matchStats.solo.wins}</div>
                        <div className="text-green-300 text-sm">Solo Wins</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 rounded-lg p-4 border border-red-500/30">
                      <div className="text-center">
                        <div className="text-red-400 text-2xl font-bold">{matchStats.solo.losses}</div>
                        <div className="text-red-300 text-sm">Solo Losses</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg p-4 border border-blue-500/30">
                      <div className="text-center">
                        <div className="text-blue-400 text-2xl font-bold">{matchStats.party.wins}</div>
                        <div className="text-blue-300 text-sm">Party Wins</div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-lg p-4 border border-purple-500/30">
                      <div className="text-center">
                        <div className="text-purple-400 text-2xl font-bold">{matchStats.party.losses}</div>
                        <div className="text-purple-300 text-sm">Party Losses</div>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas adicionales */}
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-lg p-4 border border-yellow-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-300 text-sm">Win Rate Total</span>
                        <span className="text-yellow-400 text-lg font-bold">
                          {matchStats.solo.wins + matchStats.party.wins + matchStats.solo.losses + matchStats.party.losses > 0 ? 
                            Math.round(((matchStats.solo.wins + matchStats.party.wins) / (matchStats.solo.wins + matchStats.party.wins + matchStats.solo.losses + matchStats.party.losses)) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-700/20 rounded-lg p-4 border border-cyan-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-300 text-sm">Partidas con Amigos</span>
                        <span className="text-cyan-400 text-lg font-bold">
                          {Math.round((Object.keys(friendsInMatches).length / matches.length) * 100) || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Información técnica */}
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <span>⚙️</span>
                  Información Técnica
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Versión de la app</span>
                      <span className="text-white text-sm">v1.0.0</span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Última actualización</span>
                      <span className="text-white text-sm">
                        {new Date().toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">API de Steam</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Conectado</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">API de OpenDota</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-green-400 text-sm">Conectado</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Análisis de rendimiento y throw */}
              {playerPerformanceAnalysis[selectedMatch.match_id] && (
                <div className="bg-gradient-to-br from-slate-800/40 via-slate-900/40 to-slate-800/40 rounded-xl border border-slate-600/30 shadow-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">📊</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Análisis de Rendimiento</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 3 jugadores */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white mb-4">🏆 Top 3 Jugadores</h4>
                      {Object.entries(playerPerformanceAnalysis[selectedMatch.match_id])
                        .sort(([,a], [,b]) => b.score - a.score)
                        .slice(0, 3)
                        .map(([accountId, analysis], index) => (
                          <div key={accountId} className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-yellow-500/50' :
                            index === 1 ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-500/50' :
                            'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50'
                          }`}>
                            {/* Posición */}
                            <div className="absolute top-3 left-3 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-white">#{index + 1}</span>
                            </div>
                            
                            <div className="p-5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="text-3xl">{analysis.icon}</div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-lg font-semibold text-white truncate" title={analysis.playerName}>
                                      {analysis.playerName}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                      {analysis.team} • KDA: {analysis.kda}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${analysis.color}`}>
                                    {analysis.score}/100
                                  </div>
                                  <div className={`text-sm font-medium ${analysis.color}`}>
                                    {analysis.category}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Barra de progreso */}
                              <div className="mt-4">
                                <div className="w-full bg-gray-700/50 rounded-full h-3">
                                  <div 
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                      analysis.score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                                      analysis.score >= 65 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                                      analysis.score >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                                      analysis.score >= 35 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                                      'bg-gradient-to-r from-red-500 to-red-400'
                                    }`}
                                    style={{ width: `${analysis.score}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Análisis de Throw */}
                    {throwAnalysis[selectedMatch.match_id] && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white mb-4">🎯 Análisis de Throw</h4>
                        
                        {/* Jugadores que throwearon */}
                        {(() => {
                          const throws = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => t.isThrow);
                          
                          return throws.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                                  <span className="text-red-400 text-sm">🚨</span>
                                </div>
                                <div className="text-base font-semibold text-red-300">
                                  Jugadores que throwearon
                                </div>
                              </div>
                              
                              {throws.map((throwData, index) => (
                                <div key={index} className="relative overflow-hidden bg-gradient-to-r from-red-800/60 to-orange-800/60 rounded-xl border-2 border-red-500/50 shadow-lg">
                                  {/* Badge de throw */}
                                  <div className="absolute top-3 right-3 px-3 py-1 bg-red-600/80 rounded-full">
                                    <span className="text-sm font-bold text-white">{throwData.throwPercentage}%</span>
                                  </div>
                                  
                                  <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="text-3xl">{throwData.icon}</div>
                                        <div>
                                          <div className="text-lg font-bold text-white">
                                            {throwData.playerName}
                                          </div>
                                          <div className="text-sm text-red-200">
                                            {throwData.description}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className={`text-lg font-bold ${throwData.color}`}>
                                          {throwData.category}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Progresión temporal con Net Worth */}
                                    <div className="bg-black/20 rounded-lg p-4 space-y-4">
                                      {/* Progresión de Score */}
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="text-center">
                                          <div className="text-green-400 font-bold">Early Game</div>
                                          <div className="text-white text-lg">{throwData.earlyScore}pts</div>
                                          <div className="text-gray-300 text-xs">KDA: {throwData.earlyKDA}</div>
                                        </div>
                                        <div className="flex-1 mx-4">
                                          <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full"></div>
                                          </div>
                                          <div className="text-center text-xs text-gray-400 mt-1">Progresión de Score</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-red-400 font-bold">Late Game</div>
                                          <div className="text-white text-lg">{throwData.lateScore}pts</div>
                                          <div className="text-gray-300 text-xs">KDA: {throwData.lateKDA}</div>
                                        </div>
                                      </div>
                                      
                                      {/* Progresión de Net Worth */}
                                      <div className="border-t border-gray-600 pt-4">
                                        <div className="text-sm text-gray-400 mb-3 text-center">💰 Progresión de Net Worth</div>
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="text-center">
                                            <div className="text-green-400 font-bold">Early</div>
                                            <div className="text-white text-lg">{throwData.earlyNetWorth.toLocaleString()}</div>
                                            <div className="text-gray-300 text-xs">GPM: {throwData.earlyGPM}</div>
                                          </div>
                                          <div className="flex-1 mx-3">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                              <div className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full"></div>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-yellow-400 font-bold">Mid</div>
                                            <div className="text-white text-lg">{throwData.midNetWorth.toLocaleString()}</div>
                                            <div className="text-gray-300 text-xs">GPM: {throwData.midGPM}</div>
                                          </div>
                                          <div className="flex-1 mx-3">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                              <div className="bg-gradient-to-r from-yellow-500 to-red-500 h-2 rounded-full"></div>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-red-400 font-bold">Late</div>
                                            <div className="text-white text-lg">{throwData.lateNetWorth.toLocaleString()}</div>
                                            <div className="text-gray-300 text-xs">GPM: {throwData.lateGPM}</div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Progresión de XPM */}
                                      <div className="border-t border-gray-600 pt-4">
                                        <div className="text-sm text-gray-400 mb-3 text-center">⚡ Progresión de XPM</div>
                                        <div className="flex items-center justify-between text-sm">
                                          <div className="text-center">
                                            <div className="text-blue-400 font-bold">Early</div>
                                            <div className="text-white text-lg">{throwData.earlyXPM}</div>
                                          </div>
                                          <div className="flex-1 mx-3">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                              <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2 rounded-full"></div>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-purple-400 font-bold">Mid</div>
                                            <div className="text-white text-lg">{throwData.midXPM}</div>
                                          </div>
                                          <div className="flex-1 mx-3">
                                            <div className="w-full bg-gray-700 rounded-full h-2">
                                              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"></div>
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-pink-400 font-bold">Late</div>
                                            <div className="text-white text-lg">{throwData.lateXPM}</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        
                        {/* Jugadores consistentes y clutch */}
                        {(() => {
                          const consistent = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => !t.isThrow && t.category === 'CONSISTENTE');
                          const clutch = Object.values(throwAnalysis[selectedMatch.match_id]).filter(t => t.category === 'CLUTCH');
                          
                          return (consistent.length > 0 || clutch.length > 0) && (
                            <div className="mt-4 space-y-3">
                              {consistent.length > 0 && (
                                <div className="bg-gradient-to-r from-green-800/40 to-emerald-800/40 rounded-lg p-4 border border-green-500/30">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                      <span className="text-green-400 text-sm">👍</span>
                                    </div>
                                    <div className="text-base font-semibold text-green-300">
                                      Jugadores Consistentes
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {consistent.map((player, index) => (
                                      <div key={index} className="px-3 py-1 bg-green-600/20 rounded-full border border-green-500/30">
                                        <span className="text-sm text-green-200">{player.playerName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {clutch.length > 0 && (
                                <div className="bg-gradient-to-r from-blue-800/40 to-cyan-800/40 rounded-lg p-4 border border-blue-500/30">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                                      <span className="text-blue-400 text-sm">🔥</span>
                                    </div>
                                    <div className="text-base font-semibold text-blue-300">
                                      Jugadores Clutch
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {clutch.map((player, index) => (
                                      <div key={index} className="px-3 py-1 bg-blue-600/20 rounded-full border border-blue-500/30">
                                        <span className="text-sm text-blue-200">{player.playerName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.open(`https://steamcommunity.com/profiles/${authenticatedUser.steamID}`, '_blank')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>🌐</span>
                  <span>Abrir perfil en Steam</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowUserPopup(false);
                    logoutUser();
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>🚪</span>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de error grande */}
      {showErrorPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-red-900 via-red-800 to-red-900 rounded-3xl shadow-2xl border border-red-500/30 max-w-lg w-full">
            {/* Header del popup de error */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-xl">Error de Conexión</h2>
                    <p className="text-red-100 text-sm">No se pudieron cargar los datos</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowErrorPopup(false)}
                  className="text-white hover:text-red-200 transition-colors duration-200 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del popup de error */}
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="text-red-200 text-lg mb-4">
                  {errorMessage}
                </div>
                
                <div className="bg-red-800/50 rounded-lg p-4 border border-red-600/50 mb-6">
                  <h3 className="text-red-100 font-semibold mb-2">Posibles soluciones:</h3>
                  <ul className="text-red-200 text-sm space-y-1 text-left">
                    <li>• Verifica tu conexión a internet</li>
                    <li>• Asegúrate de que tu perfil de Steam sea público</li>
                    <li>• Intenta recargar la página</li>
                    <li>• Espera unos minutos y vuelve a intentar</li>
                  </ul>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowErrorPopup(false);
                    window.location.reload();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 text-lg"
                >
                  <span>🔄</span>
                  <span>Recargar Página</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowErrorPopup(false);
                    // Intentar cargar amigos nuevamente
                    if (authenticatedUser?.steamID) {
                      fetchSteamFriends(authenticatedUser.steamID).catch(() => {
                        setErrorMessage('Error persistente cargando amigos. Intenta recargar la página.');
                        setShowErrorPopup(true);
                      });
                    }
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>🔄</span>
                  <span>Intentar Nuevamente</span>
                </button>
                
                <button
                  onClick={() => setShowErrorPopup(false)}
                  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>❌</span>
                  <span>Continuar Sin Amigos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

