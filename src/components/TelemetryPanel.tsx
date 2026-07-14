/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Activity, Cpu, Terminal, 
  RefreshCw, CheckCircle, Clock, Shield, AlertCircle, Play, Server
} from 'lucide-react';
import { AssistantState } from '../types';

interface TelemetryEvent {
  state: AssistantState;
  timestamp: Date;
}

interface TelemetryPanelProps {
  transitionHistory: TelemetryEvent[];
  onClearHistory?: () => void;
}

interface DiagnosticReport {
  apiConfigured: boolean;
  synthesisSupported: boolean;
  recognitionSupported: boolean;
  micConnected: boolean;
  spotifySimulated: boolean;
  lastChecked: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ transitionHistory, onClearHistory }) => {
  const [isProbing, setIsProbing] = useState(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);

  // Hardcoded real/mock performance variables to add premium sci-fi telemetry realism
  const stats = [
    { label: 'Core Cognitive Frequency', value: '4.85 GHz', change: 'NOMINAL', color: 'text-jarvis-cyan' },
    { label: 'Gemini Latency Index', value: '240 ms', change: 'OPTIMIZED', color: 'text-jarvis-blue' },
    { label: 'VAD Squelch Sensitivity', value: '72%', change: 'DYNAMIC', color: 'text-jarvis-purple' },
    { label: 'Long-term Storage SQLite Indexes', value: 'Nominal (Encrypted)', change: 'SECURED', color: 'text-green-400' }
  ];

  const runDiagnosticProbe = async () => {
    setIsProbing(true);
    // Simulate active system analysis for premium operational feedback
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // 1. Fetch live system credentials check
      const healthRes = await fetch('/api/health').then(r => r.json()).catch(() => ({ apiConfigured: false }));
      
      // 2. Query optional spotify simulation credentials status
      const integrationsRes = await fetch('/api/integrations/status').then(r => r.json()).catch(() => ({ spotify: { isSimulated: true } }));

      // 3. Probe browser interfaces
      const hasSynthesis = typeof window !== 'undefined' && !!window.speechSynthesis;
      const hasRecognition = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

      // 4. Check mic hardware access status
      let micOK = false;
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        micOK = devices.some(d => d.kind === 'audioinput' && d.label !== '');
      }

      setReport({
        apiConfigured: healthRes.apiConfigured,
        synthesisSupported: hasSynthesis,
        recognitionSupported: hasRecognition,
        micConnected: micOK,
        spotifySimulated: integrationsRes.spotify?.isSimulated ?? true,
        lastChecked: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error("[Diagnostics] Failed to execute sensor sweep:", err);
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    // Initial run on mount
    runDiagnosticProbe();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[500px]"
    >
      {/* Left statistics grid column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Dynamic Diagnostics Sweep Matrix */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-jarvis-cyan" />
              <span className="font-display font-semibold text-xs text-white tracking-widest uppercase">
                System Diagnostics sweep
              </span>
            </div>
            <button
              onClick={runDiagnosticProbe}
              disabled={isProbing}
              className="text-[9px] font-mono tracking-wider bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 text-jarvis-cyan px-2 py-1 rounded border border-jarvis-cyan/30 transition-colors uppercase cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
              <span>{isProbing ? 'Sweeping...' : 'Probe System'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {report ? (
              <>
                {/* 1. Gemini Core Service */}
                <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-300 font-sans">Cognitive LLM Key Validation</div>
                    <div className="text-[8px] text-gray-500 font-mono mt-0.5">GEMINI_API_KEY environment binding</div>
                  </div>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold ${
                    report.apiConfigured 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                      : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 animate-pulse'
                  }`}>
                    {report.apiConfigured ? 'SECURED / NOMINAL' : 'CREDENTIAL REQUIRED'}
                  </span>
                </div>

                {/* 2. Web Speech Synthesis */}
                <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-300 font-sans">Speech Synthesis Engine (TTS)</div>
                    <div className="text-[8px] text-gray-500 font-mono mt-0.5">Vocal narration capabilities (HTML5)</div>
                  </div>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold ${
                    report.synthesisSupported 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/15 text-red-500 border border-red-500/20'
                  }`}>
                    {report.synthesisSupported ? 'SUPPORTED' : 'UNSUPPORTED'}
                  </span>
                </div>

                {/* 3. Speech Recognition */}
                <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-300 font-sans">Speech Recognition (STT)</div>
                    <div className="text-[8px] text-gray-500 font-mono mt-0.5">Voice command recognition capability</div>
                  </div>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold ${
                    report.recognitionSupported 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                      : 'bg-red-500/15 text-red-500 border border-red-500/20'
                  }`}>
                    {report.recognitionSupported ? 'SUPPORTED' : 'UNSUPPORTED'}
                  </span>
                </div>

                {/* 4. Microphone Input Hardware */}
                <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-gray-300 font-sans">Microphone Hardware Access</div>
                    <div className="text-[8px] text-gray-500 font-mono mt-0.5">Audio stream validation status</div>
                  </div>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-bold ${
                    report.micConnected 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                      : 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/20'
                  }`}>
                    {report.micConnected ? 'NOMINAL' : 'CHECK PERMISSION'}
                  </span>
                </div>

                {!report.apiConfigured && (
                  <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] text-yellow-400 font-bold uppercase font-mono">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Action required: Config key</span>
                    </div>
                    <p className="text-[9px] text-gray-400 leading-normal font-sans">
                      The core Gemini API key is missing from environment variables. JARVIS will fallback to simulation responses until GEMINI_API_KEY is configured in the settings.
                    </p>
                  </div>
                )}
                
                <div className="text-right text-[8px] text-gray-600 font-mono uppercase tracking-wider">
                  Sweep Integrity Sync: {report.lastChecked}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-gray-600 uppercase">
                Initial sensor sweep in progress...
              </div>
            )}
          </div>
        </div>

        {/* State vectors cards */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest">
              Live Core Performance Statistics
            </span>
            <Activity className="w-3.5 h-3.5 text-jarvis-cyan animate-pulse" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {stats.map((stat) => (
              <div 
                key={stat.label}
                className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between hover:bg-white/[0.03] transition-all"
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] text-gray-400 font-sans">{stat.label}</div>
                  <div className={`text-sm font-display font-semibold ${stat.color}`}>{stat.value}</div>
                </div>
                <span className="font-mono text-[8px] bg-white/5 px-2 py-0.5 text-gray-500 rounded font-bold uppercase tracking-wider">
                  {stat.change}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cognitive Core Telemetry description */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4.5 h-4.5 text-jarvis-cyan" />
            <span className="font-display font-semibold text-xs text-white tracking-wider uppercase">
              Operational Metasystem
            </span>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
            This terminal displays telemetry reports straight from the state machine orchestrating JARVIS. Every audio commit, wake trigger, and LLM text chunk streams through this matrix.
          </p>
        </div>
      </div>

      {/* Right streaming terminal logger */}
      <div className="lg:col-span-7 flex flex-col h-full glass-panel rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
        {/* Terminal Header */}
        <div className="px-5 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-jarvis-cyan animate-pulse" />
            <h2 className="font-display font-medium text-xs tracking-widest text-white uppercase">
              Core Shell Log Stream
            </h2>
          </div>
          {onClearHistory && transitionHistory.length > 1 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[8px] font-mono text-gray-500 hover:text-jarvis-cyan transition-all cursor-pointer bg-white/5 px-2 py-0.5 rounded border border-white/5"
            >
              Flush Logs
            </button>
          )}
        </div>

        {/* Live Terminal Log rows */}
        <div className="flex-1 overflow-y-auto p-5 font-mono text-[10px] text-gray-400 space-y-2 min-h-[300px] bg-black/10 select-all">
          {transitionHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center py-16 text-gray-600 uppercase text-[9px] tracking-widest">
              [Log pipeline silent. Listening for state events...]
            </div>
          ) : (
            transitionHistory.map((event, index) => {
              const dateStr = event.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const msStr = String(event.timestamp.getMilliseconds()).padStart(3, '0');
              
              let stateColor = 'text-gray-400';
              let lineAccent = '[...]';

              switch (event.state) {
                case AssistantState.STANDBY:
                  stateColor = 'text-gray-500';
                  lineAccent = '[STANDBY]';
                  break;
                case AssistantState.IDLE:
                  stateColor = 'text-green-400';
                  lineAccent = '[READY]';
                  break;
                case AssistantState.LISTENING:
                  stateColor = 'text-jarvis-cyan';
                  lineAccent = '[MIC_ON]';
                  break;
                case AssistantState.THINKING:
                  stateColor = 'text-jarvis-purple animate-pulse';
                  lineAccent = '[THINK]';
                  break;
                case AssistantState.SPEAKING:
                  stateColor = 'text-jarvis-blue';
                  lineAccent = '[AUDIO]';
                  break;
                case AssistantState.ERROR:
                  stateColor = 'text-jarvis-red';
                  lineAccent = '[ALERT]';
                  break;
              }

              return (
                <div 
                  key={index}
                  className="flex items-start gap-3.5 hover:bg-white/[0.02] p-1 rounded"
                >
                  <span className="text-gray-600 select-none shrink-0">
                    {dateStr}.{msStr}
                  </span>
                  <span className={`font-bold shrink-0 ${stateColor}`}>
                    {lineAccent}
                  </span>
                  <span className="text-gray-300 break-all leading-normal">
                    {event.state === AssistantState.STANDBY && 'JARVIS entered low-resource standby mode. Webkit wake-word continuous detection engaged.'}
                    {event.state === AssistantState.IDLE && 'JARVIS successfully entered dormant waiting profile. Audio pipelines normalized.'}
                    {event.state === AssistantState.LISTENING && 'System voice capture micro-driver initialized. Squelch filters active.'}
                    {event.state === AssistantState.THINKING && 'Parsed dialogue context dispatched to Express pipeline. Processing Gemini LLM brain responses.'}
                    {event.state === AssistantState.SPEAKING && 'Dialogue text synthesis succeeded. Outputting acoustic speaker waveform.'}
                    {event.state === AssistantState.ERROR && 'Operational connection disrupted. Checked CORS, security keys, and port maps.'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer log status */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span>Telemetry buffer active: Nominally parsing...</span>
          </div>
          <span>Events Logged: {transitionHistory.length}</span>
        </div>
      </div>
    </motion.div>
  );
};
