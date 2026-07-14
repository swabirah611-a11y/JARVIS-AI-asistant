/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Link2, Globe, CloudSun, Music, Youtube, Terminal,
  Sliders, Trash2, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, ShieldCheck, Key, Laptop, ExternalLink, HelpCircle,
  Github, GitBranch, GitCommit, Star
} from 'lucide-react';

interface IntegrationItem {
  status: 'connected' | 'not_connected' | 'config_required' | 'error' | 'unavailable';
  isSimulated?: boolean;
  mode?: 'sandbox' | 'local';
  label: string;
  profile?: {
    login: string;
    name: string;
    avatarUrl: string;
    bio: string;
    publicRepos: number;
    followers: number;
    following: number;
    htmlUrl: string;
  };
  repos?: Array<{
    name: string;
    description: string;
    stars: number;
    forks: number;
    language: string;
    htmlUrl: string;
  }>;
  activity?: Array<{
    id: string;
    type: string;
    repo: string;
    message: string;
    timestamp: string;
  }>;
}

interface IntegrationStatusMap {
  webSearch: IntegrationItem;
  weather: IntegrationItem;
  spotify: IntegrationItem;
  github: IntegrationItem;
  youtube: IntegrationItem;
  desktopControl: IntegrationItem;
}

interface IntegrationLog {
  id: string;
  timestamp: string;
  toolName: string;
  actionType: "Execute" | "Approve" | "Deny" | "Config" | "StatusChange";
  parameters: any;
  permissionLevel: "SAFE" | "CONFIRMATION_REQUIRED" | "RESTRICTED";
  result: any;
}

