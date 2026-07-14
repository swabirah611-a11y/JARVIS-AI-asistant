/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Cpu, User, AlertTriangle, Sparkles, 
  Copy, Check, Square, Trash2, RefreshCw, Mic, MicOff,
  ExternalLink, Globe, CloudSun, Music, Youtube,
  Paperclip, Camera, X, Image, FileText, AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Message, AssistantState, AgentPlan } from '../types';
import { AgentControlCenter } from './AgentControlCenter';

// Custom tool response rendering widgets
const renderCustomToolWidget = (name: string, response: any) => {
  if (!response) return null;
  const data = response.result !== undefined ? response.result : response;
  if (!data) return null;

  if (name === "get_live_info" && data.weather) {
    const w = data.weather;
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-black/60 to-orange-950/20 border border-orange-500/15 space-y-3 font-sans mt-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider">Live Weather Report</span>
          <span className="text-[11px] font-medium text-gray-300">{w.location}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="space-y-1">
            <div className="text-2xl font-light font-display text-white">{w.tempF}°F <span className="text-gray-500 text-sm">/ {w.tempC}°C</span></div>
            <div className="text-[11px] text-orange-400 font-medium">{w.condition}</div>
          </div>
          <div className="text-[10px] space-y-1 text-gray-400">
            <div>Feels Like: <span className="text-white">{w.feelsLikeF}°F</span></div>
            <div>Humidity: <span className="text-white">{w.humidity}%</span></div>
            <div>Windspeed: <span className="text-white">{w.windspeedKmph} km/h</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (name === "youtube_search" && data.items) {
    const items = data.items.slice(0, 3);
    return (
      <div className="space-y-2.5 mt-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <span className="text-[10px] font-mono text-jarvis-red font-bold uppercase tracking-wider">YouTube Search Matches</span>
          <span className="text-[9px] text-gray-500">{data.items.length} matched</span>
        </div>
        <div className="space-y-2">
          {items.map((item: any, idx: number) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex gap-3 p-2 rounded-lg bg-black/50 border border-white/5 hover:border-jarvis-red/25 transition-all group"
            >
              <div className="w-20 h-12 rounded bg-gray-900 overflow-hidden shrink-0 border border-white/5 relative">
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" referrerPolicy="no-referrer" />
                <span className="absolute bottom-0.5 right-0.5 bg-black/85 text-[8px] px-1 rounded text-white font-mono">Video</span>
              </div>
              <div className="min-w-0 space-y-0.5 flex-1 justify-center flex flex-col">
                <h5 className="text-[10px] font-medium text-white truncate group-hover:text-jarvis-red transition-all">{item.title}</h5>
                <p className="text-[9px] text-gray-500 truncate">{item.snippet}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (name === "open_website" && data.url) {
    return (
      <div className="p-3.5 rounded-xl bg-jarvis-cyan/5 border border-jarvis-cyan/15 space-y-2.5 mt-2.5 font-sans">
        <p className="text-[10px] text-gray-400 leading-normal">
          JARVIS has prepared the safe link redirect. Click below to launch this website in a separate browser tab:
        </p>
        <a 
          href={data.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full py-2 px-3 text-center rounded-lg bg-jarvis-cyan hover:bg-jarvis-cyan/90 text-black font-semibold font-display text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.15)]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Launch Website
        </a>
      </div>
    );
  }

  if (name === "web_search" && data.results) {
    const results = data.results.slice(0, 3);
    return (
      <div className="space-y-2.5 mt-2.5 font-sans">
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <span className="text-[10px] font-mono text-jarvis-cyan font-bold uppercase tracking-wider">Search Results</span>
          <span className="text-[9px] text-gray-500">{data.results.length} found</span>
        </div>
        <div className="space-y-2">
          {results.map((item: any, idx: number) => (
            <a 
              key={idx} 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block p-2.5 rounded-lg bg-black/50 border border-white/5 hover:border-jarvis-cyan/25 transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <h5 className="text-[10px] font-medium text-white truncate group-hover:text-jarvis-cyan transition-all max-w-[80%]">{item.title}</h5>
                <span className="text-[8px] font-mono text-gray-600 truncate max-w-[20%]">{new URL(item.url).hostname}</span>
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed">{item.snippet}</p>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

interface ConversationAreaProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  assistantState: AssistantState;
  isDemoMode: boolean;
  onClearConversation: () => void;
  onStopGeneration: () => void;
  onRetryLastMessage: () => void;
  onStartListening: () => void;
  onStopSpeaking: () => void;
  onCommitListening: () => void;
  interimTranscript: string;
  onApproveTool?: (messageId: string, toolCall: any) => void;
  onDenyTool?: (messageId: string, toolCall: any) => void;

  // Stage 10 New Props
  isAgentMode: boolean;
  onToggleAgentMode: () => void;
  activeAgentPlan: AgentPlan | null;
  onApproveFullPlan: () => void;
  onExecuteStep: (idx: number) => void;
  onEditStep: (idx: number, updatedArgs: any) => void;
  onAIRecovery: (idx: number) => void;
  onSkipStep: (idx: number) => void;
  onCancelPlan: () => void;

  isCameraActive: boolean;
  onToggleCamera: () => void;
  attachedImage: string | null;
  onSetAttachedImage: (img: string | null) => void;
  attachedDoc: { name: string; content: string } | null;
  onSetAttachedDoc: (doc: { name: string; content: string } | null) => void;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  messages,
  onSendMessage,
  assistantState,
  isDemoMode,
  onClearConversation,
  onStopGeneration,
  onRetryLastMessage,
  onStartListening,
  onStopSpeaking,
  onCommitListening,
  interimTranscript,
  onApproveTool,
  onDenyTool,

  isAgentMode,
  onToggleAgentMode,
  activeAgentPlan,
  onApproveFullPlan,
  onExecuteStep,
  onEditStep,
  onAIRecovery,
  onSkipStep,
  onCancelPlan,

  isCameraActive,
  onToggleCamera,
  attachedImage,
  onSetAttachedImage,
  attachedDoc,
  onSetAttachedDoc
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Auto-scrolling conversation history
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Video track binder for live camera vision
  useEffect(() => {
    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setLocalStream(stream);
        })
        .catch(err => {
          console.error("[Camera Permission Refused]", err);
          onToggleCamera();
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
      }
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCameraActive]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        onSetAttachedImage(dataUrl);
      }
      onToggleCamera(); // Turn off camera immediately after capturing!
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        onSetAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        onSetAttachedDoc({
          name: file.name,
          content: reader.result as string
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !attachedImage && !attachedDoc) return;
    
    // Send message real
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleCopyText = (text: string, id: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error("Failed to copy text:", err);
    });
  };

  const isGenerating = assistantState === AssistantState.THINKING || assistantState === AssistantState.SPEAKING;

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl">
      {/* Area Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isAgentMode ? 'bg-jarvis-cyan animate-pulse' : 'bg-jarvis-blue'}`} />
          <div className="flex flex-col">
            <h2 className="font-display font-medium text-xs tracking-widest text-white uppercase">
              {isAgentMode ? "Agent Command Console" : "Communication Terminal"}
            </h2>
            <span className="text-[7px] font-mono text-gray-500 uppercase tracking-wider">
              {isAgentMode ? "STAGE_10 // COGNITIVE_AGENT_ACTIVE" : "STAGE_9 // STANDARD_CONVERSATION"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Quick toggle Agent mode inside chat itself! */}
          <button
            type="button"
            onClick={onToggleAgentMode}
            className={`text-[9px] font-mono border px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
              isAgentMode 
                ? 'text-jarvis-cyan border-jarvis-cyan/35 bg-jarvis-cyan/10 font-bold' 
                : 'text-gray-400 border-white/5 bg-white/[0.02] hover:text-white'
            }`}
            title="Toggle autonomous planning loops"
          >
            <span>Agent Mode</span>
            {isAgentMode ? <ToggleRight className="w-4 h-4 text-jarvis-cyan" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
          </button>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={onClearConversation}
              className="text-[9px] font-mono text-gray-400 hover:text-jarvis-red border border-white/5 hover:border-jarvis-red/25 bg-white/[0.02] hover:bg-jarvis-red/5 px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
              title="Reset core memory and greetings"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Agent Plan HUD at the top of chat log */}
      {activeAgentPlan && (
        <div className="px-6 py-4 border-b border-white/10 bg-black/70 max-h-[300px] overflow-y-auto shrink-0">
          <AgentControlCenter
            plan={activeAgentPlan}
            onApproveFullPlan={onApproveFullPlan}
            onExecuteStep={onExecuteStep}
            onEditStep={onEditStep}
            onAIRecovery={onAIRecovery}
            onSkipStep={onSkipStep}
            onCancelPlan={onCancelPlan}
          />
        </div>
      )}

      {/* Messages List / Main Flow */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[250px]">
        
        {/* Live Active Camera visor */}
        <AnimatePresence>
          {isCameraActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 border border-jarvis-cyan/30 rounded-xl bg-black/80 space-y-3 relative overflow-hidden max-w-sm mx-auto shadow-2xl"
            >
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-[10px] font-mono text-jarvis-cyan font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-jarvis-cyan animate-ping shrink-0" />
                  JARVIS VISION SENSOR ACTIVE
                </span>
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-white/5 bg-black h-48 flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
                
                {/* Iron man target reticle */}
                <div className="absolute inset-x-8 inset-y-6 border border-jarvis-cyan/15 rounded pointer-events-none flex items-center justify-center">
                  <div className="w-3 h-3 border-t-2 border-l-2 border-jarvis-cyan/40 absolute top-0 left-0" />
                  <div className="w-3 h-3 border-t-2 border-r-2 border-jarvis-cyan/40 absolute top-0 right-0" />
                  <div className="w-3 h-3 border-b-2 border-l-2 border-jarvis-cyan/40 absolute bottom-0 left-0" />
                  <div className="w-3 h-3 border-b-2 border-r-2 border-jarvis-cyan/40 absolute bottom-0 right-0" />
                </div>
              </div>

              <button
                type="button"
                onClick={capturePhoto}
                className="w-full py-2 rounded-lg bg-jarvis-cyan text-black font-semibold text-[11px] font-mono tracking-wider hover:bg-jarvis-cyan/90 transition-colors cursor-pointer"
              >
                SNAP CONTEXT PHOTO
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-500 shadow-inner">
                <Cpu className="w-6 h-6 text-jarvis-cyan animate-pulse" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="font-display text-base font-medium text-white tracking-wide">
                  Systems Standing By
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  The active AI brain layer is online. Send a command, ask a query, attach high-fidelity documentation, or capture vision.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg) => {
              const isJarvis = msg.sender === 'jarvis';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex ${isJarvis ? 'justify-start' : 'justify-end'} w-full`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${isJarvis ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Avatar indicators */}
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-md ${
                      isJarvis 
                        ? 'bg-jarvis-slate-900 border-jarvis-cyan/25 text-jarvis-cyan' 
                        : 'bg-jarvis-slate-800 border-white/10 text-gray-300'
                    }`}>
                      {isJarvis ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Text block */}
                    <div className="space-y-1">
                      <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed font-sans ${
                        isJarvis 
                          ? 'bg-white/[0.03] border border-white/5 text-gray-200' 
                          : 'bg-jarvis-cyan/10 border border-jarvis-cyan/20 text-white shadow-lg'
                      }`}>
                        {isJarvis ? (
                          <div className="markdown-body">
                            <Markdown>{msg.text || '...'}</Markdown>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p>{msg.text}</p>
                            
                            {/* Multimodal Attachments display on sent messages */}
                            {msg.imageAttached && (
                              <div className="max-w-[200px] rounded-lg overflow-hidden border border-white/10 relative">
                                <img src={msg.imageAttached} alt="Attached context" className="w-full object-cover max-h-36" />
                                <span className="absolute bottom-1 right-1 px-1 text-[7px] font-mono bg-black/80 rounded text-jarvis-cyan uppercase">Sight contextualizer</span>
                              </div>
                            )}

                            {msg.docAttached && (
                              <div className="flex items-center gap-2 p-2 rounded bg-black/30 border border-white/5 font-mono text-[9px] text-gray-300">
                                <FileText className="w-3.5 h-3.5 text-jarvis-cyan shrink-0" />
                                <span className="truncate">{msg.docAttached.name}</span>
                                <span className="text-[7px] text-gray-500 uppercase shrink-0">Attached</span>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.toolCall && (
                          <div className="mt-2.5 p-4 rounded-xl bg-black/40 border border-white/15 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <div className="p-1.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-display font-medium text-xs text-white">
                                  System Permission Required
                                </h4>
                                <p className="text-[10px] text-gray-400 leading-normal">
                                  {msg.toolCall.description || `JARVIS is requesting authorization to execute the tool.`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-black/60 rounded-lg border border-white/5 space-y-1.5 font-mono text-[10px]">
                              <div className="flex justify-between text-gray-400">
                                <span>TOOL NAME</span>
                                <span className="text-jarvis-cyan font-bold">{msg.toolCall.name}</span>
                              </div>
                              <div className="flex justify-between text-gray-400">
                                <span>PERMISSION TIER</span>
                                <span className="text-amber-400 font-bold">{msg.toolCall.permissionLevel}</span>
                              </div>
                              <div className="pt-1.5 border-t border-white/5 space-y-1">
                                <span className="text-gray-500 block uppercase text-[8px] tracking-wider">PARAMETERS</span>
                                <pre className="text-gray-300 overflow-x-auto max-h-24 p-1 rounded bg-black/20 text-[9px]">
                                  {JSON.stringify(msg.toolCall.args, null, 2)}
                                </pre>
                              </div>
                            </div>

                            {msg.toolStatus === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => onApproveTool?.(msg.id, msg.toolCall)}
                                  className="flex-1 py-2 rounded bg-jarvis-cyan hover:bg-jarvis-cyan/90 text-black font-display font-medium text-[11px] transition-colors cursor-pointer text-center"
                                >
                                  Authorize Execution
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDenyTool?.(msg.id, msg.toolCall)}
                                  className="flex-1 py-2 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-gray-300 font-display text-[11px] transition-colors cursor-pointer text-center"
                                >
                                  Deny Request
                                </button>
                              </div>
                            )}

                            {msg.toolStatus === 'approved' && (
                              <div className="text-[10px] text-jarvis-cyan font-mono animate-pulse">
                                [AUTHORIZATION GRANTED. EXECUTING PROTOCOL...]
                              </div>
                            )}
                            {msg.toolStatus === 'denied' && (
                              <div className="text-[10px] text-jarvis-red font-mono">
                                [ACCESS DENIED BY OPERATOR]
                              </div>
                            )}
                            {msg.toolStatus === 'executed' && (
                              <div className="text-[10px] text-green-400 font-mono">
                                [EXECUTION COMPLETE. RESULTS RETURNED]
                              </div>
                            )}

                            {msg.toolStatus === 'executed' && msg.toolResponse && (
                              <div className="mt-2 pt-2 border-t border-white/5">
                                {renderCustomToolWidget(msg.toolCall.name, msg.toolResponse)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Technical metadata footer */}
                      <div className={`flex items-center gap-3 text-[8px] font-mono text-gray-500 uppercase px-1 ${
                        isJarvis ? 'justify-start' : 'justify-end'
                      }`}>
                        <span>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {isJarvis && msg.stateContext && (
                          <>
                            <span>•</span>
                            <span className="text-jarvis-cyan">ctx:{msg.stateContext.toLowerCase()}</span>
                          </>
                        )}
                        {isJarvis && msg.text && (
                          <>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="hover:text-jarvis-cyan transition-colors cursor-pointer flex items-center gap-0.5 normal-case border-none bg-transparent"
                              title="Copy response to clipboard"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-green-400 shrink-0" />
                                  <span className="text-green-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5 shrink-0" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Typing process indicator */}
        {assistantState === AssistantState.THINKING && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start w-full"
          >
            <div className="flex gap-3 max-w-[80%] items-center pl-1">
              <div className="w-8 h-8 rounded-full bg-jarvis-slate-900 border border-jarvis-purple/20 text-jarvis-purple flex items-center justify-center animate-spin-slow">
                <Cpu className="w-4 h-4" />
              </div>
              <div className="flex space-x-1 items-center bg-white/[0.01] border border-white/5 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 bg-jarvis-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-jarvis-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-jarvis-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Retry module */}
      {assistantState === AssistantState.ERROR && (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-jarvis-red/10 border border-jarvis-red/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-jarvis-red font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0 text-jarvis-red" />
            <span>Cognitive request failed. Check settings and API key connectivity.</span>
          </div>
          <button
            type="button"
            onClick={onRetryLastMessage}
            className="text-[10px] font-mono text-jarvis-cyan bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/25 px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0 border-none"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Input Form area */}
      <div className="p-4 border-t border-white/5 bg-black/50 shrink-0 space-y-3">
        
        {/* Active attachment thumbnails panel */}
        {(attachedImage || attachedDoc) && (
          <div className="flex flex-wrap gap-3 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
            {attachedImage && (
              <div className="relative w-16 h-16 rounded overflow-hidden border border-jarvis-cyan/25 bg-black group shadow-lg">
                <img src={attachedImage} alt="Thumbnail preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onSetAttachedImage(null)}
                  className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/70 hover:bg-jarvis-red/90 text-white transition-all cursor-pointer border-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {attachedDoc && (
              <div className="relative p-2.5 bg-black/40 border border-white/10 rounded-lg flex items-center gap-2 max-w-xs text-gray-300">
                <FileText className="w-4 h-4 text-jarvis-cyan" />
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-[10px] font-mono font-medium truncate">{attachedDoc.name}</span>
                  <span className="text-[8px] text-gray-500 uppercase">Text Document Attached</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSetAttachedDoc(null)}
                  className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-jarvis-red text-gray-500 hover:text-white border-none bg-transparent cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Floating Captions / Live Interim Transcript */}
        <AnimatePresence>
          {interimTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.98 }}
              className="p-3 rounded-xl bg-jarvis-cyan/5 border border-jarvis-cyan/15 flex items-center justify-between gap-3 text-xs text-jarvis-cyan font-sans shadow-lg shadow-black/40"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-2 h-2 rounded-full bg-jarvis-cyan animate-ping shrink-0" />
                <span className="italic truncate font-medium">"{interimTranscript}"</span>
              </div>
              <span className="font-mono text-[8px] text-jarvis-cyan/60 uppercase tracking-widest shrink-0 select-none bg-jarvis-cyan/10 px-1.5 py-0.5 rounded border border-jarvis-cyan/20">
                LIVE TRANSLATION
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          
          {/* File upload prompt trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04] bg-white/[0.01] transition-all cursor-pointer shrink-0"
            title="Attach high-context file or image"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.txt,.md,.json"
            onChange={handleFileChange}
          />

          {/* Camera prompt trigger */}
          <button
            type="button"
            onClick={onToggleCamera}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isCameraActive 
                ? 'bg-jarvis-cyan/20 border-jarvis-cyan/40 text-jarvis-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)] animate-pulse'
                : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.04] bg-white/[0.01]'
            }`}
            title="Activate direct camera context parser"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Voice Mic Trigger */}
          <button
            type="button"
            onClick={() => {
              if (assistantState === AssistantState.IDLE) {
                onStartListening();
              } else if (assistantState === AssistantState.LISTENING) {
                onCommitListening();
              } else if (assistantState === AssistantState.SPEAKING) {
                onStopSpeaking();
              }
            }}
            className={`p-3.5 rounded-xl border flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 ${
              assistantState === AssistantState.LISTENING
                ? 'bg-jarvis-cyan/20 border-jarvis-cyan/40 text-jarvis-cyan shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                : assistantState === AssistantState.SPEAKING
                ? 'bg-jarvis-blue/20 border-jarvis-blue/40 text-jarvis-blue hover:bg-jarvis-blue/30'
                : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {assistantState === AssistantState.LISTENING ? (
              <Mic className="w-4 h-4 animate-bounce text-jarvis-cyan" />
            ) : assistantState === AssistantState.SPEAKING ? (
              <MicOff className="w-4 h-4 text-jarvis-blue animate-pulse" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isGenerating}
              placeholder={
                isAgentMode
                  ? "Enter a multi-step mission statement for planning..."
                  : "Send an operational command or query to JARVIS..."
              }
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-jarvis-cyan/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans"
            />
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="absolute right-2 p-2 rounded-lg bg-jarvis-red/15 hover:bg-jarvis-red/25 border border-jarvis-red/30 text-jarvis-red transition-all cursor-pointer border-none"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!inputValue.trim() && !attachedImage && !attachedDoc) || assistantState === AssistantState.LISTENING}
                className="absolute right-2 p-2 rounded-lg bg-jarvis-cyan/15 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed border-none"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Quick status footer */}
        <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 px-1 select-none">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-jarvis-cyan animate-pulse" />
            <span>JARVIS Multimodal Intelligence: Document parsing, Camera sight and Voice enabled</span>
          </div>
          <span>v10.0.0-STAGE_10</span>
        </div>
      </div>
    </div>
  );
};
