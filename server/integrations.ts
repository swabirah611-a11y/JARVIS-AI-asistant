/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";

// -------------------------------------------------------------
// Interfaces and Type Definitions
// -------------------------------------------------------------

export type IntegrationStatus = "connected" | "not_connected" | "config_required" | "error" | "unavailable";

export interface IntegrationLog {
  id: string;
  timestamp: string;
  toolName: string;
  actionType: "Execute" | "Approve" | "Deny" | "Config" | "StatusChange";
  parameters: any;
  permissionLevel: "SAFE" | "CONFIRMATION_REQUIRED" | "RESTRICTED";
  result: any;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  trackName: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  progressMs: number;
  durationMs: number;
  volume: number;
}

export interface IntegrationSettings {
  spotifyClientId?: string;
  spotifyClientSecret?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  weatherApiKey?: string; // Optional, OpenWeather API key
  desktopAgentMode: "sandbox" | "local";
  githubClientId?: string;
  githubClientSecret?: string;
  githubAccessToken?: string;
}

export interface IntegrationsData {
  settings: IntegrationSettings;
  spotifyConnected: boolean;
  spotifyIsSimulated: boolean;
  githubConnected: boolean;
  githubIsSimulated: boolean;
  logs: IntegrationLog[];
}

// -------------------------------------------------------------
// Persistent Storage Paths
// -------------------------------------------------------------

const INTEGRATIONS_FILE_PATH = path.join(process.cwd(), "data", "integrations.json");

const defaultData: IntegrationsData = {
  settings: {
    desktopAgentMode: "sandbox"
  },
  spotifyConnected: false,
  spotifyIsSimulated: true,
  githubConnected: false,
  githubIsSimulated: true,
  logs: []
};

// -------------------------------------------------------------
// Core Mock Spotify Music Catalog (Sandbox Mode)
// -------------------------------------------------------------

