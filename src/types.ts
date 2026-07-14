/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centered state model for JARVIS.
 * Transitions: IDLE -> LISTENING -> THINKING -> SPEAKING -> IDLE
 * Also supports ERROR -> IDLE
 */
export enum AssistantState {
  STANDBY = 'STANDBY',
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

/**
 * Top level navigation modules in the shell
 */
export type ActiveTab = 'assistant' | 'context' | 'memory' | 'tools' | 'projects' | 'workflows' | 'integrations' | 'activity' | 'settings' | 'diagnostics';

/**
 * Conversation Message Interface
 */
export interface Message {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: Date;
  stateContext?: AssistantState;
  toolCall?: {
    id: string;
    name: string;
    args: any;
    permissionLevel: 'SAFE' | 'CONFIRMATION_REQUIRED' | 'RESTRICTED';
    description: string;
  };
  toolResponse?: any;
  toolStatus?: 'pending' | 'approved' | 'denied' | 'executed' | 'error';
  imageAttached?: string; // Base64 image URL (data:image/png;base64,...)
  docAttached?: { name: string; content: string }; // Attached document metadata and content
}

/**
 * Future System/Service interfaces (Placeholders for architecture boundaries)
 */
export interface AIServiceConfig {
  modelName: string;
  temperature: number;
  systemInstruction: string;
}

export interface VoiceServiceConfig {
  voiceId: string;
  rate: number;
  pitch: number;
  alwaysListening: boolean;
  volume: number; // Range: 0.0 to 1.0
  inputLanguage: string; // e.g., 'en-US'
  outputLanguage: string; // e.g., 'en-US'
  voiceActivation: boolean; // Trigger response automatically via voice
  pushToTalk: boolean; // Require click/hold to speak
  conversationTimeout: number; // Seconds of silence before auto-commit (e.g. 3)
  wakeWordEnabled: boolean;
  wakePhrase: string; // e.g., 'Hey JARVIS'
  wakeSensitivity: number; // 0 to 100
  followUpEnabled: boolean;
  returnToStandbyTimeout: number; // seconds of no voice before return to STANDBY
  interruptionEnabled: boolean; // allow user speech to interrupt JARVIS
}

export interface MemoryServiceConfig {
  shortTermLimit: number;
  longTermEnabled: boolean;
  semanticSearch: boolean;
}

export interface SettingsState {
  ai: AIServiceConfig;
  voice: VoiceServiceConfig;
  memory: MemoryServiceConfig;
  appearance: {
    theme: 'dark-cinematic' | 'dark-pure';
    accentColor: string;
    reducedMotion: boolean;
  };
  microphone: {
    deviceId: string;
    gain: number;
    noiseSuppression: boolean;
    speakerId: string;
    echoCancellation: boolean;
  };
  privacy: {
    storeLogs: boolean;
    encryptedMemory: boolean;
  };
  desktop: {
    desktopModeActive: boolean;
    launchOnStartup: boolean;
    minimizeToTray: boolean;
    globalShortcut: string; // e.g. 'Ctrl+Space'
    globalShortcutEnabled: boolean;
    notificationsEnabled: boolean;
  };
  clipboard: {
    allowRead: boolean;
    autoSummarize: boolean;
  };
  screen: {
    allowCapture: boolean;
    activeIndicator: boolean;
  };
  backgroundServices: {
    reminderScheduler: boolean;
    notificationService: boolean;
    tokenRefresh: boolean;
    wakeWordEngine: boolean;
    scheduledDailyBriefing: boolean;
  };
}

export type CreativeProjectStage = 'IDEA' | 'PRE-PRODUCTION' | 'PRODUCTION' | 'POST-PRODUCTION' | 'REVIEW' | 'DELIVERED' | 'ARCHIVED';

export type CreativeProjectType = 'Event coverage' | 'Music video' | 'Documentary' | 'Social media content' | 'Promotional video' | 'Podcast' | 'Graphic design' | 'Photography' | 'General';

export interface CreativeProject {
  id: string;
  name: string;
  clientOrOrg: string;
  type: CreativeProjectType;
  currentStage: CreativeProjectStage;
  shootDate?: string; // ISO string or simple YYYY-MM-DD
  deadline: string; // ISO string or YYYY-MM-DD
  location?: string;
  teamMembers?: string[];
  deliverables?: string[];
  aspectRatios?: string[]; // e.g. '16:9', '9:16'
  platforms?: string[]; // e.g. 'YouTube', 'TikTok'
  notes?: string;
  approvedFolder?: string;
  tasksCount: number;
  recentActivity?: string;
  createdAt: string;
  updatedAt: string;
  checklists?: {
    category: 'Shot List' | 'Production' | 'Editing' | 'Delivery' | 'General';
    items: { id: string; text: string; done: boolean }[];
  }[];
}

export interface WorkflowStep {
  id: string;
  toolName: string;
  args: any;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationHistoryItem {
  id: string;
  workflowId?: string;
  workflowName: string;
  startTime: string;
  endTime?: string;
  actionsPerformed: {
    toolName: string;
    params: any;
    status: 'success' | 'failed' | 'cancelled';
    result?: string;
    error?: string;
  }[];
  permissionsRequested: string[];
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'partial';
}

export interface MediaFile {
  filename: string;
  filePath: string;
  fileType: 'video' | 'audio' | 'image' | 'unknown';
  fileSize: string; // formatted
  duration?: string; // formatted, e.g. 00:45
  resolution?: string; // e.g. 3840x2160
  frameRate?: number; // e.g. 24, 60
  aspectRatio?: '16:9' | '9:16' | '1:1' | 'other';
  creationDate: string;
}

export interface AgentStep {
  id: string;
  description: string;
  toolName: string;
  args: any;
  permissionLevel: 'SAFE' | 'CONFIRMATION_REQUIRED' | 'RESTRICTED';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface AgentPlan {
  id: string;
  task: string;
  steps: AgentStep[];
  status: 'planning' | 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
}

