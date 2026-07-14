/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  PocketKnife, Shield, ShieldCheck, ShieldAlert, 
  Terminal, Sparkles, Server, Code, Wifi, WifiOff, Cpu, RefreshCw
} from 'lucide-react';

export type CapabilityStatus = 'AVAILABLE' | 'DISCONNECTED' | 'CONFIGURATION REQUIRED' | 'UNSUPPORTED';

interface ToolDefinition {
  name: string;
  description: string;
  permissionLevel: 'SAFE' | 'CONFIRMATION_REQUIRED' | 'RESTRICTED';
  status: CapabilityStatus;
  statusReason?: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

interface ToolsPanelProps {
  isAgentMode: boolean;
  onToggleAgentMode: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  isAgentMode,
  onToggleAgentMode
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Comprehensive Stage 10 real register of backend-enabled tools and status
  const tools: ToolDefinition[] = [
    {
      name: 'get_application_status',
      description: 'Retrieve real-time health statistics, system telemetry, and CPU load profiles for the local Node.js environment.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'get_application_settings',
      description: 'Fetch the active system-wide configuration files and UI customization matrices for the JARVIS framework.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'search_stored_memories',
      description: 'Query the long-term recollection database with semantic matches or raw term matching.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The search query or filter term to query the database with.'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'manage_memory',
      description: 'Perform safe write and delete updates inside the long-term cognitive database.',
      permissionLevel: 'CONFIRMATION_REQUIRED',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'The operation type to perform.',
            enum: ['add', 'delete', 'clear']
          },
          text: {
            type: 'STRING',
            description: 'The memory string content to append. Required for action add.'
          },
          id: {
            type: 'STRING',
            description: 'The target database index key. Required for action delete.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'web_search',
      description: 'Perform a web search for current events, news, and live information from legitimate online sources.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'The descriptive search query.'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_live_info',
      description: 'Get real-time live information like weather conditions, stock metrics, or localized time.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          info_type: {
            type: 'STRING',
            description: 'The type of info requested.',
            enum: ['weather', 'time', 'stocks']
          },
          location: {
            type: 'STRING',
            description: 'Location or stock ticker to inspect.'
          }
        },
        required: ['info_type']
      }
    },
    {
      name: 'spotify_search',
      description: 'Search for tracks, albums, or playlists on Spotify. Requires active user context.',
      permissionLevel: 'SAFE',
      status: 'DISCONNECTED',
      statusReason: 'Requires Spotify API OAuth Client registration.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'Track name, artist, or music keyword.'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'spotify_control',
      description: 'Send playback commands to Spotify (play, pause, skip, adjust volume).',
      permissionLevel: 'SAFE',
      status: 'DISCONNECTED',
      statusReason: 'Requires active Spotify OAuth Token authorization.',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'Control instruction.',
            enum: ['play', 'pause', 'skip_forward', 'volume']
          },
          value: {
            type: 'STRING',
            description: 'Volume level or track ID if applicable.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'spotify_get_currently_playing',
      description: 'Retrieve real-time player states and metadata of currently playing track.',
      permissionLevel: 'SAFE',
      status: 'DISCONNECTED',
      statusReason: 'Requires active player session.',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'youtube_search',
      description: 'Fetch related video links and dynamic visual clips matching media keywords.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: {
            type: 'STRING',
            description: 'Video search keywords.'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'launch_application',
      description: 'Safely execute local binaries, productivity suites, or development workspaces on host system.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          app_name: {
            type: 'STRING',
            description: 'Name of the productivity app (e.g., Code, Figma, Slack).'
          }
        },
        required: ['app_name']
      }
    },
    {
      name: 'open_website',
      description: "Directly launch a web URL inside the operator's primary browser window.",
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          url: {
            type: 'STRING',
            description: 'The URL to navigate to.'
          }
        },
        required: ['url']
      }
    },
    {
      name: 'manage_projects',
      description: 'Administer, create, view, or delete ongoing creative projects in the project database.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'Database operation.',
            enum: ['create', 'list', 'update', 'delete']
          },
          name: {
            type: 'STRING',
            description: 'Project title.'
          },
          notes: {
            type: 'STRING',
            description: 'Project details and parameters.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_tasks',
      description: 'Register, complete, delete, or list task dependencies assigned to active projects.',
      permissionLevel: 'CONFIRMATION_REQUIRED',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'Action subroutine.',
            enum: ['create', 'list', 'update', 'delete']
          },
          title: {
            type: 'STRING',
            description: 'Task item title.'
          },
          priority: {
            type: 'STRING',
            description: 'Task importance rating.',
            enum: ['low', 'medium', 'high']
          },
          taskId: {
            type: 'STRING',
            description: 'Target task id for update or delete operations.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_reminders',
      description: 'Register voice reminders or alerts scheduled to trigger in future cycles.',
      permissionLevel: 'CONFIRMATION_REQUIRED',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'Operation.',
            enum: ['create', 'list', 'delete']
          },
          title: {
            type: 'STRING',
            description: 'Reminder note.'
          },
          time: {
            type: 'STRING',
            description: 'ISO timestamp or verbal description of scheduled timing.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'manage_calendar',
      description: 'Create, fetch, or delete events mapped inside the operator calendar schedules.',
      permissionLevel: 'CONFIRMATION_REQUIRED',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {
          action: {
            type: 'STRING',
            description: 'Subroutine.',
            enum: ['create', 'list', 'delete']
          },
          title: {
            type: 'STRING',
            description: 'Calendar event name.'
          },
          location: {
            type: 'STRING',
            description: 'Physical or virtual location.'
          }
        },
        required: ['action']
      }
    },
    {
      name: 'get_daily_briefing',
      description: 'Aggregate weather forecasts, overdue tasks, calendar logs, and reminders into a daily briefing.',
      permissionLevel: 'SAFE',
      status: 'AVAILABLE',
      parameters: {
        type: 'OBJECT',
        properties: {}
      }
    },
    {
      name: 'execute_restricted_command',
      description: 'Perform terminal operations or direct host-level shell script executions.',
      permissionLevel: 'RESTRICTED',
      status: 'UNSUPPORTED',
      statusReason: 'Security Sandbox Policy forbids model-initiated raw bash executions.',
      parameters: {
        type: 'OBJECT',
        properties: {
          command: {
            type: 'STRING',
            description: 'The shell script command to run.'
          }
        },
        required: ['command']
      }
    }
  ];

  const getPermissionBadge = (level: string) => {
    switch (level) {
      case 'SAFE':
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">
            <ShieldCheck className="w-3 h-3 text-green-400" />
            <span>Tier: Safe</span>
          </span>
        );
      case 'CONFIRMATION_REQUIRED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
            <Shield className="w-3 h-3 text-amber-400" />
            <span>Tier: Request Confirmation</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-jarvis-red bg-jarvis-red/10 border border-jarvis-red/20 px-2 py-0.5 rounded font-bold uppercase animate-pulse">
            <ShieldAlert className="w-3 h-3 text-jarvis-red" />
            <span>Tier: Restricted</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: CapabilityStatus, reason?: string) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/20 px-2 py-0.5 rounded font-bold" title="Fully active and configured on backend host">
            <Wifi className="w-3 h-3" />
            <span>AVAILABLE</span>
          </span>
        );
      case 'DISCONNECTED':
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold" title={reason || "API client not bound"}>
            <WifiOff className="w-3 h-3" />
            <span>DISCONNECTED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[8px] font-mono text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-bold" title={reason || "Blocked by design security"}>
            <Cpu className="w-3 h-3" />
            <span>UNSUPPORTED</span>
          </span>
        );
    }
  };

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-[500px]"
    >
      {/* Left panel info column */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        
        {/* Agent Control Station Toggle */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-black/50 shadow-lg relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-jarvis-cyan/5 blur-xl pointer-events-none" />
          
          <div className="space-y-1">
            <span className="font-mono text-[8px] text-jarvis-cyan uppercase tracking-[0.25em] font-bold block">
              Agent Control Station
            </span>
            <h3 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-jarvis-cyan animate-pulse-subtle" />
              Controlled Agent Mode
            </h3>
          </div>

          <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
            Toggle final Stage 10 multi-step planning. When enabled, JARVIS breaks down high-level requests into ordered tool runs. Every tool carrying side-effects remains strictly gated by operator authorization checks.
          </p>

          <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
            <span className="font-mono text-[10px] text-white font-bold uppercase">
              AGENT STATE: {isAgentMode ? "ENGAGED" : "OFFLINE"}
            </span>
            
            <button
              onClick={onToggleAgentMode}
              className={`w-12 h-6 rounded-full p-1 transition-all relative outline-none cursor-pointer ${
                isAgentMode ? 'bg-jarvis-cyan' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transform transition-all ${
                  isAgentMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Co-processor Shell info */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest block">
            Co-processor Shell Architecture
          </span>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-jarvis-purple/10 text-jarvis-purple border border-jarvis-purple/15 shrink-0">
              <PocketKnife className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-medium text-xs text-white uppercase tracking-wider">
                Multimodal Capabilities
              </h3>
              <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                Stage 10 integrates document parse buffers, image base64 pipelines, and camera stream captures directly into the conversation payload, providing true sight context to the Gemini engine.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 space-y-2 text-[10px] text-gray-400 leading-normal font-sans">
            <div className="flex justify-between">
              <span className="text-gray-500">Execution Shell:</span>
              <span className="font-mono text-gray-200">Express / Server Sandbox</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total System Tools:</span>
              <span className="font-mono text-jarvis-cyan font-bold">{tools.length} Registered</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Available Cap:</span>
              <span className="font-mono text-green-400 font-bold">{tools.filter(t => t.status === 'AVAILABLE').length} Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Blocked Cap:</span>
              <span className="font-mono text-jarvis-red font-bold">{tools.filter(t => t.status === 'UNSUPPORTED').length} Sandboxed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right registry list column */}
      <div className="lg:col-span-8 flex flex-col h-full glass-panel rounded-2xl border border-white/5 bg-black/30 overflow-hidden">
        {/* Header bar with Search */}
        <div className="px-5 py-4 border-b border-white/5 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-jarvis-cyan" />
            <h2 className="font-display font-medium text-xs tracking-widest text-white uppercase">
              Capability Registry
            </h2>
          </div>
          <div>
            <input
              type="text"
              placeholder="Search capabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs text-white border border-white/10 rounded-lg focus:outline-none focus:border-jarvis-cyan focus:ring-0 w-full sm:w-52"
            />
          </div>
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
          {filteredTools.map((t) => (
            <div
              key={t.name}
              className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3 hover:border-white/10 transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full group-hover:animate-ping ${
                    t.status === 'AVAILABLE' ? 'bg-jarvis-cyan' : t.status === 'DISCONNECTED' ? 'bg-amber-400' : 'bg-gray-500'
                  }`} />
                  <span className="font-mono text-xs font-bold text-white group-hover:text-jarvis-cyan transition-colors">
                    {t.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(t.status, t.statusReason)}
                  {getPermissionBadge(t.permissionLevel)}
                </div>
              </div>

              <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                {t.description}
              </p>

              {t.statusReason && (
                <div className="text-[10px] text-amber-400 font-mono italic">
                  * Note: {t.statusReason}
                </div>
              )}

              {/* JSON Parameters Visualizer */}
              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-[8px] text-gray-500 uppercase tracking-widest block">
                  Expected JSON Schema Parameters
                </span>
                <pre className="p-3 rounded-lg bg-black/35 border border-white/5 text-[9px] font-mono text-gray-400 overflow-x-auto max-h-36">
                  {JSON.stringify(t.parameters, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] font-mono text-gray-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-jarvis-cyan" />
            <span>Telemetry pipeline validated. 18 subroutines registered.</span>
          </div>
          <span>Schema Type: OpenAPI-JsonSchemav4</span>
        </div>
      </div>
    </motion.div>
  );
};