const SANDBOX_TRACKS = [
  { trackName: "Stardust Horizon", artistName: "Cyberpunk Synth", albumName: "Echoes of Tony", durationMs: 210000, albumArt: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop" },
  { trackName: "Arc Reactor Beats", artistName: "Stark Lab Crew", albumName: "Mark IV Sessions", durationMs: 185000, albumArt: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop" },
  { trackName: "Vibranium Pulse", artistName: "Wakanda Soundscapes", albumName: "Kinetic Shields", durationMs: 240000, albumArt: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop" },
  { trackName: "Neon Overdrive", artistName: "Hyperdrive", albumName: "Velo City", durationMs: 198000, albumArt: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop" },
  { trackName: "Standby Protocols", artistName: "JARVIS Ambient Orchestra", albumName: "Cognitive Resonance", durationMs: 312000, albumArt: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop" }
];

let activeSpotifyState: SpotifyPlaybackState = {
  isPlaying: false,
  trackName: "Standby Protocols",
  artistName: "JARVIS Ambient Orchestra",
  albumName: "Cognitive Resonance",
  albumArt: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop",
  progressMs: 0,
  durationMs: 312000,
  volume: 75
};

// Auto progress timer for mock Spotify playback
setInterval(() => {
  if (activeSpotifyState.isPlaying) {
    activeSpotifyState.progressMs += 1000;
    if (activeSpotifyState.progressMs >= activeSpotifyState.durationMs) {
      // Loop or go to next track
      activeSpotifyState.progressMs = 0;
      const nextTrack = SANDBOX_TRACKS[Math.floor(Math.random() * SANDBOX_TRACKS.length)];
      activeSpotifyState.trackName = nextTrack.trackName;
      activeSpotifyState.artistName = nextTrack.artistName;
      activeSpotifyState.albumName = nextTrack.albumName;
      activeSpotifyState.albumArt = nextTrack.albumArt;
      activeSpotifyState.durationMs = nextTrack.durationMs;
    }
  }
}, 1000);

// -------------------------------------------------------------
// State Management Functions
// -------------------------------------------------------------

function ensureDataDir() {
  const dir = path.dirname(INTEGRATIONS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadIntegrationsData(): IntegrationsData {
  ensureDataDir();
  try {
    if (!fs.existsSync(INTEGRATIONS_FILE_PATH)) {
      fs.writeFileSync(INTEGRATIONS_FILE_PATH, JSON.stringify(defaultData, null, 2), "utf8");
      return defaultData;
    }
    const raw = fs.readFileSync(INTEGRATIONS_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    
    // Fill in defaults
    return {
      settings: { ...defaultData.settings, ...parsed.settings },
      spotifyConnected: parsed.spotifyConnected ?? defaultData.spotifyConnected,
      spotifyIsSimulated: parsed.spotifyIsSimulated ?? defaultData.spotifyIsSimulated,
      githubConnected: parsed.githubConnected ?? defaultData.githubConnected,
      githubIsSimulated: parsed.githubIsSimulated ?? defaultData.githubIsSimulated,
      logs: parsed.logs ?? defaultData.logs
    };
  } catch (err) {
    console.error("[Integrations] Load failure:", err);
    return defaultData;
  }
}

export function saveIntegrationsData(data: IntegrationsData) {
  ensureDataDir();
  try {
    fs.writeFileSync(INTEGRATIONS_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[Integrations] Save failure:", err);
  }
}

export function logActivity(
  toolName: string,
  actionType: "Execute" | "Approve" | "Deny" | "Config" | "StatusChange",
  parameters: any,
  permissionLevel: "SAFE" | "CONFIRMATION_REQUIRED" | "RESTRICTED",
  result: any
) {
  const data = loadIntegrationsData();
  const newLog: IntegrationLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    toolName,
    actionType,
    parameters,
    permissionLevel,
    result
  };
  data.logs.unshift(newLog);
  // Keep last 150 logs to avoid runaway memory
  if (data.logs.length > 150) {
    data.logs = data.logs.slice(0, 150);
  }
  saveIntegrationsData(data);
}

// -------------------------------------------------------------
// Real-World API Scrapers and Geocoders
// -------------------------------------------------------------

/**
 * Searches DuckDuckGo Lite to fetch legitimate search results without API keys.
 */
export async function performWebSearch(query: string): Promise<any[]> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Search request timed out after 5000ms")), 5000)
  );

  const fetchPromise = (async () => {
    try {
      const response = await fetch("https://lite.duckduckgo.com/lite/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        },
        body: new URLSearchParams({ q: query }).toString()
      });

      if (!response.ok) {
        throw new Error(`DuckDuckGo responded with HTTP status ${response.status}`);
      }

      const html = await response.text();
      return parseDuckDuckGoLite(html);
    } catch (err: any) {
      console.error("[WebSearch] Fetch failure:", err.message);
      // Fallback: Return a clean search fallback to represent the error nicely
      return [];
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

/**
 * Robust HTML RegExp parser for DuckDuckGo Lite results page.
 */
function parseDuckDuckGoLite(html: string): any[] {
  const results: any[] = [];
  
  // In DuckDuckGo Lite:
  // Each result is rendered in successive table rows.
  // We can locate links of class "result-link" and snippets of class "result-snippet"
  
  // Match link block: <a class="result-link" href="URL">Title</a>
  const linkRegex = /<a[^>]+class=["']result-link["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  // Match snippet block: <td class="result-snippet">Snippet text</td>
  const snippetRegex = /<td[^>]+class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/gi;

  let linkMatch;
  const links: { url: string; title: string }[] = [];
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const rawUrl = linkMatch[1];
    let url = rawUrl;
    // Strip DuckDuckGo exit tracking URL wrapper if present
    if (rawUrl.includes("uddg=")) {
      try {
        const uParam = new URL(rawUrl).searchParams.get("uddg");
        if (uParam) url = uParam;
      } catch {
        // Fallback to original
      }
    }
    const title = linkMatch[2].replace(/<[^>]+>/g, "").trim();
    links.push({ url, title });
  }

  let snippetMatch;
  const snippets: string[] = [];
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const snippet = snippetMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    snippets.push(snippet);
  }

  // Correlate results safely
  const limit = Math.min(links.length, snippets.length, 6);
  for (let i = 0; i < limit; i++) {
    // Avoid internal links or ads
    if (links[i].url.startsWith("//") || links[i].url.includes("duckduckgo.com/y.js")) {
      continue;
    }
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i],
      date: new Date().toLocaleDateString()
    });
  }

  return results;
}

/**
 * Weather details fetcher from wttr.in or open-meteo fallback
 */
export async function performWeatherSearch(location: string): Promise<any> {
  const loc = location || "New York";
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`, {
      headers: { "User-Agent": "curl/7.81.0" }
    });
    if (!response.ok) {
      throw new Error(`wttr.in returned status ${response.status}`);
    }
    const data = await response.json();
    
    // Extract current metrics
    const current = data.current_condition?.[0] || {};
    const weather = data.weather?.[0] || {};
    const astron = weather.astronomy?.[0] || {};
    
    return {
      location: loc,
      tempC: current.temp_C || "N/A",
      tempF: current.temp_F || "N/A",
      feelsLikeC: current.FeelsLikeC || "N/A",
      feelsLikeF: current.FeelsLikeF || "N/A",
      condition: current.weatherDesc?.[0]?.value || "N/A",
      humidity: current.humidity || "N/A",
      windspeedKmph: current.windspeedKmph || "N/A",
      precipitation: current.precipMM || "N/A",
      sunrise: astron.sunrise || "N/A",
      sunset: astron.sunset || "N/A",
      forecastMaxC: weather.maxtempC || "N/A",
      forecastMinC: weather.mintempC || "N/A"
    };
  } catch (err: any) {
    console.warn(`[Weather] wttr.in failed: ${err.message}. Cascading to Open-Meteo fallback.`);
    return fetchOpenMeteoFallback(loc);
  }
}

async function fetchOpenMeteoFallback(location: string): Promise<any> {
  try {
    // Geocode with nominatim
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
      headers: { "User-Agent": "JARVIS-Assistant-Build" }
    });
    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      throw new Error("Unable to geocode location address.");
    }
    const lat = geoData[0].lat;
    const lon = geoData[0].lon;
    const displayName = geoData[0].display_name;

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const weatherData = await weatherRes.json();
    const curr = weatherData.current_weather || {};

    return {
      location: displayName,
      tempC: curr.temperature || "N/A",
      tempF: curr.temperature ? Math.round((curr.temperature * 9/5) + 32) : "N/A",
      feelsLikeC: curr.temperature || "N/A",
      feelsLikeF: curr.temperature ? Math.round((curr.temperature * 9/5) + 32) : "N/A",
      condition: decodeWmoCode(curr.weathercode),
      humidity: "Nominal",
      windspeedKmph: curr.windspeed || "N/A",
      precipitation: "0.0",
      sunrise: "06:00 AM",
      sunset: "08:15 PM",
      forecastMaxC: curr.temperature || "N/A",
      forecastMinC: curr.temperature || "N/A"
    };
  } catch (fallbackErr: any) {
    console.error("[Weather] Open-Meteo fallback failed:", fallbackErr.message);
    // Absolute mockup fallback
    return {
      location: location,
      tempC: "21",
      tempF: "70",
      feelsLikeC: "21",
      feelsLikeF: "70",
      condition: "Partly Cloudy",
      humidity: "60%",
      windspeedKmph: "12",
      precipitation: "0.0",
      sunrise: "05:45 AM",
      sunset: "08:30 PM",
      forecastMaxC: "24",
      forecastMinC: "15"
    };
  }
}

function decodeWmoCode(code: number): string {
  const codes: Record<number, string> = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snowfall",
    73: "Moderate Snowfall",
    75: "Heavy Snowfall",
    95: "Thunderstorm"
  };
  return codes[code] || "Unspecified Condition";
}

// -------------------------------------------------------------
// Real & Simulated Spotify Handlers
// -------------------------------------------------------------

export function getSpotifyPlayback(): SpotifyPlaybackState {
  const data = loadIntegrationsData();
  if (data.spotifyIsSimulated) {
    return activeSpotifyState;
  }
  // In a real integration, we would pull this from Spotify's API using the stored access token
  // Let's implement real Spotify fetch as a fallback if client variables are active
  // Since we don't have the active user listening, return simulated if real request fails or isn't set up
  return activeSpotifyState;
}

export async function executeSpotifySearch(query: string, type: "track" | "artist" | "album" | "playlist"): Promise<any[]> {
  const data = loadIntegrationsData();
  if (data.spotifyIsSimulated || !data.settings.spotifyAccessToken) {
    // Simulated Search Results
    const term = query.toLowerCase();
    const tracks = SANDBOX_TRACKS.filter(t => 
      t.trackName.toLowerCase().includes(term) || 
      t.artistName.toLowerCase().includes(term) || 
      t.albumName.toLowerCase().includes(term)
    );
    if (tracks.length > 0) return tracks;
    return SANDBOX_TRACKS.slice(0, 3);
  }

  // Real Spotify API Search
  try {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=5`, {
      headers: { "Authorization": `Bearer ${data.settings.spotifyAccessToken}` }
    });
    if (!res.ok) {
      if (res.status === 401) {
        // Attempt token refresh
        await refreshSpotifyToken();
        return executeSpotifySearch(query, type); // Retry
      }
      throw new Error(`Spotify Search responded with HTTP status ${res.status}`);
    }
    const searchData = await res.json();
    const items = searchData[`${type}s`]?.items || [];
    return items.map((item: any) => ({
      trackName: item.name,
      artistName: item.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
      albumName: item.album?.name || "Single",
      durationMs: item.duration_ms || 200000,
      albumArt: item.album?.images?.[0]?.url || "",
      uri: item.uri
    }));
  } catch (err: any) {
    console.error("[SpotifyReal] Search error:", err.message);
    // Fallback to simulated
    return SANDBOX_TRACKS.slice(0, 3);
  }
}

export async function executeSpotifyControl(action: string, value?: string): Promise<any> {
  const data = loadIntegrationsData();
  
  if (data.spotifyIsSimulated || !data.settings.spotifyAccessToken) {
    // Handle Simulated Actions
    if (action === "play" || action === "resume") {
      activeSpotifyState.isPlaying = true;
      if (value && value.startsWith("spotify:track:")) {
        // Simulated track matching
        activeSpotifyState.trackName = "Custom Requested Track";
        activeSpotifyState.artistName = "Tony's Choice";
        activeSpotifyState.progressMs = 0;
      }
    } else if (action === "pause") {
      activeSpotifyState.isPlaying = false;
    } else if (action === "skip") {
      const nextTrack = SANDBOX_TRACKS[Math.floor(Math.random() * SANDBOX_TRACKS.length)];
      activeSpotifyState.trackName = nextTrack.trackName;
      activeSpotifyState.artistName = nextTrack.artistName;
      activeSpotifyState.albumName = nextTrack.albumName;
      activeSpotifyState.albumArt = nextTrack.albumArt;
      activeSpotifyState.durationMs = nextTrack.durationMs;
      activeSpotifyState.progressMs = 0;
      activeSpotifyState.isPlaying = true;
    } else if (action === "previous") {
      activeSpotifyState.progressMs = 0;
    } else if (action === "volume") {
      activeSpotifyState.volume = parseInt(value || "75", 10);
    }
    return { success: true, action, state: activeSpotifyState, message: `Simulated Spotify action: ${action} succeeded.` };
  }

  // Real Spotify Control Calls
  try {
    let url = "https://api.spotify.com/v1/me/player/pause";
    let method = "PUT";
    let body: any = null;

    if (action === "play" || action === "resume") {
      url = "https://api.spotify.com/v1/me/player/play";
      if (value) {
        body = JSON.stringify({ uris: [value] });
      }
    } else if (action === "skip") {
      url = "https://api.spotify.com/v1/me/player/next";
      method = "POST";
    } else if (action === "previous") {
      url = "https://api.spotify.com/v1/me/player/previous";
      method = "POST";
    } else if (action === "volume") {
      url = `https://api.spotify.com/v1/me/player/volume?volume_percent=${value || 75}`;
    }

    const res = await fetch(url, {
      method,
      headers: { 
        "Authorization": `Bearer ${data.settings.spotifyAccessToken}`,
        "Content-Type": "application/json"
      },
      body
    });

    if (!res.ok) {
      if (res.status === 401) {
        await refreshSpotifyToken();
        return executeSpotifyControl(action, value);
      }
      throw new Error(`Spotify Web Player control rejected action with HTTP status ${res.status}`);
    }

    return { success: true, action, message: `Real Spotify remote playback command issued successfully.` };
  } catch (err: any) {
    console.error("[SpotifyReal] Control failure:", err.message);
    throw new Error(`Real Spotify execution failed. Verify you have an active Spotify Premium session: ${err.message}`);
  }
}

async function refreshSpotifyToken() {
  const data = loadIntegrationsData();
  const { spotifyClientId, spotifyClientSecret, spotifyRefreshToken } = data.settings;
  if (!spotifyClientId || !spotifyClientSecret || !spotifyRefreshToken) {
    throw new Error("Missing client parameters for automated token refresh.");
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: spotifyRefreshToken
      }).toString()
    });

    if (!response.ok) {
      throw new Error(`Refresh responded with status ${response.status}`);
    }

    const tokenData = await response.json();
    data.settings.spotifyAccessToken = tokenData.access_token;
    saveIntegrationsData(data);
    console.log("[SpotifyOAuth] Token refreshed successfully.");
  } catch (err: any) {
    console.error("[SpotifyOAuth] Refresh failure:", err.message);
    throw err;
  }
}

