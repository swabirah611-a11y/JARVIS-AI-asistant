/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Play, Radio, Activity, AlertCircle, RefreshCw, Terminal, CheckCircle2 
} from 'lucide-react';
import { AssistantState } from '../types';

interface DeveloperTestingConsoleProps {
  currentState: AssistantState;
  onStateChange: (state: AssistantState) => void;
  onTriggerDemoSequence: () => void;
  transitionHistory: { state: AssistantState; timestamp: Date }[];
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const DeveloperTestingConsole: React.FC<DeveloperTestingConsoleProps> = ({
  currentState,
  onStateChange,
  onTriggerDemoSequence,
  transitionHistory,
  isDemoMode,
  onToggleDemoMode
}) => {
  return (
    <div className="glass-panel rounded-2xl border border-white/5 bg-black/40 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal className="w-4 h-4 text-jarvis-amber" />
          <h3 className="font-display font-medium text-xs tracking-widest uppercase text-white">
            Developer State Control
          </h3>
        </div>
        <span className="font-mono text-[8px] text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/25 px-1.5 py-0.5 rounded uppercase tracking-wider">
          Stage 2 Engine
        </span>
      </div>

      {/* Brain Mode Selection Toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
            Operational mode
          </span>
          <span className="text-[10px] text-gray-300 font-sans">
            {!isDemoMode ? "Live streaming request channel" : "Offline UI lifecycle mockup"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleDemoMode}
          className={`font-mono text-[9px] px-2.5 py-1 rounded border transition-all cursor-pointer ${
            !isDemoMode 
              ? 'bg-jarvis-cyan/10 text-jarvis-cyan border-jarvis-cyan/30 font-bold' 
              : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
          }`}
        >
          {!isDemoMode ? "● LIVE GEMINI" : "MOCK SIMULATION"}
        </button>
      </div>

      {/* Manual State Switches */}
      <div className="space-y-2">
        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">
          Manual Override Injectors
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {[
            { id: AssistantState.IDLE, label: 'IDLE', color: 'hover:border-white/25 border-white/10 text-gray-400 hover:text-white', activeClass: 'bg-white/10 border-white/30 text-white font-semibold' },
            { id: AssistantState.LISTENING, label: 'LISTEN', color: 'hover:border-jarvis-cyan/30 border-white/10 text-gray-400 hover:text-jarvis-cyan', activeClass: 'bg-jarvis-cyan/15 border-jarvis-cyan/35 text-jarvis-cyan font-semibold' },
            { id: AssistantState.THINKING, label: 'THINK', color: 'hover:border-jarvis-purple/30 border-white/10 text-gray-400 hover:text-jarvis-purple', activeClass: 'bg-jarvis-purple/15 border-jarvis-purple/35 text-jarvis-purple font-semibold' },
            { id: AssistantState.SPEAKING, label: 'SPEAK', color: 'hover:border-jarvis-blue/30 border-white/10 text-gray-400 hover:text-jarvis-blue', activeClass: 'bg-jarvis-blue/15 border-jarvis-blue/35 text-jarvis-blue font-semibold' },
            { id: AssistantState.ERROR, label: 'ERROR', color: 'hover:border-jarvis-red/30 border-white/10 text-gray-400 hover:text-jarvis-red', activeClass: 'bg-jarvis-red/15 border-jarvis-red/35 text-jarvis-red font-semibold' },
          ].map((item) => {
            const isActive = currentState === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onStateChange(item.id)}
                className={`text-[10px] font-mono py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                  isActive ? item.activeClass : item.color
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Automated loop tester */}
      <div className="space-y-2">
        <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">
          Automated Lifecycle Routines
        </span>
        <button
          type="button"
          onClick={onTriggerDemoSequence}
          disabled={currentState !== AssistantState.IDLE && currentState !== AssistantState.ERROR}
          className="w-full text-left p-3 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/15 border border-jarvis-cyan/20 hover:border-jarvis-cyan/30 flex items-center justify-between text-white transition-all group cursor-pointer disabled:opacity-40 disabled:hover:bg-jarvis-cyan/10 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <Play className="w-4 h-4 text-jarvis-cyan group-hover:scale-110 transition-transform" />
            <div className="text-left space-y-0.5">
              <div className="text-xs font-display font-medium">Trigger AI Dialogue Loop Simulation</div>
              <div className="text-[9px] text-gray-400 font-sans leading-none">IDLE → LISTEN → THINK → SPEAK → IDLE sequence</div>
            </div>
          </div>
          <RefreshCw className={`w-3.5 h-3.5 text-jarvis-cyan/60 ${currentState !== AssistantState.IDLE && currentState !== AssistantState.ERROR ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* State Transitions Log Monitor */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
            Central State Machine Logs
          </span>
          <span className="font-mono text-[8px] text-gray-500">
            {transitionHistory.length} EVENTS RECORDED
          </span>
        </div>
        <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-gray-400 h-28 overflow-y-auto space-y-1.5">
          {transitionHistory.length === 0 ? (
            <div className="text-gray-600 italic h-full flex items-center justify-center">
              Awaiting state transitions...
            </div>
          ) : (
            [...transitionHistory].reverse().map((entry, idx) => {
              const formattedTime = entry.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(entry.timestamp.getMilliseconds()).padStart(3, '0');
              
              let stateBadgeColor = 'text-gray-400';
              if (entry.state === AssistantState.LISTENING) stateBadgeColor = 'text-jarvis-cyan';
              if (entry.state === AssistantState.THINKING) stateBadgeColor = 'text-jarvis-purple';
              if (entry.state === AssistantState.SPEAKING) stateBadgeColor = 'text-jarvis-blue';
              if (entry.state === AssistantState.ERROR) stateBadgeColor = 'text-jarvis-red';

              return (
                <div key={idx} className="flex justify-between items-start border-b border-white/[0.02] pb-1 last:border-0">
                  <div className="flex gap-2">
                    <span className="text-gray-600">[{formattedTime}]</span>
                    <span>TRANSITION TO</span>
                    <span className={`${stateBadgeColor} font-bold`}>{entry.state}</span>
                  </div>
                  <span className="text-gray-600 text-[8px]">SYS_EVENT</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
