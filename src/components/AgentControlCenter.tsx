/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Square, CheckCircle2, Circle, AlertTriangle, 
  Settings, XCircle, RefreshCw, Sparkles, FastForward, Edit2, Check
} from 'lucide-react';
import { AgentPlan, AgentStep } from '../types';

interface AgentControlCenterProps {
  plan: AgentPlan;
  onApproveFullPlan: () => void;
  onExecuteStep: (idx: number) => void;
  onEditStep: (idx: number, updatedArgs: any) => void;
  onAIRecovery: (idx: number) => void;
  onSkipStep: (idx: number) => void;
  onCancelPlan: () => void;
}

export const AgentControlCenter: React.FC<AgentControlCenterProps> = ({
  plan,
  onApproveFullPlan,
  onExecuteStep,
  onEditStep,
  onAIRecovery,
  onSkipStep,
  onCancelPlan
}) => {
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editArgsString, setEditArgsString] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2.5 py-0.5 rounded-full">
            Planning
          </span>
        );
      case 'pending_approval':
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Operator Verification Required
          </span>
        );
      case 'executing':
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/25 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-jarvis-cyan" />
            Agent Executing...
          </span>
        );
      case 'completed':
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/25 px-2.5 py-0.5 rounded-full">
            Plan Completed
          </span>
        );
      case 'failed':
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-jarvis-red bg-jarvis-red/10 border border-jarvis-red/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Task Interrupted
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  const startEditing = (idx: number, step: AgentStep) => {
    setEditingStepIdx(idx);
    setEditArgsString(JSON.stringify(step.args, null, 2));
    setJsonError(null);
  };

  const saveEdit = (idx: number) => {
    try {
      const parsed = JSON.parse(editArgsString);
      onEditStep(idx, parsed);
      setEditingStepIdx(null);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`);
    }
  };

  return (
    <div id="agent-control-panel" className="p-5 rounded-2xl border border-white/5 bg-black/60 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-jarvis-cyan/5 blur-xl pointer-events-none" />

      {/* Panel Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="space-y-1">
          <span className="text-[8px] font-mono text-jarvis-cyan uppercase tracking-[0.2em] font-bold block">
            Controlled Agent Engine // STAGE 10
          </span>
          <h3 className="font-display font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-jarvis-cyan" />
            Active Automation Plan
          </h3>
        </div>
        <div>
          {getStatusBadge(plan.status)}
        </div>
      </div>

      {/* Task Description */}
      <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">Objective Context</span>
        <p className="text-[11px] text-gray-200 font-sans leading-relaxed italic">
          "{plan.task}"
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
        {plan.steps.map((step, idx) => {
          const isEditing = editingStepIdx === idx;
          const isFailed = step.status === 'failed';
          const isExecuting = step.status === 'executing';
          const isCompleted = step.status === 'completed';
          const isPendingApproval = step.status === 'pending' && step.permissionLevel !== 'SAFE' && plan.status === 'pending_approval';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`p-3.5 rounded-xl border transition-all ${
                isExecuting 
                  ? 'bg-jarvis-cyan/5 border-jarvis-cyan/25 shadow-[0_0_15px_rgba(0,240,255,0.05)]'
                  : isFailed
                  ? 'bg-jarvis-red/5 border-jarvis-red/20'
                  : isPendingApproval
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-white/[0.01] border-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="pt-0.5 shrink-0">
                  {isCompleted && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {isExecuting && (
                    <RefreshCw className="w-4 h-4 text-jarvis-cyan animate-spin" />
                  )}
                  {isFailed && (
                    <XCircle className="w-4 h-4 text-jarvis-red" />
                  )}
                  {step.status === 'pending' && step.permissionLevel !== 'SAFE' && (
                    <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                  )}
                  {step.status === 'pending' && step.permissionLevel === 'SAFE' && (
                    <Circle className="w-4 h-4 text-gray-500" />
                  )}
                </div>

                {/* Step Body */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/5 pb-1.5">
                    <span className="font-mono text-[10px] text-white font-semibold flex items-center gap-1.5">
                      <span>Step {idx + 1}:</span>
                      <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded font-bold text-gray-400 font-mono">
                        {step.toolName}
                      </span>
                    </span>
                    <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      step.permissionLevel === 'SAFE' 
                        ? 'text-green-400 bg-green-400/10' 
                        : step.permissionLevel === 'CONFIRMATION_REQUIRED'
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-jarvis-red bg-jarvis-red/10'
                    }`}>
                      {step.permissionLevel === 'SAFE' ? 'Safe Execution' : 'Requires Approval'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-300 leading-normal font-sans">
                    {step.description}
                  </p>

                  {/* Argument Inspector */}
                  {!isEditing ? (
                    <div className="space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] font-mono text-gray-500 uppercase tracking-widest">Arguments Block</span>
                        {plan.status === 'pending_approval' && (
                          <button
                            onClick={() => startEditing(idx, step)}
                            className="text-[8px] font-mono text-jarvis-cyan hover:text-white flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                            <span>Edit Plan</span>
                          </button>
                        )}
                      </div>
                      <pre className="text-[9px] font-mono text-gray-400 overflow-x-auto max-h-16">
                        {JSON.stringify(step.args, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2 p-2.5 bg-black/70 rounded-lg border border-jarvis-cyan/30">
                      <span className="text-[7px] font-mono text-jarvis-cyan uppercase tracking-widest block">Edit Step Arguments (JSON)</span>
                      <textarea
                        value={editArgsString}
                        onChange={(e) => setEditArgsString(e.target.value)}
                        className="w-full h-24 bg-black/80 text-[10px] font-mono text-gray-300 p-2 border border-white/10 rounded focus:outline-none focus:border-jarvis-cyan focus:ring-0"
                      />
                      {jsonError && <p className="text-[9px] font-mono text-jarvis-red">{jsonError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => saveEdit(idx)}
                          className="px-2.5 py-1 rounded bg-jarvis-cyan text-black font-mono text-[9px] font-semibold cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingStepIdx(null)}
                          className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-400 font-mono text-[9px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Task Recovery Actions if failed */}
                  {isFailed && (
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2 border-t border-white/5 mt-2">
                      <span className="text-[9px] font-mono text-jarvis-red font-bold uppercase tracking-wider block sm:inline-block">
                        Task Recovery Matrix:
                      </span>
                      <div className="flex gap-2 flex-1">
                        <button
                          type="button"
                          onClick={() => onAIRecovery(idx)}
                          className="flex-1 py-1 px-2.5 rounded bg-jarvis-cyan/15 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/35 text-jarvis-cyan text-[10px] font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 animate-pulse text-jarvis-cyan" />
                          AI Recovery
                        </button>
                        <button
                          type="button"
                          onClick={() => onExecuteStep(idx)}
                          className="flex-1 py-1 px-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry Step
                        </button>
                        <button
                          type="button"
                          onClick={() => onSkipStep(idx)}
                          className="flex-1 py-1 px-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-[10px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <FastForward className="w-3 h-3" />
                          Skip Step
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual Step Approval Checkpoint if paused for verification */}
                  {plan.status === 'pending_approval' && idx === plan.steps.findIndex(s => s.status === 'pending') && (
                    <div className="pt-2 mt-2 border-t border-white/5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onExecuteStep(idx)}
                        className="flex-1 py-1.5 px-3 rounded bg-amber-500 text-black font-semibold text-[10px] font-display transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Authorize Operator Action
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Global Plan Controls */}
      <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="text-[10px] text-gray-500">
          Operator verification loops configured. Action tiering fully guarded.
        </div>
        <div className="flex gap-2">
          {plan.status === 'pending_approval' && plan.steps.every(s => s.status === 'pending') && (
            <button
              type="button"
              onClick={onApproveFullPlan}
              className="py-2 px-4 rounded-xl bg-jarvis-cyan hover:bg-jarvis-cyan/90 text-black font-semibold text-[11px] font-display cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              AUTHORIZE EXECUTION PROTOCOL
            </button>
          )}

          {plan.status !== 'completed' && plan.status !== 'cancelled' && (
            <button
              type="button"
              onClick={onCancelPlan}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-jarvis-red transition-all cursor-pointer text-[10px]"
            >
              Cancel Run
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