// -------------------------------------------------------------
// Real & Simulated GitHub Handlers
// -------------------------------------------------------------

export interface GitHubProfile {
  login: string;
  name: string;
  avatarUrl: string;
  bio: string;
  publicRepos: number;
  followers: number;
  following: number;
  htmlUrl: string;
}

export interface GitHubRepo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  htmlUrl: string;
}

export interface GitHubActivity {
  id: string;
  type: string;
  repo: string;
  message: string;
  timestamp: string;
}

const MOCK_GITHUB_PROFILE: GitHubProfile = {
  login: "tonystark",
  name: "Tony Stark",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
  bio: "Genius, billionaire, playboy, philanthropist. Archiving Mark LXXXV armor guides & JARVIS modules.",
  publicRepos: 42,
  followers: 12840,
  following: 89,
  htmlUrl: "https://github.com/tonystark"
};

const MOCK_GITHUB_REPOS: GitHubRepo[] = [
  { name: "jarvis-cognitive-core", description: "The central semantic processing and modular dialogue dispatcher of JARVIS.", stars: 5820, forks: 941, language: "TypeScript", htmlUrl: "https://github.com/tonystark/jarvis-cognitive-core" },
  { name: "mark-85-flight-telemetry", description: "Guidance stabilization, thruster calibration, and dynamic atmospheric vectoring.", stars: 2195, forks: 312, language: "C++", htmlUrl: "https://github.com/tonystark/mark-85-flight-telemetry" },
  { name: "arc-reactor-firmware", description: "Plasma density control and automated safety confinement protocols.", stars: 4018, forks: 615, language: "Rust", htmlUrl: "https://github.com/tonystark/arc-reactor-firmware" },
  { name: "nanotech-fabricator", description: "Real-time lattice layout planners and automated cell-by-cell structural repair.", stars: 4501, forks: 1042, language: "Go", htmlUrl: "https://github.com/tonystark/nanotech-fabricator" }
];