export const IntegrationsPanel: React.FC = () => {
  const [statuses, setStatuses] = useState<IntegrationStatusMap | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [spotifyId, setSpotifyId] = useState('');
  const [spotifySecret, setSpotifySecret] = useState('');
  const [githubId, setGithubId] = useState('');
  const [githubSecret, setGithubSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      }
    } catch (err) {
      console.error("Failed to load integrations status:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/integrations/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/integrations/settings');
      if (res.ok) {
        const data = await res.json();
        setSpotifyId(data.spotifyClientId || '');
        setSpotifySecret(data.spotifyClientSecret || '');
        setGithubId(data.githubClientId || '');
        setGithubSecret(data.githubClientSecret || '');
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchStatus(), fetchLogs(), fetchSettings()]).finally(() => {
      setIsLoading(false);
    });

    // Listen for postMessage events from the Spotify and GitHub OAuth popup
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
        setSuccessMsg("Spotify Account authenticated and paired with JARVIS!");
        setAuthError(null);
        fetchStatus();
        fetchLogs();
      } else if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        setSuccessMsg("GitHub Account authenticated and paired with JARVIS!");
        setAuthError(null);
        fetchStatus();
        fetchLogs();
      }
    };
    window.addEventListener('message', handleAuthMessage);

    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setAuthError(null);

    try {
      const res = await fetch('/api/integrations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spotifyClientId: spotifyId,
          spotifyClientSecret: spotifySecret,
          githubClientId: githubId,
          githubClientSecret: githubSecret
        })
      });

      if (res.ok) {
        setSuccessMsg("Settings saved successfully.");
        await fetchStatus();
        await fetchLogs();
      } else {
        const errData = await res.json();
        setAuthError(errData.error || "Failed to save settings.");
      }
    } catch (err) {
      setAuthError("Network error saving integration credentials.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSpotifySandbox = async () => {
    try {
      const res = await fetch('/api/integrations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'spotify',
          mode: statuses?.spotify.status === 'connected' && statuses?.spotify.isSimulated === true ? 'disconnect' : 'connect_simulated'
        })
      });
      if (res.ok) {
        await fetchStatus();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleGithubSandbox = async () => {
    try {
      const res = await fetch('/api/integrations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'github',
          mode: statuses?.github.status === 'connected' && statuses?.github.isSimulated === true ? 'disconnect' : 'connect_simulated'
        })
      });
      if (res.ok) {
        await fetchStatus();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDesktopMode = async (mode: 'sandbox' | 'local') => {
    try {
      const res = await fetch('/api/integrations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'desktop',
          mode
        })
      });
      if (res.ok) {
        await fetchStatus();
        await fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpotifyRealConnect = async () => {
    setAuthError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/spotify/url');
      const data = await res.json();
      if (data.url) {
        // Safe pop-up window flow suited for iframe-based clients
        const width = 500, height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(data.url, 'spotify-auth', `width=${width},height=${height},left=${left},top=${top}`);
      } else {
        setAuthError(data.error || "Provide Client ID & Secret credentials first.");
      }
    } catch (err) {
      setAuthError("Failed to initiate Spotify OAuth workflow.");
    }
  };

  const handleGithubRealConnect = async () => {
    setAuthError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();
      if (data.url) {
        const width = 550, height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(data.url, 'github-auth', `width=${width},height=${height},left=${left},top=${top}`);
      } else {
        setAuthError(data.error || "Provide GitHub Client ID & Secret credentials first.");
      }
    } catch (err) {
      setAuthError("Failed to initiate GitHub OAuth workflow.");
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/integrations/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderStatusBadge = (item: IntegrationItem) => {
    let color = 'text-gray-400 bg-white/5 border-white/10';
    let text = 'Disconnected';

    if (item.status === 'connected') {
      if (item.isSimulated) {
        color = 'text-jarvis-blue bg-jarvis-blue/10 border-jarvis-blue/20';
        text = 'Sandbox';
      } else {
        color = 'text-green-400 bg-green-500/10 border-green-500/20';
        text = 'Connected';
      }
    } else if (item.status === 'config_required') {
      color = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      text = 'Configure';
    } else if (item.status === 'unavailable') {
      color = 'text-jarvis-red bg-jarvis-red/10 border-jarvis-red/20 animate-pulse';
      text = 'Offline';
    } else if (item.status === 'error') {
      color = 'text-jarvis-red bg-jarvis-red/10 border-jarvis-red/20';
      text = 'Error';
    }

    return (
      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${color}`}>
        {text}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 flex-1"
    >
      {/* Upper overview header */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-jarvis-cyan/10 border border-jarvis-cyan/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-jarvis-cyan" />
          </div>
          <div className="space-y-0.5">
            <h1 className="font-display font-semibold text-sm text-white tracking-wider uppercase">
              JARVIS Core Integrations Matrix
            </h1>
            <p className="text-[10px] text-gray-500 font-sans">
              Connect real-world APIs or trigger simulation nodes in client sandbox environments.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            setIsLoading(true);
            await Promise.all([fetchStatus(), fetchLogs()]);
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="text-[10px] font-mono text-gray-400 hover:text-jarvis-cyan transition-all bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left column: Status indicators and credentials */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Subsystems Map Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block pb-2 border-b border-white/5">
              Active Integration Nodes
            </span>

            {statuses ? (
              <div className="space-y-3.5">
                {/* DDG Web Search */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4.5 h-4.5 text-jarvis-cyan" />
                    <span className="text-[11px] font-sans text-gray-300 font-medium">Web Search</span>
                  </div>
                  {renderStatusBadge(statuses.webSearch)}
                </div>

                {/* Weather Service */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
                  <div className="flex items-center gap-2.5">
                    <CloudSun className="w-4.5 h-4.5 text-orange-400" />
                    <span className="text-[11px] font-sans text-gray-300 font-medium">wttr.in Weather</span>
                  </div>
                  {renderStatusBadge(statuses.weather)}
                </div>

                {/* YouTube */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
                  <div className="flex items-center gap-2.5">
                    <Youtube className="w-4.5 h-4.5 text-jarvis-red" />
                    <span className="text-[11px] font-sans text-gray-300 font-medium">YouTube Engine</span>
                  </div>
                  {renderStatusBadge(statuses.youtube)}
                </div>

                {/* Spotify Playback */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Music className="w-4.5 h-4.5 text-green-400" />
                      <span className="text-[11px] font-sans text-gray-300 font-medium">Spotify Player</span>
                    </div>
                    {renderStatusBadge(statuses.spotify)}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleSpotifySandbox}
                      className="text-[9px] font-mono text-gray-400 hover:text-jarvis-cyan bg-white/5 px-2 py-1 rounded border border-white/5 flex-1 transition-all"
                    >
                      {statuses.spotify.status === 'connected' && statuses.spotify.isSimulated 
                        ? "Disconnect Sandbox" 
                        : "Enable Sandbox Mode"}
                    </button>
                    {!statuses.spotify.isSimulated && statuses.spotify.status !== 'connected' && (
                      <button
                        type="button"
                        onClick={handleSpotifyRealConnect}
                        className="text-[9px] font-mono text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex-1 transition-all flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        OAuth Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* GitHub Platform */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Github className="w-4.5 h-4.5 text-white" />
                      <span className="text-[11px] font-sans text-gray-300 font-medium">GitHub Integrations</span>
                    </div>
                    {renderStatusBadge(statuses.github)}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleToggleGithubSandbox}
                      className="text-[9px] font-mono text-gray-400 hover:text-jarvis-cyan bg-white/5 px-2 py-1 rounded border border-white/5 flex-1 transition-all"
                    >
                      {statuses.github.status === 'connected' && statuses.github.isSimulated 
                        ? "Disconnect Sandbox" 
                        : "Enable Sandbox Mode"}
                    </button>
                    {!statuses.github.isSimulated && statuses.github.status !== 'connected' && (
                      <button
                        type="button"
                        onClick={handleGithubRealConnect}
                        className="text-[9px] font-mono text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex-1 transition-all flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        OAuth Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop Controller */}
                <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Laptop className="w-4.5 h-4.5 text-jarvis-purple" />
                      <span className="text-[11px] font-sans text-gray-300 font-medium">Desktop Actions</span>
                    </div>
                    {renderStatusBadge(statuses.desktopControl)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggleDesktopMode('sandbox')}
                      className={`text-[9px] font-mono px-2 py-1 rounded border transition-all ${
                        statuses.desktopControl.mode === 'sandbox'
                          ? 'text-jarvis-cyan bg-jarvis-cyan/10 border-jarvis-cyan/30'
                          : 'text-gray-500 bg-white/5 border-white/5 hover:text-gray-400'
                      }`}
                    >
                      Sandbox Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDesktopMode('local')}
                      className={`text-[9px] font-mono px-2 py-1 rounded border transition-all flex items-center justify-center gap-1 ${
                        statuses.desktopControl.mode === 'local'
                          ? 'text-jarvis-cyan bg-jarvis-cyan/10 border-jarvis-cyan/30'
                          : 'text-gray-500 bg-white/5 border-white/5 hover:text-gray-400'
                      }`}
                    >
                      Local Agent Mode
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-24 flex items-center justify-center text-[10px] font-mono text-gray-600">
                LOADING STATE INDICATORS...
              </div>
            )}
          </div>

          {/* Spotify and Credentials Setup */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                Spotify API Configuration
              </span>
              <Key className="w-3.5 h-3.5 text-jarvis-cyan" />
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-sans block">Spotify Client ID</label>
                <input 
                  type="text" 
                  value={spotifyId}
                  onChange={(e) => setSpotifyId(e.target.value)}
                  placeholder="e.g. 5d83626e9fb742e9..."
                  className="w-full text-xs font-mono bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-jarvis-cyan focus:outline-none p-2.5 rounded-lg text-white transition-all placeholder:text-gray-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-sans block">Spotify Client Secret</label>
                <input 
                  type="password" 
                  value={spotifySecret}
                  onChange={(e) => setSpotifySecret(e.target.value)}
                  placeholder="Enter secret (masked on save)"
                  className="w-full text-xs font-mono bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-jarvis-cyan focus:outline-none p-2.5 rounded-lg text-white transition-all placeholder:text-gray-700"
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-jarvis-red/10 border border-jarvis-red/20 flex items-start gap-2 text-[10px] text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2 text-[10px] text-green-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full text-[11px] font-sans font-semibold uppercase tracking-wider text-black bg-jarvis-cyan hover:bg-jarvis-cyan/80 p-2.5 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Credentials"}
              </button>
            </form>
          </div>

          {/* GitHub Configuration Form */}
          <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
                GitHub API Configuration
              </span>
              <Github className="w-3.5 h-3.5 text-white" />
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-sans block">GitHub Client ID</label>
                <input 
                  type="text" 
                  value={githubId}
                  onChange={(e) => setGithubId(e.target.value)}
                  placeholder="e.g. Ov23ctyN8A9f4S6q..."
                  className="w-full text-xs font-mono bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-jarvis-cyan focus:outline-none p-2.5 rounded-lg text-white transition-all placeholder:text-gray-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 font-sans block">GitHub Client Secret</label>
                <input 
                  type="password" 
                  value={githubSecret}
                  onChange={(e) => setGithubSecret(e.target.value)}
                  placeholder="Enter secret (masked on save)"
                  className="w-full text-xs font-mono bg-white/[0.02] border border-white/10 hover:border-white/20 focus:border-jarvis-cyan focus:outline-none p-2.5 rounded-lg text-white transition-all placeholder:text-gray-700"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full text-[11px] font-sans font-semibold uppercase tracking-wider text-black bg-jarvis-cyan hover:bg-jarvis-cyan/80 p-2.5 rounded-lg font-bold cursor-pointer transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save GitHub Credentials"}
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Activity and execution telemetry logs */}
        <div className="lg:col-span-7 flex flex-col h-full glass-panel rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
          {/* Logs Header */}
          <div className="px-5 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-jarvis-cyan" />
              <h2 className="font-display font-medium text-xs tracking-widest text-white uppercase">
                Connective Activity Audit Logs
              </h2>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="text-[9px] font-mono text-gray-500 hover:text-jarvis-cyan transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                Wipe Logs
              </button>
            )}
          </div>

          {/* GitHub Connected Dashboard Overview */}
          {statuses?.github?.status === 'connected' && statuses?.github?.profile && (
            <div className="px-5 py-4 border-b border-white/5 bg-black/50 space-y-4 shrink-0 overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={statuses.github.profile.avatarUrl} 
                    alt={statuses.github.profile.name} 
                    className="w-11 h-11 rounded-xl border border-white/10 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-medium text-xs text-white leading-none">{statuses.github.profile.name}</h3>
                      <span className="text-[9px] text-gray-500 font-mono">@{statuses.github.profile.login}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 font-sans">{statuses.github.profile.bio}</p>
                  </div>
                </div>
                <a 
                  href={statuses.github.profile.htmlUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[9px] font-mono text-jarvis-cyan hover:underline flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Profile
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono border-t border-b border-white/5 py-2 bg-white/[0.01]">
                <div>
                  <div className="text-white font-bold">{statuses.github.profile.publicRepos}</div>
                  <div className="text-gray-500 uppercase text-[8px] tracking-wider mt-0.5">Repositories</div>
                </div>
                <div>
                  <div className="text-white font-bold">{statuses.github.profile.followers}</div>
                  <div className="text-gray-500 uppercase text-[8px] tracking-wider mt-0.5">Followers</div>
                </div>
                <div>
                  <div className="text-white font-bold">{statuses.github.profile.following}</div>
                  <div className="text-gray-500 uppercase text-[8px] tracking-wider mt-0.5">Following</div>
                </div>
              </div>

              {statuses.github.repos && statuses.github.repos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-jarvis-cyan" /> active repositories
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {statuses.github.repos.slice(0, 4).map((repo, i) => (
                      <a 
                        key={i}
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all flex flex-col justify-between"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-gray-300 font-sans block">{repo.name}</span>
                          <p className="text-[9px] text-gray-500 line-clamp-1 mt-0.5 font-sans leading-relaxed">{repo.description}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[8px] font-mono text-gray-600">
                          <span className="flex items-center gap-1 text-jarvis-cyan">
                            <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan inline-block"></span>
                            {repo.language}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {repo.stars}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Logs Area */}
          <div className="flex-1 overflow-y-auto p-5 font-mono text-[10px] text-gray-400 space-y-3 min-h-[400px] max-h-[600px] bg-black/10 select-all">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-24 text-gray-600 uppercase text-[9px] tracking-widest space-y-2">
                <HelpCircle className="w-6 h-6 text-gray-700 animate-pulse" />
                <span>[Logs pipeline silent. Trigger tool actions in core assistant]</span>
              </div>
            ) : (
              logs.map((log) => {
                const date = new Date(log.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                let levelColor = 'text-gray-500';
                if (log.permissionLevel === 'CONFIRMATION_REQUIRED') levelColor = 'text-amber-400';
                if (log.permissionLevel === 'RESTRICTED') levelColor = 'text-jarvis-red';

                let actionBadge = 'bg-white/5 text-gray-400';
                if (log.actionType === 'Approve') actionBadge = 'bg-green-500/10 text-green-400';
                if (log.actionType === 'Deny') actionBadge = 'bg-red-500/10 text-red-400';
                if (log.actionType === 'Execute') actionBadge = 'bg-jarvis-cyan/15 text-jarvis-cyan';

                return (
                  <div 
                    key={log.id}
                    className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 space-y-2 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{timeStr}</span>
                        <span className="text-white font-semibold font-sans">{log.toolName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${actionBadge}`}>
                          {log.actionType}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/5 ${levelColor}`}>
                          {log.permissionLevel}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-400 space-y-1">
                      {log.parameters && Object.keys(log.parameters).length > 0 && (
                        <div>
                          <span className="text-gray-600">Parameters:</span>{' '}
                          <span className="text-gray-300 break-all">{JSON.stringify(log.parameters)}</span>
                        </div>
                      )}
                      {log.result && (
                        <div className="pt-1.5 border-t border-white/[0.03]">
                          <span className="text-gray-600">Result:</span>{' '}
                          <span className="text-jarvis-cyan leading-normal font-sans text-[10px] block mt-0.5">
                            {typeof log.result === 'string' 
                              ? log.result 
                              : log.result.message || log.result.error || JSON.stringify(log.result)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Status Panel */}
          <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span>All integration actions governed by Stage 4 Tool Registry security.</span>
            </div>
            <span>Records Audit: {logs.length}</span>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
