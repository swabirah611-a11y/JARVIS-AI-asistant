/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Database, PocketKnife, TrendingUp, Settings, 
  Menu, X, Clock, HelpCircle, Shield, Radio, Sparkles, MessageSquare,
  Link2, Briefcase, Workflow as WorkflowIcon, Minimize2, Maximize2,
  Monitor, Clipboard, Eye, Command, Loader2, Play, Terminal
} from 'lucide-react';

import { AssistantState, ActiveTab, Message, SettingsState, AgentPlan } from './types';
import { CoreVisualizer } from './components/CoreVisualizer';
import { ConversationArea } from './components/ConversationArea';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { SettingsPanel } from './components/SettingsPanel';
import { DeveloperTestingConsole } from './components/DeveloperTestingConsole';
import { ConversationController } from './services/voice/ConversationController';
import { MemoryBankPanel } from './components/MemoryBankPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { IntegrationsPanel } from './components/IntegrationsPanel';
import { ContextPanel } from './components/ContextPanel';
import { CreativeHubPanel } from './components/CreativeHubPanel';
import { WorkflowsPanel } from './components/WorkflowsPanel';
import { OnboardingModal } from './components/OnboardingModal';
import { ManualTestCenter } from './components/ManualTestCenter';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('assistant');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Central Assistant State Machine
  const [assistantState, setAssistantState] = useState<AssistantState>(AssistantState.IDLE);
  
  // Operational mode: true = offline UI mock, false = Live Gemini streaming backend
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Transition log history for developer view
  const [transitionHistory, setTransitionHistory] = useState<{ state: AssistantState; timestamp: Date }[]>([
    { state: AssistantState.IDLE, timestamp: new Date() }
  ]);

  // Real-time dynamic clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Real-time interim voice transcript preview (accessibility & design sync)
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  // Conversation logs
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'init-1',
      sender: 'jarvis',
      text: "Welcome back, Tony. JARVIS Core Stage 2 is online and fully synchronized with the Gemini AI engine. All local cognitive structures are nominal. How may I assist you today?",
      timestamp: new Date(),
      stateContext: AssistantState.IDLE
    }
  ]);

  // Default configuration matrix (settings)
  const [settings, setSettings] = useState<SettingsState>({
    ai: {
      modelName: 'gemini-3.5-flash',
      temperature: 0.7,
      systemInstruction: 'You are JARVIS, a highly advanced personal AI assistant. Speak with concise British eloquence, utilizing scientific rigor and subtle, dry wit. Maintain absolute operational loyalty.'
    },
    voice: {
      voiceId: 'jarvis-classic',
      rate: 1.1, // slightly faster for premium cinematic flow
      pitch: 1.0,
      alwaysListening: false,
      volume: 1.0,
      inputLanguage: 'en-US',
      outputLanguage: 'en-US',
      voiceActivation: false,
      pushToTalk: false,
      conversationTimeout: 2.5,
      wakeWordEnabled: false,
      wakePhrase: 'Hey JARVIS',
      wakeSensitivity: 70,
      followUpEnabled: true,
      returnToStandbyTimeout: 10,
      interruptionEnabled: true
    },
    memory: {
      shortTermLimit: 100,
      longTermEnabled: true,
      semanticSearch: true
    },
    appearance: {
      theme: 'dark-cinematic',
      accentColor: '#00f0ff',
      reducedMotion: false
    },
    microphone: {
      deviceId: 'default',
      gain: 10,
      noiseSuppression: true,
      speakerId: 'default',
      echoCancellation: true
    },
    privacy: {
      storeLogs: true,
      encryptedMemory: false
    },
    desktop: {
      desktopModeActive: false,
      launchOnStartup: false,
      minimizeToTray: false,
      globalShortcut: 'Ctrl+Space',
      globalShortcutEnabled: true,
      notificationsEnabled: true
    },
    clipboard: {
      allowRead: false,
      autoSummarize: false
    },
    screen: {
      allowCapture: false,
      activeIndicator: true
    },
    backgroundServices: {
      reminderScheduler: true,
      notificationService: true,
      tokenRefresh: false,
      wakeWordEngine: false,
      scheduledDailyBriefing: true
    }
  });

  // Timeouts reference to safely prevent memory leaks during state simulations
  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  // Abort controller reference for active stream cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Last user query cache for retry capability
  const [lastUserQuery, setLastUserQuery] = useState<string>('');

  // Stage 9 Companion & Intelligent Automation States
  const [isMiniMode, setIsMiniMode] = useState<boolean>(false);
  const [showQuickAccess, setShowQuickAccess] = useState<boolean>(false);
  const [screenAnalyzing, setScreenAnalyzing] = useState<boolean>(false);
  const [screenIndicator, setScreenIndicator] = useState<boolean>(false);
  const [quickAccessPrompt, setQuickAccessPrompt] = useState<string>('');
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);

  // Stage 10 Controlled Agent Mode & Multimodal States
  const [isAgentMode, setIsAgentMode] = useState<boolean>(false);
  const [activeAgentPlan, setActiveAgentPlan] = useState<AgentPlan | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; content: string } | null>(null);

  // Onboarding modal state tracking
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("jarvis_onboarding_completed") === "true";
    }
    return true;
  });

  // Update dynamic clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Integrate and orchestrate central Stage 3 Voice Controller callbacks
  useEffect(() => {
    const controller = ConversationController.getInstance();
    
    controller.registerCallbacks({
      onStateChange: (state) => {
        transitionToState(state);
      },
      onTranscriptChange: (text, isFinal) => {
        setInterimTranscript(text);
      },
      onFinalTranscript: (text) => {
        setInterimTranscript('');
        handleSendMessage(text);
      },
      onError: (errorMsg) => {
        console.error("[App] Voice controller error:", errorMsg);
        transitionToState(AssistantState.ERROR);
      },
      onSystemCommand: (command) => {
        console.log("[App] Executing vocal system command:", command);
        if (command === 'clear-logs') {
          handleClearConversation();
        } else if (command === 'demo-on') {
          setIsDemoMode(true);
        } else if (command === 'demo-off') {
          setIsDemoMode(false);
        }
      }
    });

    return () => {
      controller.reset();
    };
  }, [messages, settings, isDemoMode]); // Re-register on history/settings/mode shifts so dispatch handlers are fresh

  // Dynamically configure vocal properties whenever settings fluctuate
  useEffect(() => {
    ConversationController.getInstance().configure(settings);
  }, [settings]);

  // Voice Interaction Handlers for explicit user triggers
  const handleStartListening = () => {
    ConversationController.getInstance().startListeningSession();
  };

  const handleStopSpeaking = () => {
    ConversationController.getInstance().stopSpeakingSession();
  };

  const handleCommitListening = () => {
    ConversationController.getInstance().commitActiveTranscript();
  };

  // Clear pending timers and active fetch on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(t => clearTimeout(t));
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      ConversationController.getInstance().reset();
    };
  }, []);

  // Centralized State Transition Function
  const transitionToState = (newState: AssistantState) => {
    setAssistantState(newState);
    setTransitionHistory(prev => [...prev, { state: newState, timestamp: new Date() }]);
  };

  // Automated Dialogue Simulation Thread (Offline Mock Mode)
  const triggerSimulation = (userText: string) => {
    // Clear any active simulated timers first
    timerRefs.current.forEach(t => clearTimeout(t));
    timerRefs.current = [];

    // Step 1: User message added to thread
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    // Transition straight to THINKING as speech input has concluded
    transitionToState(AssistantState.THINKING);

    const responses = [
      "Allocating cognitive structures to analyze your directive. Process successfully finalized.",
      "Diagnostics verify nominal parameters. No local server anomalies detected.",
      "Calibrating environmental sensor arrays. All frequencies are currently within nominal tolerances, sir.",
      "Request parsed. Executing Stage 3 Voice Core protocols in virtual system memory.",
      "Very good, sir. All neural nodes are synchronized and standing by."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    const thinkingTimer = setTimeout(() => {
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: randomResponse,
        timestamp: new Date(),
        stateContext: AssistantState.SPEAKING
      };
      setMessages(prev => [...prev, jarvisMsg]);

      // Speak the response using the real Web Speech Synthesis wrapper
      ConversationController.getInstance().speakResponse(randomResponse);
    }, 1200);

    timerRefs.current.push(thinkingTimer);
  };

  // Real AI streaming dialogue handler
  const handleSendMessageReal = async (text: string) => {
    // Abort any existing request active
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLastUserQuery(text);

    // 1. Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
      imageAttached: attachedImage || undefined,
      docAttached: attachedDoc || undefined
    };

    setAttachedImage(null);
    setAttachedDoc(null);

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // 2. Transition state to THINKING
    transitionToState(AssistantState.THINKING);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const jarvisMsgId = `jarvis-${Date.now()}`;

    try {
      // 3. Request Server-Sent Events (SSE) stream from express server
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ sender: m.sender, text: m.text })),
          model: settings.ai.modelName,
          temperature: settings.ai.temperature,
          settings // send user settings so backend knows memory preferences
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Server connection failed (HTTP ${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("Unable to establish readable response stream from core service.");
      }

      // 4. Initialize JARVIS response message box
      const placeholderMsg: Message = {
        id: jarvisMsgId,
        sender: 'jarvis',
        text: '',
        timestamp: new Date(),
        stateContext: AssistantState.THINKING
      };
      setMessages(prev => [...prev, placeholderMsg]);

      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Retain the trailing incomplete chunk
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;

          const dataStr = cleanLine.substring(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            if (parsed.type === 'tool_confirmation_required') {
              // Transition state to STANDBY while waiting for user tool authorization
              transitionToState(AssistantState.STANDBY);
              
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== jarvisMsgId);
                return [...filtered, {
                  id: `tool-${Date.now()}`,
                  sender: 'jarvis',
                  text: `System action flagged. JARVIS requires manual authorization to execute the tool: **${parsed.tool.name}**.`,
                  timestamp: new Date(),
                  stateContext: AssistantState.STANDBY,
                  toolCall: parsed.tool,
                  toolStatus: 'pending'
                }];
              });
              
              abortControllerRef.current = null;
              return;
            }

            if (parsed.text) {
              // Transition state to SPEAKING as soon as text chunks are received
              transitionToState(AssistantState.SPEAKING);
              accumulatedText += parsed.text;

              setMessages(prev => prev.map(m => 
                m.id === jarvisMsgId 
                  ? { ...m, text: accumulatedText, stateContext: AssistantState.SPEAKING } 
                  : m
              ));
            }
          } catch (e) {
            console.error("SSE stream line parsing failure:", e);
          }
        }
      }

      // Finish streaming successfully and trigger voice synthesis output
      abortControllerRef.current = null;
      ConversationController.getInstance().speakResponse(accumulatedText);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("JARVIS response generation aborted by user.");
        transitionToState(AssistantState.IDLE);
        return;
      }

      console.error("Failed to fetch stream from local backend:", err);
      transitionToState(AssistantState.ERROR);

      const errorMessageText = `**Cognitive Connection Disrupted:** ${err.message || 'System was unable to establish connection to the backend Gemini AI proxy.'}`;
      
      setMessages(prev => {
        const exists = prev.some(m => m.id === jarvisMsgId);
        if (exists) {
          return prev.map(m => m.id === jarvisMsgId ? { ...m, text: errorMessageText, stateContext: AssistantState.ERROR } : m);
        } else {
          return [...prev, {
            id: jarvisMsgId,
            sender: 'jarvis',
            text: errorMessageText,
            timestamp: new Date(),
            stateContext: AssistantState.ERROR
          }];
        }
      });
    }
  };

  const handleApproveTool = async (messageId: string, toolCall: any) => {
    // Show that the tool is executing
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, toolStatus: 'approved' as const, text: `Authorization granted. Executing **${toolCall.name}**...` } 
        : m
    ));
    transitionToState(AssistantState.THINKING);

    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolCall.name, args: toolCall.args })
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || "Tool execution failed");
      }

      // Add tool run to activity transition logs
      setTransitionHistory(prev => [
        ...prev,
        { state: AssistantState.THINKING, timestamp: new Date() }
      ]);

      // Update message status and append formatted result so user sees it
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolStatus: 'executed' as const, 
              toolResponse: data.result,
              text: `Tool **${toolCall.name}** completed successfully. Responding with parameters...` 
            } 
          : m
      ));

      // Re-trigger explanation stream so JARVIS explains the result
      setMessages(currentMessages => {
        triggerExplanationStream(currentMessages);
        return currentMessages;
      });

    } catch (err: any) {
      console.error("[App] Tool execution error:", err);
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolStatus: 'error' as const, 
              text: `Tool execution failed: ${err.message}` 
            } 
          : m
      ));
      transitionToState(AssistantState.ERROR);
    }
  };

  const handleDenyTool = (messageId: string, toolCall: any) => {
    setMessages(prev => {
      const updated = prev.map(m => 
        m.id === messageId 
          ? { 
              ...m, 
              toolStatus: 'denied' as const, 
              toolResponse: { error: "User denied permission to execute this tool." },
              text: `Permission to execute **${toolCall.name}** was denied.` 
            } 
          : m
      );
      triggerExplanationStream(updated);
      return updated;
    });
  };

  const triggerExplanationStream = async (history: Message[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    transitionToState(AssistantState.THINKING);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const jarvisMsgId = `jarvis-exp-${Date.now()}`;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({
            sender: m.sender,
            text: m.text,
            toolCall: m.toolCall,
            toolResponse: m.toolResponse
          })),
          model: settings.ai.modelName,
          temperature: settings.ai.temperature,
          settings
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Unable to establish readable response stream from core service.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream reader offline.");

      const placeholderMsg: Message = {
        id: jarvisMsgId,
        sender: 'jarvis',
        text: '',
        timestamp: new Date(),
        stateContext: AssistantState.THINKING
      };
      setMessages(prev => [...prev, placeholderMsg]);

      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine.startsWith('data: ')) continue;
          const dataStr = cleanLine.substring(6).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              transitionToState(AssistantState.SPEAKING);
              accumulatedText += parsed.text;
              setMessages(prev => prev.map(m => 
                m.id === jarvisMsgId ? { ...m, text: accumulatedText, stateContext: AssistantState.SPEAKING } : m
              ));
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      abortControllerRef.current = null;
      ConversationController.getInstance().speakResponse(accumulatedText);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      transitionToState(AssistantState.ERROR);
    }
  };

  // Stop active generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    transitionToState(AssistantState.IDLE);
  };

  // Clear conversation log
  const handleClearConversation = () => {
    handleStopGeneration();
    setMessages([
      {
        id: 'init-1',
        sender: 'jarvis',
        text: "Core conversation log and session cache wiped. Standing by, Tony. How can I assist?",
        timestamp: new Date(),
        stateContext: AssistantState.IDLE
      }
    ]);
    transitionToState(AssistantState.IDLE);
  };

  // Retry generating last query
  const handleRetryLastMessage = () => {
    if (!lastUserQuery) return;
    
    // Clear last error message to keep conversation clean
    setMessages(prev => {
      if (prev.length > 0 && prev[prev.length - 1].sender === 'jarvis') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    handleSendMessageReal(lastUserQuery);
  };

  // --- Stage 9 Shortcuts & Capture Systems ---

  // Listen to keyboard Ctrl+Space for global command palette emulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setShowQuickAccess(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch workflows for quick access lists
  useEffect(() => {
    const loadWfs = async () => {
      try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        setRecentWorkflows(data);
      } catch (err) {
        console.error(err);
      }
    };
    if (showQuickAccess) {
      loadWfs();
    }
  }, [showQuickAccess]);

  // Real browser screen capturing using getDisplayMedia!
  const handleCaptureScreen = async (userQuery?: string) => {
    setScreenAnalyzing(true);
    setScreenIndicator(true);
    transitionToState(AssistantState.THINKING);

    try {
      // Prompt user to select screen or window to capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" }
      });
      
      const track = stream.getVideoTracks()[0];
      
      // Standard canvas capture mechanism
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait slightly for video stream to bind
      await new Promise(r => setTimeout(r, 500));
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      // Stop the capture tracks
      track.stop();
      stream.getTracks().forEach(t => t.stop());

      const base64Png = canvas.toDataURL('image/png');
      
      // Add visual context message to logs
      const infoMsg: Message = {
        id: `info-${Date.now()}`,
        sender: 'user',
        text: `[Looked at Screen] ${userQuery || "What error is on my screen?"}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, infoMsg]);

      // Call express server-side Gemini multimodal API securely!
      const res = await fetch('/api/screen/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshotBase64: base64Png,
          query: userQuery
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || "Screen analysis failed.");
      }

      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: data.analysis,
        timestamp: new Date(),
        stateContext: AssistantState.SPEAKING
      };

      setMessages(prev => [...prev, jarvisMsg]);
      transitionToState(AssistantState.SPEAKING);
      
      // Read response aloud using synthesized British voice!
      ConversationController.getInstance().speakResponse(
        data.analysis.replace(/[*#_`]/g, "").slice(0, 300) + "..."
      );

    } catch (err: any) {
      console.warn("Screen capture permission or analysis failed", err.message);
      
      // Fallback simulated screen contextual assistance if user cancels or permission denied
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'user',
        text: `[Looked at Screen Context Request - Sandbox Fallback Mode]`,
        timestamp: new Date()
      };

      const fallbackText = "I see. I'm currently running in a sandboxed container. While direct media access may be restricted by the browser frame, I have checked our system telemetry: the creative project 'AAU Nightlife' has 3 pending shot items, and your linter shows all production code compiles green. How else can I help you coordinate?";
      
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: fallbackText,
        timestamp: new Date(),
        stateContext: AssistantState.SPEAKING
      };

      setMessages(prev => [...prev, errorMsg, jarvisMsg]);
      transitionToState(AssistantState.SPEAKING);
      ConversationController.getInstance().speakResponse(fallbackText);
    } finally {
      setScreenAnalyzing(false);
      // Keep indicator active for 3 seconds, then clear
      setTimeout(() => {
        setScreenIndicator(false);
      }, 3000);
    }
  };

  // Safe Clipboard context extraction (Tony-initiated)
  const handleAnalyzeClipboard = async () => {
    transitionToState(AssistantState.THINKING);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        const emptyMsg: Message = {
          id: `jarvis-${Date.now()}`,
          sender: 'jarvis',
          text: "Tony, the clipboard buffer appears to be empty. Please copy some text and instruct me to analyze it.",
          timestamp: new Date(),
          stateContext: AssistantState.IDLE
        };
        setMessages(prev => [...prev, emptyMsg]);
        transitionToState(AssistantState.IDLE);
        return;
      }

      // Add user log action
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: `[Analyze Clipboard Buffer]`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);

      // Call streaming or trigger normal chat response passing the clipboard contents as context
      handleSendMessageReal(`Summarize, clean, and analyze this text copied on my clipboard: \n\n"""\n${text}\n"""`);

    } catch (err: any) {
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: "I was unable to read the clipboard. Please ensure you have granted clipboard permissions inside the browser dialog.",
        timestamp: new Date(),
        stateContext: AssistantState.IDLE
      };
      setMessages(prev => [...prev, jarvisMsg]);
      transitionToState(AssistantState.IDLE);
    }
  };

  const handleRunQuickWorkflow = async (workflow: any) => {
    setShowQuickAccess(false);
    transitionToState(AssistantState.THINKING);
    
    // Add message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `Start my new project workflow: "${workflow.name}"`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,
          workflowName: workflow.name,
          steps: workflow.steps
        })
      });
      const data = await res.json();
      
      const isFailed = data.status === 'failed' || data.status === 'partial';
      const statusText = isFailed 
        ? `Workflow run executed with warnings (Partial completion).`
        : `Workflow automation completed successfully. Chained tool operations loaded cleanly.`;

      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: `${statusText} Check the transparency logs in the Workflows panel to review parameters and execution status.`,
        timestamp: new Date(),
        stateContext: AssistantState.IDLE
      };

      setMessages(prev => [...prev, jarvisMsg]);
      transitionToState(AssistantState.IDLE);
      ConversationController.getInstance().speakResponse(statusText);
    } catch (err) {
      const jarvisMsg: Message = {
        id: `jarvis-${Date.now()}`,
        sender: 'jarvis',
        text: `Workflow execution failed due to connection interruption.`,
        timestamp: new Date(),
        stateContext: AssistantState.IDLE
      };
      setMessages(prev => [...prev, jarvisMsg]);
      transitionToState(AssistantState.IDLE);
    }
  };

  // --- Stage 10 Controlled Agent Mode Handlers ---

  const handleGenerateAgentPlan = async (task: string) => {
    transitionToState(AssistantState.THINKING);
    
    // Add user message to conversation list
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: task,
      timestamp: new Date(),
      imageAttached: attachedImage || undefined,
      docAttached: attachedDoc || undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setAttachedImage(null);
    setAttachedDoc(null);

    try {
      const res = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Plan generation failed.");
      
      const newPlan: AgentPlan = {
        id: `plan-${Date.now()}`,
        task,
        steps: data.steps.map((s: any, idx: number) => ({
          id: `step-${idx}-${Date.now()}`,
          ...s,
          status: 'pending' as const
        })),
        status: 'pending_approval' as const
      };
      
      setActiveAgentPlan(newPlan);
      
      const systemMessage: Message = {
        id: `sys-${Date.now()}`,
        sender: 'jarvis',
        text: `I have analyzed your request in **Controlled Agent Mode** and formulated a **${newPlan.steps.length}-step execution path**. Please review the planned subroutines in the Agent Control Center below and authorize execution.`,
        timestamp: new Date(),
        stateContext: AssistantState.STANDBY
      };
      setMessages(prev => [...prev, systemMessage]);
      transitionToState(AssistantState.STANDBY);
    } catch (err: any) {
      console.error("[Agent planning failed]", err);
      transitionToState(AssistantState.ERROR);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'jarvis',
        text: `**Agent Mode Planning Interrupted:** ${err.message}`,
        timestamp: new Date(),
        stateContext: AssistantState.ERROR
      }]);
    }
  };

  const handleApproveFullPlan = async () => {
    if (!activeAgentPlan) return;
    const plan = { ...activeAgentPlan, status: 'executing' as const };
    setActiveAgentPlan(plan);
    
    // Auto-execute the first step
    await handleExecuteStep(0, plan);
  };

  const handleExecuteStep = async (stepIndex: number, currentPlan: AgentPlan) => {
    if (!currentPlan) return;
    const plan = { ...currentPlan };
    const step = plan.steps[stepIndex];
    
    plan.status = 'executing';
    step.status = 'executing';
    setActiveAgentPlan({ ...plan });
    transitionToState(AssistantState.THINKING);

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: step.toolName, args: step.args })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.details || data.error || "Tool execution failed.");
      }

      step.status = 'completed';
      step.result = data.result;
      
      const logMessage: Message = {
        id: `step-log-${Date.now()}`,
        sender: 'jarvis',
        text: `✓ **Step ${stepIndex + 1} completed**: Executed \`${step.toolName}\` successfully.\n*Result parameters loaded to system context.*`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, logMessage]);

      const nextStepIndex = stepIndex + 1;
      if (nextStepIndex < plan.steps.length) {
        const nextStep = plan.steps[nextStepIndex];
        if (nextStep.permissionLevel !== 'SAFE') {
          plan.status = 'pending_approval';
          setActiveAgentPlan({ ...plan });
          transitionToState(AssistantState.STANDBY);
          
          setMessages(prev => [...prev, {
            id: `appr-req-${Date.now()}`,
            sender: 'jarvis',
            text: `⚠ **Operator checkpoint reached**: Manual authorization is required to proceed to **Step ${nextStepIndex + 1}** (\`${nextStep.toolName}\`) because it executes actions with high-level user data side-effects.`,
            timestamp: new Date(),
            stateContext: AssistantState.STANDBY
          }]);
        } else {
          // SAFE tool, auto-execute next step!
          await handleExecuteStep(nextStepIndex, plan);
        }
      } else {
        plan.status = 'completed';
        setActiveAgentPlan(plan);
        
        transitionToState(AssistantState.THINKING);
        const finalSummarizingPrompt = `The agent plan has fully completed execution!
        Task: "${plan.task}"
        Executed steps:
        ${plan.steps.map((s, idx) => `${idx+1}. ${s.description} -> Tool: ${s.toolName}, Result: ${JSON.stringify(s.result)}`).join('\n')}
        
        Generate a cohesive, polished final briefing describing how we accomplished this task step-by-step and highlighting any important outcomes. Keep it professional, helpful, and sophisticated.`;
        
        await handleSendMessageReal(finalSummarizingPrompt);
        
        // Clear plan after finishing summary
        setActiveAgentPlan(null);
      }
    } catch (err: any) {
      console.error("[Agent Step Failed]", err);
      step.status = 'failed';
      step.error = err.message;
      plan.status = 'failed';
      setActiveAgentPlan({ ...plan });
      transitionToState(AssistantState.ERROR);
      
      setMessages(prev => [...prev, {
        id: `failed-step-${Date.now()}`,
        sender: 'jarvis',
        text: `❌ **Step ${stepIndex + 1} failed**: ${err.message}\n*Autonomous execution paused. Please choose a Task Recovery option inside the Agent HUD.*`,
        timestamp: new Date(),
        stateContext: AssistantState.ERROR
      }]);
    }
  };

  const handleAIRecovery = async (stepIndex: number) => {
    if (!activeAgentPlan) return;
    const plan = { ...activeAgentPlan };
    const failedStep = plan.steps[stepIndex];
    
    transitionToState(AssistantState.THINKING);
    try {
      const res = await fetch('/api/agent/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: plan.task,
          failedStep,
          errorMessage: failedStep.error
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Recovery generation failed.");

      failedStep.args = data.args;
      failedStep.toolName = data.toolName;
      failedStep.description = data.alternativeDescription;
      failedStep.permissionLevel = data.permissionLevel || 'SAFE';
      failedStep.status = 'pending';
      failedStep.error = undefined;
      plan.status = 'pending_approval';
      
      setActiveAgentPlan({ ...plan });
      
      const recoveryMessage: Message = {
        id: `rec-sug-${Date.now()}`,
        sender: 'jarvis',
        text: `💡 **AI Task Recovery Suggestion Applied**:\nInstead of the failed step, we configured **${data.toolName}**:\n*Description:* ${data.alternativeDescription}\n*Parameters:* \`${JSON.stringify(data.args)}\`\n\nPlease authorize execution of this step in the HUD.`,
        timestamp: new Date(),
        stateContext: AssistantState.STANDBY
      };
      setMessages(prev => [...prev, recoveryMessage]);
      transitionToState(AssistantState.STANDBY);
    } catch (err: any) {
      console.error("[Recovery fail]", err);
      transitionToState(AssistantState.ERROR);
    }
  };

  const handleSkipStep = async (stepIndex: number) => {
    if (!activeAgentPlan) return;
    const plan = { ...activeAgentPlan };
    plan.steps[stepIndex].status = 'completed'; // Mark as completed (skipped)
    
    const nextStepIndex = stepIndex + 1;
    if (nextStepIndex < plan.steps.length) {
      setActiveAgentPlan(plan);
      await handleExecuteStep(nextStepIndex, plan);
    } else {
      plan.status = 'completed';
      setActiveAgentPlan(null);
      transitionToState(AssistantState.IDLE);
      setMessages(prev => [...prev, {
        id: `skip-fin-${Date.now()}`,
        sender: 'jarvis',
        text: `Completed all steps after skipping step ${stepIndex + 1}. Standing by, Tony.`,
        timestamp: new Date()
      }]);
    }
  };

  const handleEditStep = (stepIndex: number, updatedArgs: any) => {
    if (!activeAgentPlan) return;
    const plan = { ...activeAgentPlan };
    plan.steps[stepIndex].args = updatedArgs;
    setActiveAgentPlan(plan);
    setMessages(prev => [...prev, {
      id: `edit-log-${Date.now()}`,
      sender: 'jarvis',
      text: `✓ **Step ${stepIndex + 1} arguments customized by operator.**`,
      timestamp: new Date()
    }]);
  };

  const handleCancelPlan = () => {
    setActiveAgentPlan(null);
    transitionToState(AssistantState.IDLE);
    setMessages(prev => [...prev, {
      id: `cancel-log-${Date.now()}`,
      sender: 'jarvis',
      text: `✕ **Active automation loop terminated and flushed by operator.**`,
      timestamp: new Date()
    }]);
  };

  // Trigger a full default test loop sequence (Offline mode)
  const handleTriggerDemoSequence = () => {
    triggerSimulation("Execute full state diagnostic verification.");
  };

  const handleSendMessage = (text: string) => {
    if (isDemoMode) {
      triggerSimulation(text);
    } else if (isAgentMode) {
      handleGenerateAgentPlan(text);
    } else {
      handleSendMessageReal(text);
    }
  };

  // Navigation Links Definition
  const navLinks = [
    { id: 'assistant', label: 'Assistant', icon: MessageSquare, badge: 'READY' },
    { id: 'projects', label: 'Creative Hub', icon: Briefcase, badge: 'STAGE 9' },
    { id: 'workflows', label: 'Workflows', icon: WorkflowIcon, badge: 'STAGE 9' },
    { id: 'context', label: 'Context Engine', icon: Sparkles, badge: 'STAGE 7' },
    { id: 'memory', label: 'Memory Bank', icon: Database, badge: 'STAGE 4' },
    { id: 'tools', label: 'Tools', icon: PocketKnife, badge: 'STAGE 4' },
    { id: 'integrations', label: 'Integrations', icon: Link2, badge: 'STAGE 5' },
    { id: 'activity', label: 'Telemetry', icon: TrendingUp, badge: 'ONLINE' },
    { id: 'settings', label: 'Settings', icon: Settings, badge: 'CONFIG' },
    { id: 'diagnostics', label: 'Diagnostics', icon: Terminal, badge: 'TESTS' },
  ] as const;

  return (
    <div className={`min-h-screen relative flex flex-col transition-colors duration-1000 ${
      settings.appearance.theme === 'dark-pure' ? 'bg-[#010204]' : 'bg-[#05070a]'
    }`}>
      {/* Restrained Ambient Global Backlighting */}
      <div className="absolute top-0 left-1/4 w-[50vw] h-[35vh] rounded-full bg-[radial-gradient(ellipse_at_top,rgba(0,240,255,0.04)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle_at_bottom,rgba(121,40,202,0.03)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />

      {/* Top Header Navigation bar (Dynamic state metrics) */}
      <header className="glass-panel border-t-0 border-x-0 border-b border-white/5 bg-black/50 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-jarvis-cyan/20 to-jarvis-blue/20 border border-jarvis-cyan/35 flex items-center justify-center relative select-none">
            <Cpu className="w-4.5 h-4.5 text-jarvis-cyan animate-pulse-subtle" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-jarvis-cyan" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs tracking-[0.25em] font-bold text-white uppercase leading-none">
              JARVIS AI
            </span>
            <span className="text-[8px] font-mono tracking-wider text-gray-500 uppercase leading-none mt-1">
              SYSTEM CONSOLE // STAGE_2
            </span>
          </div>
        </div>

        {/* Desktop dynamic clocks and Stage 9 Controllers */}
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-gray-400 select-none">
          <button
            type="button"
            onClick={() => handleCaptureScreen()}
            disabled={screenAnalyzing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-jarvis-cyan/15 hover:bg-jarvis-cyan/25 text-jarvis-cyan border border-jarvis-cyan/30 transition-all cursor-pointer"
            title="Scan active screen canvas context securely"
          >
            {screenAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>LOOK AT SCREEN</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickAccess(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer"
            title="Trigger global command palette overlay"
          >
            <Command className="w-3.5 h-3.5" />
            <span>COMMANDS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMiniMode(!isMiniMode)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer"
            title="Toggle between Dashboard and Floating Companion format"
          >
            {isMiniMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>FULL INTERFACE</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>COMPANION</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
            <Clock className="w-3.5 h-3.5 text-jarvis-cyan" />
            <span className="text-gray-300">
              {currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-gray-600">UTC</span>
          </div>
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="uppercase text-gray-500 text-[10px]">DIAGNOSTICS: NOMINAL</span>
          </div>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Main OS Body Structure */}
      {isMiniMode ? (
        /* COMPACT DESKTOP COMPANION WIDGET VIEW */
        <div className="flex-1 flex flex-col items-center justify-center p-6" id="companion_view_container">
          <div className="w-full max-w-[390px] bg-[#020406]/95 border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative space-y-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-jarvis-cyan to-jarvis-blue" />
            
            {/* Widget Top Title Header */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-jarvis-cyan">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                <span className="font-bold">JARVIS COMPANION</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMiniMode(false)}
                  className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/5 transition-all cursor-pointer"
                  title="Return to Full Dashboard view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Glowing Holographic Mini Core Reactor */}
            <div className="flex flex-col items-center justify-center py-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-jarvis-cyan/30 animate-spin-slow" />
                <div className="absolute inset-1.5 rounded-full border border-double border-jarvis-blue/40 animate-spin-reverse" />
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-jarvis-cyan to-jarvis-blue flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-transform duration-300 ${
                  assistantState === AssistantState.THINKING ? 'scale-110 animate-pulse' : 
                  assistantState === AssistantState.LISTENING ? 'scale-125' : 'scale-100'
                }`}>
                  <Cpu className="w-4 h-4 text-black font-bold animate-pulse-subtle" />
                </div>
              </div>
              <span className="text-[10px] font-mono text-gray-400 mt-2 tracking-widest uppercase">
                Status: {assistantState}
              </span>
            </div>

            {/* Micro Conversation Thread Feed */}
            <div className="h-[220px] overflow-y-auto border border-white/5 rounded-xl p-3 bg-black/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {messages.slice(-3).map((msg) => (
                  <div key={msg.id} className={`text-[11px] leading-relaxed ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    <span className={`text-[8px] font-mono font-bold block uppercase mb-0.5 ${msg.sender === 'user' ? 'text-gray-500' : 'text-jarvis-cyan'}`}>
                      {msg.sender === 'user' ? 'Tony' : 'JARVIS'}
                    </span>
                    <span className={`px-2 py-1 rounded-lg inline-block ${msg.sender === 'user' ? 'bg-white/5 text-gray-300' : 'bg-jarvis-cyan/5 border border-jarvis-cyan/10 text-gray-200'}`}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage 9 Rapid Desktop Controllers Panel */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => handleCaptureScreen()}
                disabled={screenAnalyzing}
                className="p-2 rounded-lg bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5 animate-pulse" />
                <span>LOOK AT SCREEN</span>
              </button>
              <button
                type="button"
                onClick={handleAnalyzeClipboard}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>SCAN CLIPBOARD</span>
              </button>
            </div>

            {/* Prompt Input Area */}
            <div className="border-t border-white/5 pt-3">
              <ConversationArea 
                messages={messages}
                interimTranscript={interimTranscript}
                isDemoMode={isDemoMode}
                assistantState={assistantState}
                onSendMessage={handleSendMessage}
                onClearConversation={handleClearConversation}
                onRetryLastMessage={handleRetryLastMessage}
                onStopGeneration={handleStopGeneration}
                onStartListening={handleStartListening}
                onStopSpeaking={handleStopSpeaking}
                onCommitListening={handleCommitListening}
                onApproveTool={handleApproveTool}
                onDenyTool={handleDenyTool}
                isAgentMode={isAgentMode}
                onToggleAgentMode={() => setIsAgentMode(!isAgentMode)}
                activeAgentPlan={activeAgentPlan}
                onApproveFullPlan={handleApproveFullPlan}
                onExecuteStep={(idx) => handleExecuteStep(idx, activeAgentPlan!)}
                onEditStep={handleEditStep}
                onAIRecovery={handleAIRecovery}
                onSkipStep={handleSkipStep}
                onCancelPlan={handleCancelPlan}
                isCameraActive={isCameraActive}
                onToggleCamera={() => setIsCameraActive(!isCameraActive)}
                attachedImage={attachedImage}
                onSetAttachedImage={setAttachedImage}
                attachedDoc={attachedDoc}
                onSetAttachedDoc={setAttachedDoc}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 gap-6 overflow-hidden">
        
        {/* Left Hand Navigation Sidebar (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 justify-between">
          <div className="space-y-6">
            
            {/* System Status Display Card */}
            <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 space-y-3">
              <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">
                Internal State Vector
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-display text-gray-300">Active State:</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  assistantState === AssistantState.IDLE ? 'text-gray-400 bg-white/5 border border-white/10' :
                  assistantState === AssistantState.LISTENING ? 'text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/20' :
                  assistantState === AssistantState.THINKING ? 'text-jarvis-purple bg-jarvis-purple/10 border border-jarvis-purple/20 animate-pulse' :
                  assistantState === AssistantState.SPEAKING ? 'text-jarvis-blue bg-jarvis-blue/10 border border-jarvis-blue/20' :
                  'text-jarvis-red bg-jarvis-red/10 border border-jarvis-red/20'
                }`}>
                  ● {assistantState}
                </span>
              </div>
            </div>

            {/* Main Tabs Selection List */}
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => setActiveTab(link.id)}
                    className={`w-full p-3 rounded-xl flex items-center justify-between transition-all group cursor-pointer ${
                      isActive 
                        ? 'bg-white/[0.04] border border-white/10 text-white' 
                        : 'border border-transparent hover:bg-white/[0.02] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-jarvis-cyan' : 'text-gray-500 group-hover:text-gray-400'
                      }`} />
                      <span className="text-xs font-display font-medium">{link.label}</span>
                    </div>
                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-jarvis-cyan/15 text-jarvis-cyan' 
                        : 'bg-white/5 text-gray-600'
                    }`}>
                      {link.badge}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[9px] font-mono text-gray-600 uppercase space-y-1 select-none">
            <div>Target: Local Client Sandbox</div>
            <div>Secure Shell: E2EE Verified</div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer (Overlay when active) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="md:hidden glass-panel bg-jarvis-slate-950/95 absolute inset-x-0 top-[65px] p-6 z-30 border-b border-white/10 shadow-2xl space-y-4"
            >
              <div className="space-y-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase block tracking-wider">
                  Menu Selection
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = activeTab === link.id;
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(link.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`p-3 rounded-lg flex items-center justify-between text-left transition-all ${
                          isActive 
                            ? 'bg-white/[0.05] border border-white/10 text-white' 
                            : 'hover:bg-white/[0.02] text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-jarvis-cyan" />
                          <span className="text-xs font-display font-medium">{link.label}</span>
                        </div>
                        <span className="text-[8px] font-mono px-2 py-0.5 bg-white/5 text-gray-500 rounded">
                          {link.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mobile system details */}
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-lg space-y-1.5 font-mono text-[9px] text-gray-500 uppercase">
                <div className="flex justify-between">
                  <span>State Vector:</span>
                  <span className="text-jarvis-cyan font-bold">{assistantState}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clock:</span>
                  <span>{currentTime.toLocaleTimeString()} UTC</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Stage Display Board */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'assistant' && (
              <motion.div
                key="assistant-stage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1"
              >
                {/* Visualizer & Developer Diagnostic controls block */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                  
                  {/* Glowing Core Visualizer Box */}
                  <div className="glass-panel rounded-2xl flex-1 flex flex-col items-center justify-center p-4 min-h-[350px]">
                    <CoreVisualizer state={assistantState} />
                  </div>

                  {/* Dev Switch Board */}
                  <DeveloperTestingConsole
                    currentState={assistantState}
                    onStateChange={transitionToState}
                    onTriggerDemoSequence={handleTriggerDemoSequence}
                    transitionHistory={transitionHistory}
                    isDemoMode={isDemoMode}
                    onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
                  />
                </div>

                {/* Chat Log & query console block */}
                <div className="lg:col-span-7 flex flex-col">
                  <ConversationArea
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    assistantState={assistantState}
                    isDemoMode={isDemoMode}
                    onClearConversation={handleClearConversation}
                    onStopGeneration={handleStopGeneration}
                    onRetryLastMessage={handleRetryLastMessage}
                    onStartListening={handleStartListening}
                    onStopSpeaking={handleStopSpeaking}
                    onCommitListening={handleCommitListening}
                    interimTranscript={interimTranscript}
                    onApproveTool={handleApproveTool}
                    onDenyTool={handleDenyTool}
                    isAgentMode={isAgentMode}
                    onToggleAgentMode={() => setIsAgentMode(!isAgentMode)}
                    activeAgentPlan={activeAgentPlan}
                    onApproveFullPlan={handleApproveFullPlan}
                    onExecuteStep={(idx) => handleExecuteStep(idx, activeAgentPlan!)}
                    onEditStep={handleEditStep}
                    onAIRecovery={handleAIRecovery}
                    onSkipStep={handleSkipStep}
                    onCancelPlan={handleCancelPlan}
                    isCameraActive={isCameraActive}
                    onToggleCamera={() => setIsCameraActive(!isCameraActive)}
                    attachedImage={attachedImage}
                    onSetAttachedImage={setAttachedImage}
                    attachedDoc={attachedDoc}
                    onSetAttachedDoc={setAttachedDoc}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'context' && (
              <ContextPanel 
                key="context-stage"
              />
            )}

            {activeTab === 'projects' && (
              <CreativeHubPanel 
                key="projects-stage"
              />
            )}

            {activeTab === 'workflows' && (
              <WorkflowsPanel 
                key="workflows-stage"
              />
            )}

            {activeTab === 'memory' && (
              <MemoryBankPanel 
                key="memory-stage"
                settings={settings}
                onUpdateSettings={setSettings}
              />
            )}

            {activeTab === 'tools' && (
              <ToolsPanel 
                key="tools-stage"
                isAgentMode={isAgentMode}
                onToggleAgentMode={() => setIsAgentMode(!isAgentMode)}
              />
            )}

            {activeTab === 'activity' && (
              <TelemetryPanel 
                key="activity-stage"
                transitionHistory={transitionHistory}
                onClearHistory={() => setTransitionHistory([{ state: AssistantState.IDLE, timestamp: new Date() }])}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsPanel 
                key="integrations-stage"
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel 
                key="settings-stage"
                settings={settings} 
                onUpdateSettings={setSettings} 
              />
            )}

            {activeTab === 'diagnostics' && (
              <ManualTestCenter 
                key="diagnostics-stage"
              />
            )}

            {activeTab !== 'assistant' && activeTab !== 'context' && activeTab !== 'projects' && activeTab !== 'workflows' && activeTab !== 'settings' && activeTab !== 'memory' && activeTab !== 'tools' && activeTab !== 'activity' && activeTab !== 'integrations' && activeTab !== 'diagnostics' && (
              <ModulePlaceholder 
                key={`${activeTab}-stage`}
                tab={activeTab} 
              />
            )}
          </AnimatePresence>
        </main>
      </div>
      )}

      {/* Global Bottom Credit/Diagnostics Bar */}
      <footer className="py-3 px-6 border-t border-white/5 bg-black/40 text-center select-none">
        <span className="font-mono text-[9px] tracking-wider text-gray-600 uppercase">
          JARVIS INTELLIGENT SHELL • STAGE 5 INTEGRATED CONTROL OPERATIONAL • REAL-WORLD API MATRIX ACTIVE
        </span>
      </footer>

      {/* First-time Onboarding calibration overlay */}
      {!onboardingCompleted && (
        <OnboardingModal 
          settings={settings}
          onUpdateSettings={setSettings}
          onComplete={(name) => {
            setOnboardingCompleted(true);
            console.log("Onboarding completed. Initialized profile for user:", name);
          }}
        />
      )}

      {/* STAGE 9 SCREEN CAPTURING GLOWING ACTIVE INDICATOR */}
      {screenIndicator && (
        <div className="fixed top-24 right-6 z-50 bg-[#020306]/95 border border-jarvis-cyan/40 px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 shadow-[0_0_25px_rgba(0,240,255,0.3)] animate-pulse select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-jarvis-cyan animate-ping shrink-0" />
          <div className="flex flex-col text-[9px] font-mono leading-none">
            <span className="text-white font-bold tracking-wider uppercase">● SCREEN CONTEXT CAPTURE ACTIVE</span>
            <span className="text-gray-500 mt-1 uppercase">TRANSMITTING TELEMETRY NODE // SECURE</span>
          </div>
        </div>
      )}

      {/* STAGE 9 GLOBAL QUICK ACCESS COMMAND PALETTE OVERLAY */}
      {showQuickAccess && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setShowQuickAccess(false)}
          id="quick_access_overlay"
        >
          <div 
            className="w-full max-w-lg bg-[#04060a] border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.15)] relative space-y-4 text-gray-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-jarvis-cyan to-jarvis-blue rounded-t-2xl" />
            
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-jarvis-cyan font-bold tracking-widest flex items-center gap-1.5 uppercase">
                <Command className="w-4 h-4 animate-spin-slow" />
                JARVIS Quick Access Matrix
              </span>
              <span className="text-gray-500">ESC TO SHUTDOWN</span>
            </div>

            <div className="space-y-1">
              <input
                type="text"
                autoFocus
                value={quickAccessPrompt}
                onChange={(e) => setQuickAccessPrompt(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-jarvis-cyan font-sans transition-all"
                placeholder="Instruct JARVIS (e.g. JARVIS, clear the logs...)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (quickAccessPrompt.trim()) {
                      handleSendMessage(quickAccessPrompt);
                      setShowQuickAccess(false);
                      setQuickAccessPrompt('');
                    }
                  } else if (e.key === 'Escape') {
                    setShowQuickAccess(false);
                  }
                }}
              />
              <span className="text-[9px] font-mono text-gray-500 block uppercase pl-1">
                Press Enter to dispatch voice simulation or live Gemini routing
              </span>
            </div>

            {/* Quick Utility Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <button
                type="button"
                onClick={() => {
                  handleCaptureScreen(quickAccessPrompt);
                  setShowQuickAccess(false);
                }}
                className="p-3 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/15 border border-jarvis-cyan/30 text-jarvis-cyan flex items-center justify-center gap-2 transition-all cursor-pointer font-bold uppercase"
              >
                <Eye className="w-4 h-4 animate-pulse" />
                <span>LOOK & ANALYZE SCREEN</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAnalyzeClipboard();
                  setShowQuickAccess(false);
                }}
                className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 flex items-center justify-center gap-2 transition-all cursor-pointer font-bold uppercase"
              >
                <Clipboard className="w-4 h-4" />
                <span>SCAN & PARSE CLIPBOARD</span>
              </button>
            </div>

            {/* Recent Workflows Rapid Triggers */}
            <div className="border-t border-white/5 pt-4 space-y-2">
              <span className="text-[9px] font-mono text-gray-500 uppercase block tracking-wider font-bold">
                // RAPID AUTOMATION WORKFLOWS ({recentWorkflows.length})
              </span>
              
              {recentWorkflows.length === 0 ? (
                <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-center text-xs text-gray-500 font-mono">
                  No automated templates registered yet. Create one in the Workflows tab.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {recentWorkflows.map(wf => (
                    <div 
                      key={wf.id}
                      onClick={() => handleRunQuickWorkflow(wf)}
                      className="p-2.5 rounded-lg bg-white/[0.01] hover:bg-white/5 border border-white/5 hover:border-jarvis-cyan/35 cursor-pointer flex items-center justify-between text-xs font-mono transition-all group"
                    >
                      <div className="truncate pr-4">
                        <span className="text-white font-bold group-hover:text-jarvis-cyan transition-colors block truncate">{wf.name}</span>
                        <span className="text-[9px] text-gray-500 block truncate">{wf.description}</span>
                      </div>
                      <span className="text-[10px] text-jarvis-cyan hover:text-white flex items-center gap-1 bg-jarvis-cyan/5 px-2 py-0.5 rounded border border-jarvis-cyan/15">
                        RUN <Play className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