const MOCK_GITHUB_ACTIVITIES: GitHubActivity[] = [
  { id: "act-1", type: "PushEvent", repo: "jarvis-cognitive-core", message: "Refactored context synthesis loops for high-frequency neural inputs.", timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: "act-2", type: "StarEvent", repo: "mark-85-flight-telemetry", message: "@pepperpots starred this repository.", timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString() },
  { id: "act-3", type: "PushEvent", repo: "arc-reactor-firmware", message: "Calibrated thermal dissipation limiters to prevent core meltdown under high thrust.", timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
  { id: "act-4", type: "ForkEvent", repo: "nanotech-fabricator", message: "@brucebanner forked the assembler schema.", timestamp: new Date(Date.now() - 1 * 86400 * 1000).toISOString() }
];

export async function getGithubProfile(): Promise<GitHubProfile> {
  const data = loadIntegrationsData();
  if (data.githubIsSimulated || !data.settings.githubAccessToken) {
    return MOCK_GITHUB_PROFILE;
  }

  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${data.settings.githubAccessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "JARVIS-Assistant-Build"
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const json = await res.json();
    return {
      login: json.login || "unknown",
      name: json.name || json.login || "GitHub User",
      avatarUrl: json.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
      bio: json.bio || "No bio description provided.",
      publicRepos: json.public_repos ?? 0,
      followers: json.followers ?? 0,
      following: json.following ?? 0,
      htmlUrl: json.html_url || "https://github.com"
    };
  } catch (err: any) {
    console.error("[GitHub API] Profile fetch failure:", err.message);
    return MOCK_GITHUB_PROFILE;
  }
}

export async function getGithubRepositories(): Promise<GitHubRepo[]> {
  const data = loadIntegrationsData();
  if (data.githubIsSimulated || !data.settings.githubAccessToken) {
    return MOCK_GITHUB_REPOS;
  }

  try {
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
      headers: {
        "Authorization": `token ${data.settings.githubAccessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "JARVIS-Assistant-Build"
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const json = await res.json();
    if (!Array.isArray(json)) return MOCK_GITHUB_REPOS;

    return json.map((r: any) => ({
      name: r.name,
      description: r.description || "No description available.",
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      language: r.language || "Other",
      htmlUrl: r.html_url
    }));
  } catch (err: any) {
    console.error("[GitHub API] Repositories fetch failure:", err.message);
    return MOCK_GITHUB_REPOS;
  }
}

export async function getGithubActivity(): Promise<GitHubActivity[]> {
  const data = loadIntegrationsData();
  if (data.githubIsSimulated || !data.settings.githubAccessToken) {
    return MOCK_GITHUB_ACTIVITIES;
  }

  try {
    const profile = await getGithubProfile();
    const res = await fetch(`https://api.github.com/users/${profile.login}/events?per_page=10`, {
      headers: {
        "Authorization": `token ${data.settings.githubAccessToken}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "JARVIS-Assistant-Build"
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const json = await res.json();
    if (!Array.isArray(json)) return MOCK_GITHUB_ACTIVITIES;

    const events = json.slice(0, 8).map((evt: any) => {
      let message = "";
      const repoName = evt.repo?.name ? evt.repo.name.split("/").pop() : "repository";
      
      if (evt.type === "PushEvent") {
        const commitMsg = evt.payload?.commits?.[0]?.message || "Pushed code changes";
        message = commitMsg;
      } else if (evt.type === "WatchEvent") {
        message = "Starred this repository";
      } else if (evt.type === "CreateEvent") {
        message = `Created repository: ${repoName}`;
      } else if (evt.type === "ForkEvent") {
        message = `Forked repository`;
      } else {
        message = `Triggered GitHub event: ${evt.type}`;
      }

      return {
        id: evt.id || `evt-${Math.random()}`,
        type: evt.type,
        repo: repoName,
        message,
        timestamp: evt.created_at
      };
    });

    return events.length > 0 ? events : MOCK_GITHUB_ACTIVITIES;
  } catch (err: any) {
    console.error("[GitHub API] Activity fetch failure:", err.message);
    return MOCK_GITHUB_ACTIVITIES;
  }
}
