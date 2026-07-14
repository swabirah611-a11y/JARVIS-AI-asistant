/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Database, PocketKnife, TrendingUp, Cpu, Lock, HelpCircle } from 'lucide-react';
import { ActiveTab } from '../types';

interface ModulePlaceholderProps {
  tab: ActiveTab;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({ tab }) => {
  const getTabDetails = () => {
    switch (tab) {
      case 'memory':
        return {
          title: 'Memory Database',
          subtitle: 'STAGE 2 ARCHITECTURE',
          icon: Database,
          description: 'Long-term semantic vector database designed to let JARVIS maintain context across conversations, learn user preferences, and recall specific instructions.',
          details: [
            { label: 'Primary Store', value: 'Firebase Firestore (Vector Search)' },
            { label: 'Embedding Model', value: 'text-embedding-004' },
            { label: 'Context Windows', value: 'Up to 1M items' },
            { label: 'Privacy System', value: 'End-to-End Client Encrypted' },
          ],
        };
      case 'tools':
        return {
          title: 'Tool Orchestrator',
          subtitle: 'STAGE 3 ARCHITECTURE',
          icon: PocketKnife,
          description: 'Function calling and agentic capabilities enabling JARVIS to execute actions locally and via cloud integrations. Extensible JSON-RPC scheme for plugin modules.',
          details: [
            { label: 'Platform SDK', value: 'Node.js Sandbox Execution' },
            { label: 'Core Capabilities', value: 'Filesystem, Terminal, Google Search' },
            { label: 'Auth Scheme', value: 'Secure Local Keychain / OAuth' },
            { label: 'Model Grounding', value: 'Google GenAI Function Declarations' },
          ],
        };
      case 'activity':
        return {
          title: 'Activity & Telemetry Log',
          subtitle: 'STAGE 2 TELEMETRY',
          icon: TrendingUp,
          description: 'Comprehensive historical view of all processed inputs, system latencies, API quotas, and execution loops. Visual diagnostics built around client performance.',
          details: [
            { label: 'Logging Core', value: 'Winston-compatible Client Reporter' },
            { label: 'Analytics Engine', value: 'D3 Time-series Visualizations' },
            { label: 'Storage Method', value: 'Local IndexedDB with Cloud Sync' },
            { label: 'Diagnostic Verbosity', value: 'Debug / Info / Warn / Error' },
          ],
        };
      default:
        return {
          title: 'System Component',
          subtitle: 'FUTURE UPGRADE',
          icon: HelpCircle,
          description: 'Additional capabilities to be provisioned in future developmental cycles.',
          details: [],
        };
    }
  };

  const details = getTabDetails();
  const IconComponent = details.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto border border-white/5 shadow-2xl relative overflow-hidden"
    >
      {/* Visual background grids */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.02)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />

      {/* Futuristic module shield icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-white/[0.01] border border-white/10 flex items-center justify-center text-gray-500 shadow-inner relative">
          <IconComponent className="w-8 h-8 text-jarvis-cyan/80" />
          
          {/* Lock icon overlay to denote pending stage */}
          <div className="absolute -bottom-1 -right-1 bg-jarvis-slate-950 border border-white/10 text-jarvis-cyan p-1.5 rounded-full">
            <Lock className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-8">
        <span className="font-mono text-[9px] tracking-[0.3em] text-jarvis-cyan font-bold uppercase block">
          {details.subtitle}
        </span>
        <h2 className="font-display text-xl font-medium text-white tracking-wide">
          {details.title}
        </h2>
        <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed font-sans">
          {details.description}
        </p>
      </div>

      {/* Target Technical Specifications Table */}
      <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-xl p-4 text-left space-y-3">
        <div className="border-b border-white/5 pb-2">
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">
            Target Service Blueprint
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {details.details.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <span className="font-mono text-[9px] text-gray-500 uppercase block">{item.label}</span>
              <span className="text-xs text-gray-200 font-sans font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module placeholder notice */}
      <div className="mt-8 flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-full text-[10px] font-mono text-gray-500">
        <Cpu className="w-3.5 h-3.5 text-jarvis-cyan" />
        <span>Integration blueprints verified. Pending Stage 2 activation code.</span>
      </div>
    </motion.div>
  );
};
