/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Trash2, Search, Plus, ShieldCheck, 
  Clock, ToggleLeft, ToggleRight, Sparkles, AlertCircle 
} from 'lucide-react';
import { SettingsState } from '../types';

interface Memory {
  id: string;
  text: string;
  timestamp: string;
  isSensitive?: boolean;
}

interface MemoryBankPanelProps {
  settings: SettingsState;
  onUpdateSettings: (updater: (prev: SettingsState) => SettingsState) => void;
}

export const MemoryBankPanel: React.FC<MemoryBankPanelProps> = ({ settings, onUpdateSettings }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newMemoryText, setNewMemoryText] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);

  // Fetch memories from server
  const fetchMemories = async () => {
    try {
      setLoading(true);
      const url = searchQuery.trim() 
        ? `/api/memories?q=${encodeURIComponent(searchQuery)}` 
        : '/api/memories';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to retrieve stored memories');
      const data = await response.json();
      setMemories(data.memories || []);
      setError(null);
    } catch (err: any) {
      console.error('[MemoryBank] Retrieval error:', err);
      setError(err.message || 'System failed to synchronize with long-term memory vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [searchQuery]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim()) return;

    try {
      setAdding(true);
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMemoryText })
      });
      if (!response.ok) throw new Error('Failed to persist cognitive fragment');
      
      setNewMemoryText('');
      fetchMemories();
    } catch (err: any) {
      console.error('[MemoryBank] Insertion error:', err);
      setError(err.message || 'Cognitive store write failure.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to purge this cognitive entry?')) return;
    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Purge directive failed');
      fetchMemories();
    } catch (err: any) {
      setError(err.message || 'Purge failed.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('WARNING: This will wipe all long-term memories. Confirm purge?')) return;
    try {
      const response = await fetch('/api/memories', {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Wipe directive failed');
      fetchMemories();
    } catch (err: any) {
      setError(err.message || 'Wipe failed.');
    }
  };

  const toggleMemorySync = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      memory: {
        ...prev.memory,
        longTermEnabled: !prev.memory.longTermEnabled
      }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[500px]"
    >
      {/* Left controls column */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Core State Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
              Cognitive Synchronization
            </span>
            <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-bold ${
              settings.memory.longTermEnabled 
                ? 'text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/20' 
                : 'text-gray-500 bg-white/5 border border-white/10'
            }`}>
              {settings.memory.longTermEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/15 shrink-0">
              <Database className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-medium text-xs text-white uppercase tracking-wider">
                Long-Term Memory Store
              </h3>
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                Empower JARVIS with persistent user recollection across active threads and system cycles.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleMemorySync}
            className={`w-full py-2.5 px-4 rounded-xl border font-display text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
              settings.memory.longTermEnabled
                ? 'bg-jarvis-cyan/15 border-jarvis-cyan/35 text-jarvis-cyan'
                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <span>Durable Memory Recall</span>
            {settings.memory.longTermEnabled ? (
              <ToggleRight className="w-5 h-5 text-jarvis-cyan" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Manual Write Entry */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">
            Inject Recollection Segment
          </span>

          <form onSubmit={handleAddMemory} className="space-y-3">
            <textarea
              rows={3}
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              placeholder="Tony is working on Stage 4 JARVIS. Prefer clean TypeScript interfaces over mock configurations..."
              className="w-full bg-[#07090e] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-jarvis-cyan/40 transition-colors resize-none font-sans"
            />
            <button
              type="submit"
              disabled={adding || !newMemoryText.trim()}
              className="w-full py-2 bg-jarvis-cyan hover:bg-jarvis-cyan/90 text-black font-display font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{adding ? 'Securing Entry...' : 'Commit to Long-term Store'}</span>
            </button>
          </form>
        </div>

        {/* Safety filter information */}
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/15 flex items-start gap-2.5">
          <ShieldCheck className="w-4.5 h-4.5 text-green-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-display font-semibold text-[10px] text-green-400 uppercase tracking-wider block">
              Sensitive Filter Active
            </span>
            <p className="text-[9px] text-gray-400 leading-relaxed font-sans">
              The memory engine scans and censors potential API keys, secret strings, and passwords automatically before storage commit.
            </p>
          </div>
        </div>
      </div>

      {/* Right list column */}
      <div className="lg:col-span-8 flex flex-col h-full glass-panel rounded-2xl border border-white/5 bg-black/30 overflow-hidden relative">
        {/* Search header bar */}
        <div className="px-5 py-4 border-b border-white/5 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cognitive records..."
              className="w-full bg-[#05070a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-jarvis-cyan/35 transition-colors"
            />
          </div>

          {memories.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[9px] font-mono text-gray-400 hover:text-jarvis-red border border-white/5 hover:border-jarvis-red/20 bg-white/[0.01] hover:bg-jarvis-red/5 px-2.5 py-1.5 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>PURGE ENTIRE VAULT</span>
            </button>
          )}
        </div>

        {/* Live List Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-[300px]">
          {error && (
            <div className="p-3 bg-jarvis-red/10 border border-jarvis-red/25 rounded-xl text-xs text-jarvis-red flex items-center gap-2 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="h-full flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Database className="w-6 h-6 text-jarvis-cyan animate-spin-slow" />
                <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                  Retrieving context keys...
                </span>
              </div>
            </div>
          ) : memories.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/[0.01] border border-white/5 flex items-center justify-center text-gray-600">
                <Database className="w-5 h-5 text-gray-500" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="font-display text-xs font-semibold text-white uppercase tracking-wider">
                  No memories indexed
                </h4>
                <p className="text-[10px] text-gray-500 leading-normal font-sans">
                  The long-term database is empty. Either trigger JARVIS to save details explicitly (e.g., "remember my email is..."), or create one manually using the side injector.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {memories.map((mem) => (
                <motion.div
                  key={mem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <p className="text-xs text-gray-200 font-sans leading-relaxed">
                      {mem.text}
                    </p>
                    <div className="flex items-center gap-3.5 text-[8px] font-mono text-gray-500 uppercase tracking-wide">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-gray-600" />
                        {new Date(mem.timestamp).toLocaleString()}
                      </span>
                      {mem.isSensitive && (
                        <span className="text-amber-400 bg-amber-500/15 border border-amber-500/20 px-1 py-0.5 rounded text-[7px] font-bold">
                          REDACTED KEYS DETECTED
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-1.5 rounded hover:bg-jarvis-red/10 border border-transparent hover:border-jarvis-red/25 text-gray-500 hover:text-jarvis-red transition-all cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                    title="Purge recollection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Status indicator footer */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-jarvis-cyan" />
            <span>Persistent Vault Sync Status: NOMINAL</span>
          </div>
          <span>Total Records: {memories.length}</span>
        </div>
      </div>
    </motion.div>
  );
};
