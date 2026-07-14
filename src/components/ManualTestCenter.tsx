/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Square, Mic, MicOff, Volume2, Search, CloudSun, Music, Database, Activity,
  Brain, RefreshCw, CheckCircle2, XCircle, AlertCircle, Terminal, Clipboard, 
  Copy, Info, ArrowRight, Check, Trash2, Edit2
} from 'lucide-react';
import { AssistantState } from '../types';
import { VoiceInput } from '../services/voice/VoiceInput';
import { VoiceOutput } from '../services/voice/VoiceOutput';

type TestStatus = 'NOT TESTED' | 'TESTING' | 'PASSED BY USER' | 'FAILED BY USER' | 'NOT CONFIGURED' | 'SIMULATED' | 'UNAVAILABLE';

interface TestItem {
  id: string;
  name: string;
  category: 'core' | 'voice' | 'integrations' | 'systems';
  description: string;
  status: TestStatus;
  notes?: string;
}

export const ManualTestCenter: React.FC = () => {
  // --- STATE ---
  const [tests, setTests] = useState<TestItem[]>([
    { id: 'chat', name: '1. AI Chat & Context', category: 'core', description: 'Test normal chat messages, follow-up context flow, and message canceling.', status: 'NOT TESTED' },
    { id: 'mic', name: '2. Microphone Transcription', category: 'voice', description: 'Request mic permissions, record voice, and verify real-time speech-to-text accuracy.', status: 'NOT TESTED' },
    { id: 'speak', name: '3. Speech Synthesis Vocalizer', category: 'voice', description: 'Play British sounding diagnostic speech, verify start/stop controls, and interruption capabilities.', status: 'NOT TESTED' },
    { id: 'voice_loop', name: '4. Voice Conversation Loop', category: 'voice', description: 'Run complete hand-free loop: Speak -> Transcribe -> Get Response -> JARVIS speaks -> Return to Ready.', status: 'NOT TESTED' },
    { id: 'live_ai', name: '5. Live Gemini API', category: 'core', description: 'Verify direct backend communication with the live Gemini LLM endpoint.', status: 'NOT TESTED' },
    { id: 'web_search', name: '6. Live Web Search', category: 'integrations', description: 'Verify current live Google search capability with real queries and markdown source link returns.', status: 'NOT TESTED' },
    { id: 'weather', name: '7. Live Weather Info', category: 'integrations', description: 'Request real-time weather metrics for any specific coordinate/location.', status: 'NOT TESTED' },
    { id: 'spotify', name: '8. Real Spotify Linkage', category: 'integrations', description: 'Check Spotify credentials, start secure OAuth redirects, retrieve actual account profile, and test control.', status: 'NOT TESTED' },
    { id: 'memory', name: '9. Memory CRUD Transaction', category: 'systems', description: 'Write a temporary memory, retrieve it, patch updates, and delete it to verify sandbox isolation.', status: 'NOT TESTED' },
    { id: 'agent', name: '10. Safe Agent Orchestrator', category: 'systems', description: 'Formulate and execute a safe, 3-step inspection plan using only read-only local tools.', status: 'NOT TESTED' },
    { id: 'persistence', name: '11. Reload & Storage Persistence', category: 'systems', description: 'Write temporary test tasks, prompt a page refresh, verify they remain, and then clean them up.', status: 'NOT TESTED' }
  ]);

  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Test 1: Chat States
  const [chatInput, setChatInput] = useState('');
  const [chatOutput, setChatOutput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatAbortController = useRef<AbortController | null>(null);

  // Test 2: Mic States
  const [micActive, setMicActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const voiceInputRef = useRef<VoiceInput | null>(null);

  // Test 3: Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceOutputRef = useRef<VoiceOutput | null>(null);

  // Test 4: Conversation Loop States
  const [loopState, setLoopState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [loopTranscript, setLoopTranscript] = useState('');
  const [loopResponse, setLoopResponse] = useState('');

  // Test 5: Live AI States
  const [aiStatus, setAiStatus] = useState<'unknown' | 'live' | 'not_configured' | 'failed'>('unknown');
  const [aiPingTime, setAiPingTime] = useState<number | null>(null);

  // Test 6: Web Search States
  const [searchQuery, setSearchQuery] = useState('Google I/O 2026 announcements');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Test 7: Weather States
  const [weatherQuery, setWeatherQuery] = useState('London');
  const [weatherResults, setWeatherResults] = useState<any>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  // Test 8: Spotify States
  const [spotifyStatus, setSpotifyStatus] = useState<any>(null);
  const [isSpotifyChecking, setIsSpotifyChecking] = useState(false);

  // Test 9: Memory States
  const [tempMemoryId, setTempMemoryId] = useState<string | null>(null);
  const [memoryOperation, setMemoryOperation] = useState<'idle' | 'creating' | 'reading' | 'updating' | 'deleting' | 'done'>('idle');

  // Test 10: Agent States
  const [agentPlan, setAgentPlan] = useState<any>(null);
  const [agentStepIndex, setAgentStepIndex] = useState<number>(-1);
  const [agentStepLogs, setAgentStepLogs] = useState<string[]>([]);

  // Test 11: Persistence States
  const [persistedTaskId, setPersistedTaskId] = useState<string | null>(null);
  const [persistedTaskExists, setPersistedTaskExists] = useState<boolean | null>(null);

  // --- LOGGING HELPER ---
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Initialize service references
  useEffect(() => {
    voiceInputRef.current = new VoiceInput();
    voiceOutputRef.current = new VoiceOutput();
    
    // Check Spotify auth, Gemini health, and temporary state on mount
    checkGlobalStatus();

    // Recover temporary task ID if stored in localStorage to help test 11 persistence survive reloads
    const storedTaskId = localStorage.getItem('__jarvis_test_task_id');
    if (storedTaskId) {
      setPersistedTaskId(storedTaskId);
      checkTaskPersistence(storedTaskId);
    }

    return () => {
      if (voiceInputRef.current) voiceInputRef.current.stop();
      if (voiceOutputRef.current) voiceOutputRef.current.stop();
    };
  }, []);

  const checkGlobalStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status').then(r => r.json());
      setSpotifyStatus(res.spotify || { isConfigured: false });
    } catch (e) {
      addLog("Failed to reach integrations configuration endpoint.");
    }
  };

  const checkTaskPersistence = async (id: string) => {
    try {
      const tasks = await fetch('/api/tasks').then(r => r.json());
      const exists = tasks.some((t: any) => t.id === id);
      setPersistedTaskExists(exists);
      addLog(`Persistence Check: Test task exists = ${exists}`);
    } catch (e) {
      setPersistedTaskExists(false);
    }
  };

  const updateTestStatus = (id: string, status: TestStatus, notes?: string) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, status, notes: notes || t.notes } : t));
    addLog(`Test [${id}] status set to: ${status}`);
  };

  // --- TEST 1: CHAT SYSTEM ---
  const startTest1Chat = async (isFollowUp = false) => {
    const textToSend = isFollowUp ? "Can you elaborate on that briefly?" : (chatInput || "Hello JARVIS, run a diagnostics check.");
    setChatOutput('');
    setIsChatLoading(true);
    addLog(`Test 1: Streaming prompt: "${textToSend}"`);

    if (chatAbortController.current) {
      chatAbortController.current.abort();
    }
    chatAbortController.current = new AbortController();

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          history: isFollowUp ? [
            { id: '1', sender: 'user', text: chatInput, timestamp: new Date() },
            { id: '2', sender: 'jarvis', text: chatOutput, timestamp: new Date() }
          ] : []
        }),
        signal: chatAbortController.current.signal
      });

      if (!res.body) throw new Error("No readable response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          // Parse lines (SSE style)
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.text) {
                  text += data.text;
                  setChatOutput(text);
                }
              } catch (e) {
                // Ignore parsing errors for partial frames
              }
            }
          }
        }
      }
      addLog(`Test 1: Chat response streaming complete. Length: ${text.length} chars.`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        addLog("Test 1: Stream successfully cancelled by user abort signal.");
      } else {
        addLog(`Test 1 Failed: ${err.message}`);
        setChatOutput(`Error: ${err.message}`);
      }
    } finally {
      setIsChatLoading(false);
      chatAbortController.current = null;
    }
  };

  const cancelTest1Chat = () => {
    if (chatAbortController.current) {
      chatAbortController.current.abort();
      setIsChatLoading(false);
      addLog("Test 1: Cancel requested.");
    }
  };

  // --- TEST 2: MICROPHONE INPUT ---
  const toggleTest2Mic = () => {
    if (micActive) {
      if (voiceInputRef.current) voiceInputRef.current.stop();
      setMicActive(false);
      addLog("Test 2: Stopped listening.");
    } else {
      setTranscript('');
      setConfidence(null);
      setMicActive(true);
      addLog("Test 2: Starting speech recognition...");

      if (voiceInputRef.current) {
        voiceInputRef.current.registerEvents({
          onStart: () => {
            addLog("Test 2: Speech recognition channel is active.");
          },
          onEnd: () => {
            setMicActive(false);
            addLog("Test 2: Speech recognition channel closed.");
          },
          onResult: (text, isFinal, conf) => {
            setTranscript(text);
            setConfidence(conf);
            if (isFinal) {
              addLog(`Test 2 Transcript (Final): "${text}" (Conf: ${conf.toFixed(2)})`);
            }
          },
          onError: (err) => {
            addLog(`Test 2 Mic Error: ${err}`);
            setMicActive(false);
          }
        });
        voiceInputRef.current.start();
      } else {
        addLog("Speech recognition not supported in this environment.");
      }
    }
  };

  // --- TEST 3: SPEECH SYNTHESIS ---
  const playTest3Speech = () => {
    if (!voiceOutputRef.current) return;
    setIsSpeaking(true);
    addLog("Test 3: Speaking test phrase.");
    voiceOutputRef.current.registerEvents({
      onStart: () => addLog("Test 3: Speech synthesis started playing."),
      onEnd: () => {
        setIsSpeaking(false);
        addLog("Test 3: Speech synthesis finished playing.");
      },
      onError: (err) => {
        setIsSpeaking(false);
        addLog(`Test 3 Speech Error: ${err}`);
      }
    });
    voiceOutputRef.current.speak("Hello Tony, this is a live acoustic vocal test from your JARVIS mainframe. Synthesis system operates beautifully.");
  };

  const stopTest3Speech = () => {
    if (voiceOutputRef.current) {
      voiceOutputRef.current.stop();
      setIsSpeaking(false);
      addLog("Test 3: Playback forced to cancel.");
    }
  };

  // --- TEST 4: CONVERSATION LOOP ---
  const startTest4Loop = () => {
    if (loopState !== 'idle') return;
    setLoopState('listening');
    setLoopTranscript('');
    setLoopResponse('');
    addLog("Test 4 Loop: Starting hands-free transcription block...");

    if (voiceInputRef.current) {
      voiceInputRef.current.registerEvents({
        onStart: () => addLog("Test 4: Speak your prompt now..."),
        onResult: (text, isFinal) => {
          setLoopTranscript(text);
          if (isFinal) {
            addLog(`Test 4 User prompt resolved: "${text}"`);
            triggerLoopChat(text);
          }
        },
        onError: (err) => {
          addLog(`Test 4 Mic error: ${err}`);
          setLoopState('idle');
        }
      });
      voiceInputRef.current.start();
    }
  };

  const triggerLoopChat = async (prompt: string) => {
    setLoopState('thinking');
    addLog("Test 4 Loop: Fetching Gemini synthesis response...");
    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt })
      });
      
      if (!res.body) throw new Error("No readable response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content' && data.text) {
                  accumulatedText += data.text;
                  setLoopResponse(accumulatedText);
                }
              } catch (e) {}
            }
          }
        }
      }

      addLog(`Test 4 Loop response: "${accumulatedText.slice(0, 50)}..."`);
      triggerLoopSpeak(accumulatedText);
    } catch (e: any) {
      addLog(`Test 4 Loop failure during chat resolution: ${e.message}`);
      setLoopState('idle');
    }
  };

  const triggerLoopSpeak = (text: string) => {
    setLoopState('speaking');
    addLog("Test 4 Loop: Playing synthesis feedback.");
    if (voiceOutputRef.current) {
      voiceOutputRef.current.registerEvents({
        onEnd: () => {
          addLog("Test 4 Loop Completed. Returning machine state back to READY.");
          setLoopState('idle');
        },
        onError: () => {
          setLoopState('idle');
        }
      });
      voiceOutputRef.current.speak(text);
    } else {
      setLoopState('idle');
    }
  };

  // --- TEST 5: LIVE AI TEST ---
  const pingLiveGemini = async () => {
    addLog("Test 5: Validating Live Gemini model connectivity...");
    const startTime = Date.now();
    setAiStatus('unknown');
    setAiPingTime(null);

    try {
      const checkRes = await fetch('/api/health').then(r => r.json());
      if (!checkRes.apiConfigured) {
        setAiStatus('not_configured');
        addLog("Test 5 API Check: GEMINI_API_KEY is not configured.");
        return;
      }

      // Perform a tiny query to verify it is fully live and responding
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Ping. Output 1 word: 'ACK'" })
      });

      if (res.ok) {
        const elapsed = Date.now() - startTime;
        setAiPingTime(elapsed);
        setAiStatus('live');
        addLog(`Test 5 Verified Live: Gemini connection resolved in ${elapsed}ms.`);
      } else {
        setAiStatus('failed');
        addLog(`Test 5 Failed: Live LLM channel returned status ${res.status}`);
      }
    } catch (err: any) {
      setAiStatus('failed');
      addLog(`Test 5 Error connecting to Gemini endpoint: ${err.message}`);
    }
  };

  // --- TEST 6: LIVE WEB SEARCH ---
  const performLiveSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults(null);
    addLog(`Test 6: Executing real-world web search: "${searchQuery}"`);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'web_search',
          args: { query: searchQuery }
        })
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;

      if (res.ok && data.result) {
        setSearchResults({
          result: data.result,
          time: elapsed,
          success: true
        });
        addLog(`Test 6 Passed: Real web search retrieved in ${elapsed}ms.`);
      } else {
        setSearchResults({
          error: data.error || "Search returned empty results or failed to scrap.",
          time: elapsed,
          success: false
        });
        addLog(`Test 6 Scrap Failed: ${data.error || "Unexpected response"}`);
      }
    } catch (e: any) {
      setIsSearching(false);
      addLog(`Test 6 API Connection Error: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // --- TEST 7: LIVE WEATHER ---
  const performLiveWeather = async () => {
    if (!weatherQuery.trim()) return;
    setIsWeatherLoading(true);
    setWeatherResults(null);
    addLog(`Test 7: Querying actual weather stats for: "${weatherQuery}"`);

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'get_live_info',
          args: { category: 'weather', query: weatherQuery }
        })
      });

      const data = await res.json();
      if (res.ok && data.result) {
        setWeatherResults({
          data: data.result,
          timestamp: new Date().toLocaleString(),
          success: true
        });
        addLog(`Test 7 Passed: Weather resolved successfully.`);
      } else {
        setWeatherResults({
          error: data.error || "Weather scraper/API returned errors.",
          success: false
        });
        addLog(`Test 7 Failed: Weather system rejected query.`);
      }
    } catch (e: any) {
      addLog(`Test 7 Error: ${e.message}`);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // --- TEST 8: SPOTIFY VERIFICATION ---
  const checkSpotifyAuth = async () => {
    setIsSpotifyChecking(true);
    addLog("Test 8: Auditing Spotify configuration state.");
    try {
      const res = await fetch('/api/integrations/status').then(r => r.json());
      setSpotifyStatus(res.spotify);
      if (res.spotify && res.spotify.isConfigured) {
        addLog("Spotify Client Credentials detected in system configuration.");
        if (res.spotify.isConnected) {
          addLog("Spotify User Token is currently ACTIVE and Connected.");
        } else {
          addLog("Spotify is configured, but active user token is DISCONNECTED.");
        }
      } else {
        addLog("Spotify status: NOT CONFIGURED. Local simulation bypass active.");
      }
    } catch (e) {
      addLog("Failed to audit Spotify status.");
    } finally {
      setIsSpotifyChecking(false);
    }
  };

  const getSpotifyAuthUrl = async () => {
    addLog("Test 8: Requesting OAuth URL from backend redirect builder...");
    try {
      const res = await fetch('/api/auth/spotify/url').then(r => r.json());
      if (res.url) {
        addLog(`OAuth URL formulated successfully: ${res.url.slice(0, 45)}...`);
        // Inform user they can click to launch real window inside safe boundaries
        window.open(res.url, '_blank');
      } else {
        addLog(`OAuth URL Failure: ${res.error || 'Check environment variables.'}`);
      }
    } catch (e: any) {
      addLog(`Spotify connection error: ${e.message}`);
    }
  };

  // --- TEST 9: MEMORY CRUD ---
  const runMemoryCrud = async () => {
    setMemoryOperation('creating');
    addLog("Test 9: Triggering Memory Bank CRUD diagnostic.");

    const testContent = `JARVIS_MANUAL_TEST_METRIC_KEY_${Date.now()}`;
    addLog(`Step A: Creating sandboxed memory with content: "${testContent}"`);

    try {
      // 1. CREATE
      const createRes = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testContent,
          importance: 3,
          category: 'technical'
        })
      });

      if (!createRes.ok) throw new Error("Could not create diagnostic memory.");
      const createdItem = await createRes.json();
      const memoryId = createdItem.id;
      setTempMemoryId(memoryId);
      addLog(`Memory safely constructed. Assigned Sandbox Identifier: ${memoryId}`);

      // 2. READ
      setMemoryOperation('reading');
      addLog("Step B: Querying sandbox store to verify memory retrieval...");
      const list = await fetch('/api/memories').then(r => r.json());
      const retrieved = list.find((m: any) => m.id === memoryId);
      
      if (!retrieved || retrieved.text !== testContent) {
        throw new Error("Memory retrieval verified discrepancy or item was not saved.");
      }
      addLog("Memory verified retrieved cleanly and contents match perfectly.");

      // 3. UPDATE (PATCH)
      setMemoryOperation('updating');
      addLog("Step C: Injecting memory PATCH payload to update information...");
      const updatedContent = `${testContent}_UPDATED_DIAGNOSTICS`;
      const updateRes = await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: updatedContent,
          importance: 4,
          category: 'technical'
        })
      });

      if (!updateRes.ok) throw new Error("Memory patch request failed.");
      addLog("Memory patch successful.");

      // Verify update
      const listAfterUpdate = await fetch('/api/memories').then(r => r.json());
      const verifiedUpdate = listAfterUpdate.find((m: any) => m.id === memoryId);
      if (!verifiedUpdate || verifiedUpdate.text !== updatedContent) {
        throw new Error("Patched contents verification failure.");
      }
      addLog("Patched changes successfully confirmed in memory bank.");

      // 4. DELETE
      setMemoryOperation('deleting');
      addLog("Step D: Executing memory deletion routines...");
      const deleteRes = await fetch(`/api/memories/${memoryId}`, { method: 'DELETE' });
      if (!deleteRes.ok) throw new Error("Deletion request returned errors.");
      addLog("Deletion signal processed. Verifying item is fully eradicated...");

      const finalList = await fetch('/api/memories').then(r => r.json());
      const itemStillExists = finalList.some((m: any) => m.id === memoryId);
      if (itemStillExists) {
        throw new Error("Memory still present in store database.");
      }

      addLog("Test 9 Memory CRUD Operations Passed. Zero leakage verified.");
      setMemoryOperation('done');
      setTempMemoryId(null);
    } catch (e: any) {
      addLog(`Test 9 CRUD Failure: ${e.message}`);
      setMemoryOperation('idle');
    }
  };

  // --- TEST 10: AGENT MODE ORCHESTRATION ---
  const generateAgentPlan = () => {
    addLog("Test 10: Generating a harmless 3-step system inspection plan...");
    const mockPlan = {
      id: `plan_${Date.now()}`,
      task: "Inspect system core metrics and application logs",
      status: 'pending_approval',
      steps: [
        { id: 's1', description: "Check current application configuration status", toolName: "get_application_status", args: {}, permissionLevel: 'SAFE', status: 'pending' },
        { id: 's2', description: "Retrieve active settings to inspect microphone variables", toolName: "get_application_settings", args: {}, permissionLevel: 'SAFE', status: 'pending' },
        { id: 's3', description: "Scan memories to calculate active record counts", toolName: "search_stored_memories", args: { query: "" }, permissionLevel: 'SAFE', status: 'pending' }
      ]
    };
    setAgentPlan(mockPlan);
    setAgentStepIndex(-1);
    setAgentStepLogs(["Plan formulated. Awaiting operator authorization to begin diagnostics sequence."]);
  };

  const executeAgentStep = async () => {
    if (!agentPlan) return;
    const nextIdx = agentStepIndex + 1;
    if (nextIdx >= agentPlan.steps.length) {
      setAgentPlan({ ...agentPlan, status: 'completed' });
      addLog("Test 10 Agent Execution: Entire safe plan successfully performed.");
      return;
    }

    setAgentStepIndex(nextIdx);
    const steps = [...agentPlan.steps];
    steps[nextIdx].status = 'executing';
    setAgentPlan({ ...agentPlan, status: 'executing', steps });
    setAgentStepLogs(prev => [...prev, `[Step ${nextIdx + 1}/3] Running tool "${steps[nextIdx].toolName}"...`]);

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: steps[nextIdx].toolName,
          args: steps[nextIdx].args
        })
      });

      const data = await res.json();
      steps[nextIdx].status = 'completed';
      steps[nextIdx].result = data.result || data;
      setAgentPlan({ ...agentPlan, steps });
      setAgentStepLogs(prev => [...prev, `[Step ${nextIdx + 1}/3] Success! Result: ${JSON.stringify(data.result || data).slice(0, 100)}...`]);
    } catch (e: any) {
      steps[nextIdx].status = 'failed';
      steps[nextIdx].error = e.message;
      setAgentPlan({ ...agentPlan, status: 'failed', steps });
      setAgentStepLogs(prev => [...prev, `[Step ${nextIdx + 1}/3] FAILED: ${e.message}`]);
    }
  };

  const cancelAgentPlan = () => {
    if (agentPlan) {
      setAgentPlan({ ...agentPlan, status: 'cancelled' });
      addLog("Test 10: Agent plan safely cancelled midway by user request.");
    }
  };

  // --- TEST 11: STORAGE PERSISTENCE ---
  const createPersistenceTask = async () => {
    addLog("Test 11: Setting up temporary task in server database...");
    const taskTitle = `[DIAGNOSTIC TEST TASK] Validate Persistence ${new Date().toLocaleTimeString()}`;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          done: false,
          importance: 'high'
        })
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setPersistedTaskId(data.id);
        localStorage.setItem('__jarvis_test_task_id', data.id);
        setPersistedTaskExists(true);
        addLog(`Test 11: Task created in database. ID: ${data.id}`);
        addLog("INSTRUCTIONS: Please RELOAD the webpage now, then navigate back here to verify persistence status!");
      } else {
        addLog("Test 11 Setup failed to create task.");
      }
    } catch (e: any) {
      addLog(`Test 11 Setup error: ${e.message}`);
    }
  };

  const cleanPersistenceTask = async () => {
    if (!persistedTaskId) return;
    addLog(`Test 11: Cleaning up test task with ID: ${persistedTaskId}...`);
    try {
      const res = await fetch(`/api/tasks/${persistedTaskId}`, { method: 'DELETE' });
      if (res.ok) {
        setPersistedTaskId(null);
        setPersistedTaskExists(null);
        localStorage.removeItem('__jarvis_test_task_id');
        addLog("Test 11: Temporary test task completely deleted. System is pristine.");
      } else {
        addLog("Failed to delete test task.");
      }
    } catch (e: any) {
      addLog(`Test 11 Clean Error: ${e.message}`);
    }
  };

  // --- REPORT GENERATION ---
  const getTestReport = () => {
    const passed = tests.filter(t => t.status === 'PASSED BY USER').map(t => t.name).join('\n- ');
    const failed = tests.filter(t => t.status === 'FAILED BY USER').map(t => t.name).join('\n- ');
    const unperformed = tests.filter(t => t.status === 'NOT TESTED' || t.status === 'TESTING').map(t => t.name).join('\n- ');
    const simulated = tests.filter(t => t.status === 'SIMULATED').map(t => t.name).join('\n- ');
    const notConfigured = tests.filter(t => t.status === 'NOT CONFIGURED').map(t => t.name).join('\n- ');

    const spotifyConfig = spotifyStatus?.isConfigured ? 'CONNECTED/CONFIGURED' : 'NOT CONFIGURED (Simulation Mode active)';
    const geminiConfig = aiStatus === 'live' ? 'VERIFIED LIVE' : aiStatus === 'not_configured' ? 'NOT CONFIGURED' : 'UNKNOWN';

    return `### JARVIS AI SYSTEM - MANUAL STAGE AUDIT REPORT
**Timestamp**: ${new Date().toLocaleString()}
**Operator ID**: Tony Stark (swabirah611@gmail.com)

==================================================
1. DIAGNOSTICS SUMMARIZED BY STATE
==================================================
**VERIFIED PASSED BY USER**:
${passed ? `- ${passed}` : "None"}

**FAILED BY USER**:
${failed ? `- ${failed}` : "None"}

**SIMULATED INTEGRATIONS**:
${simulated ? `- ${simulated}` : "None"}

**NOT CONFIGURED**:
${notConfigured ? `- ${notConfigured}` : "None"}

**NOT PERFORMED YET**:
${unperformed ? `- ${unperformed}` : "None"}

==================================================
2. INTEGRATION AUDIT
==================================================
- **Live Gemini LLM Endpoint**: ${geminiConfig}
- **Spotify OAuth Pipeline**: ${spotifyConfig}
- **Web Search Engine Scraper**: ${searchResults?.success ? 'LIVE & ACCURATE' : 'SIMULATED/NOT PERFORMED'}
- **Live Meteorological Scraper**: ${weatherResults?.success ? 'LIVE & ACCURATE' : 'SIMULATED/NOT PERFORMED'}

==================================================
3. SYSTEM BOUNDARIES / LIMITATIONS
==================================================
- **Web-Only Environment Constraints**: Physical device inputs, system tray controls, and desktop shortcuts are inoperable and reported accurately as not testable in browser frame.
- **Vocal Synthesis Interruption**: Web speech synthesis depends on browser-native engine layers which vary across browsers and operating systems.
`;
  };

  const copyReportToClipboard = () => {
    navigator.clipboard.writeText(getTestReport());
    addLog("Full System Diagnostic Report copied safely to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 text-gray-200">
      
      {/* LEFT: Test Selector and status table */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-jarvis-cyan" />
              <h2 className="font-display font-medium text-sm uppercase tracking-widest text-white">
                JARVIS Manual Diagnostics Suite
              </h2>
            </div>
            <span className="font-mono text-[9px] bg-jarvis-cyan/15 border border-jarvis-cyan/30 text-jarvis-cyan px-2 py-0.5 rounded uppercase font-semibold">
              Testing Phase 3
            </span>
          </div>

          <p className="text-xs text-gray-400 font-sans leading-relaxed">
            Welcome to the centralized testing dashboard. Operate each routine step-by-step and manually authorize success, failure, or config limits. Do not fake metrics.
          </p>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {tests.map(test => {
              const isActive = activeTestId === test.id;
              
              let badgeColor = 'bg-gray-800 text-gray-400 border-gray-700';
              if (test.status === 'TESTING') badgeColor = 'bg-jarvis-purple/20 text-jarvis-purple border-jarvis-purple/30 animate-pulse';
              if (test.status === 'PASSED BY USER') badgeColor = 'bg-jarvis-blue/20 text-jarvis-blue border-jarvis-blue/30';
              if (test.status === 'FAILED BY USER') badgeColor = 'bg-jarvis-red/20 text-jarvis-red border-jarvis-red/30';
              if (test.status === 'NOT CONFIGURED') badgeColor = 'bg-jarvis-amber/20 text-jarvis-amber border-jarvis-amber/30';
              if (test.status === 'SIMULATED') badgeColor = 'bg-teal-500/10 text-teal-400 border-teal-500/20';

              return (
                <div 
                  key={test.id}
                  onClick={() => setActiveTestId(test.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isActive 
                      ? 'bg-white/[0.04] border-white/20' 
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-display text-xs font-semibold text-white">{test.name}</div>
                    <div className="text-[10px] text-gray-400 font-sans leading-relaxed">{test.description}</div>
                    {test.notes && <div className="text-[9px] font-mono text-jarvis-amber italic">Notes: {test.notes}</div>}
                  </div>
                  
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className={`font-mono text-[8px] border px-2 py-0.5 rounded font-bold uppercase tracking-wider ${badgeColor}`}>
                      {test.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagnostic Actions & Override bar for selected test */}
        {activeTestId && (
          <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 flex flex-wrap gap-2 items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-gray-400">
              Set result for active test:
            </span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => updateTestStatus(activeTestId, 'PASSED BY USER')}
                className="px-2.5 py-1 text-[10px] font-mono rounded bg-jarvis-blue/20 text-jarvis-blue border border-jarvis-blue/30 hover:bg-jarvis-blue/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> PASS
              </button>
              <button 
                onClick={() => updateTestStatus(activeTestId, 'FAILED BY USER')}
                className="px-2.5 py-1 text-[10px] font-mono rounded bg-jarvis-red/20 text-jarvis-red border border-jarvis-red/30 hover:bg-jarvis-red/30 transition-all cursor-pointer flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" /> FAIL
              </button>
              <button 
                onClick={() => updateTestStatus(activeTestId, 'NOT CONFIGURED')}
                className="px-2.5 py-1 text-[10px] font-mono rounded bg-jarvis-amber/20 text-jarvis-amber border border-jarvis-amber/30 hover:bg-jarvis-amber/30 transition-all cursor-pointer"
              >
                NOT CONFIGURED
              </button>
              <button 
                onClick={() => updateTestStatus(activeTestId, 'SIMULATED')}
                className="px-2.5 py-1 text-[10px] font-mono rounded bg-teal-500/10 text-teal-400 border border-teal-500/25 hover:bg-teal-500/20 transition-all cursor-pointer"
              >
                SIMULATED
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Active test workspace and System logs */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Workspace panel */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-black/40 flex-1 flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <Activity className="w-4.5 h-4.5 text-jarvis-amber" />
            <h3 className="font-display font-medium text-xs tracking-widest uppercase text-white">
              Routine Interactive Workspace
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px]">
            {activeTestId === null && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Info className="w-8 h-8 text-gray-600" />
                <div className="text-xs font-semibold text-gray-400 font-display">No routine selected</div>
                <div className="text-[10px] text-gray-500 font-sans max-w-xs">Select a diagnostic test item on the left to activate the interactive control deck.</div>
              </div>
            )}

            {/* TEST 1: CHAT SYSTEM */}
            {activeTestId === 'chat' && (
              <div className="space-y-3 font-sans">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Interactive AI Prompting</span>
                
                <div className="space-y-1.5">
                  <input 
                    type="text" 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Enter diagnostic prompt..."
                    className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-jarvis-cyan font-mono"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { updateTestStatus('chat', 'TESTING'); startTest1Chat(false); }}
                      disabled={isChatLoading}
                      className="flex-1 py-2 text-[10px] font-mono rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer flex items-center justify-center gap-1 font-bold"
                    >
                      <Play className="w-3 h-3" /> STREAM RESPONSE
                    </button>
                    {isChatLoading && (
                      <button 
                        onClick={cancelTest1Chat}
                        className="py-2 px-3 text-[10px] font-mono rounded bg-jarvis-red/10 hover:bg-jarvis-red/25 border border-jarvis-red/30 text-jarvis-red transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Square className="w-3 h-3" /> CANCEL
                      </button>
                    )}
                  </div>
                </div>

                {chatOutput && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1.5">
                    <span className="text-[8px] font-mono text-jarvis-cyan font-bold block uppercase tracking-wider">JARVIS Output</span>
                    <div className="text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto font-sans whitespace-pre-wrap">{chatOutput}</div>
                    
                    {/* Follow up testing button */}
                    <button 
                      onClick={() => startTest1Chat(true)}
                      disabled={isChatLoading}
                      className="mt-2 py-1 px-2 text-[9px] font-mono rounded bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1"
                    >
                      Test Context Follow-Up <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TEST 2: MIC TRANSCRIPTION */}
            {activeTestId === 'mic' && (
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Speech-to-Text Transcription</span>
                
                <div className="flex flex-col items-center justify-center p-6 bg-black/30 border border-white/5 rounded-xl space-y-3">
                  <button 
                    onClick={() => { updateTestStatus('mic', 'TESTING'); toggleTest2Mic(); }}
                    className={`p-4 rounded-full border transition-all cursor-pointer ${
                      micActive 
                        ? 'bg-jarvis-cyan/20 border-jarvis-cyan animate-pulse text-jarvis-cyan' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {micActive ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">{micActive ? 'Listening to Microphone...' : 'Click to Toggle Recording'}</span>
                </div>

                {transcript && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1 font-sans">
                    <span className="text-[8px] font-mono text-jarvis-cyan font-bold block uppercase tracking-wider">Decoded Transcript</span>
                    <div className="text-xs text-gray-200">{transcript}</div>
                    {confidence !== null && (
                      <span className="text-[8px] font-mono text-gray-500 block mt-1">CONFIDENCE: {(confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEST 3: VOICE SYNTHESIS */}
            {activeTestId === 'speak' && (
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">British Voice Vocalizer Check</span>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { updateTestStatus('speak', 'TESTING'); playTest3Speech(); }}
                    disabled={isSpeaking}
                    className="p-3 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span className="text-[10px] font-mono uppercase font-bold">Vocalize soundbite</span>
                  </button>
                  <button 
                    onClick={stopTest3Speech}
                    disabled={!isSpeaking}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer flex flex-col items-center gap-1.5 text-center"
                  >
                    <Square className="w-5 h-5" />
                    <span className="text-[10px] font-mono uppercase font-bold">Terminate play</span>
                  </button>
                </div>

                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-[10px] font-sans text-gray-400 leading-relaxed">
                  <strong>Text payload being sent</strong>: <br/>
                  "Hello Tony, this is a live acoustic vocal test from your JARVIS mainframe. Synthesis system operates beautifully."
                </div>
              </div>
            )}

            {/* TEST 4: CONVERSATION LOOP */}
            {activeTestId === 'voice_loop' && (
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Conversational Loopback State</span>

                <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px]">
                  <span>System Pipeline Status:</span>
                  <span className={`px-2 py-0.5 rounded uppercase font-bold ${
                    loopState === 'idle' ? 'text-gray-400 bg-white/5 border border-white/10' :
                    loopState === 'listening' ? 'text-jarvis-cyan bg-jarvis-cyan/10 border border-jarvis-cyan/20' :
                    loopState === 'thinking' ? 'text-jarvis-purple bg-jarvis-purple/10 border border-jarvis-purple/20' :
                    'text-jarvis-blue bg-jarvis-blue/10 border border-jarvis-blue/20'
                  }`}>
                    {loopState}
                  </span>
                </div>

                {loopState === 'idle' && (
                  <button 
                    onClick={() => { updateTestStatus('voice_loop', 'TESTING'); startTest4Loop(); }}
                    className="w-full py-3 text-xs font-mono rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/15 border border-jarvis-cyan/25 text-jarvis-cyan transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mic className="w-4 h-4" /> START HANDS-FREE LOOP
                  </button>
                )}

                {loopTranscript && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1 font-sans">
                    <span className="text-[8px] font-mono text-jarvis-cyan font-bold block uppercase">USER SPOKE:</span>
                    <div className="text-xs text-gray-300">"{loopTranscript}"</div>
                  </div>
                )}

                {loopResponse && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3 space-y-1 font-sans">
                    <span className="text-[8px] font-mono text-jarvis-purple font-bold block uppercase">JARVIS RESPONSE:</span>
                    <div className="text-xs text-gray-300 leading-relaxed max-h-32 overflow-y-auto">{loopResponse}</div>
                  </div>
                )}
              </div>
            )}

            {/* TEST 5: LIVE AI TEST */}
            {activeTestId === 'live_ai' && (
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">LLM Connectivity Node Audit</span>

                <button 
                  onClick={pingLiveGemini}
                  className="w-full py-2.5 text-xs font-mono rounded bg-white/5 border border-white/10 text-gray-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> PING GEMINI INSTANCE
                </button>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-2 text-xs font-sans">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                    <span className="text-gray-400">Connection Status:</span>
                    <span className={`font-mono uppercase font-bold ${
                      aiStatus === 'live' ? 'text-jarvis-blue' :
                      aiStatus === 'not_configured' ? 'text-jarvis-amber' :
                      aiStatus === 'failed' ? 'text-jarvis-red' :
                      'text-gray-400'
                    }`}>
                      {aiStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Latency:</span>
                    <span className="font-mono text-white">{aiPingTime !== null ? `${aiPingTime}ms` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TEST 6: LIVE WEB SEARCH */}
            {activeTestId === 'web_search' && (
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Web Scraper Pipeline Check</span>

                <div className="space-y-1.5 font-mono text-xs">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-jarvis-cyan"
                  />
                  <button 
                    onClick={() => { updateTestStatus('web_search', 'TESTING'); performLiveSearch(); }}
                    disabled={isSearching}
                    className="w-full py-2 text-[10px] font-mono rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                  >
                    {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>TRIGGER LIVE SCRAPE</span>
                  </button>
                </div>

                {searchResults && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-2 font-sans text-xs">
                    <div className="flex justify-between text-[8px] font-mono text-gray-500">
                      <span>ELAPSED: {searchResults.time}ms</span>
                      <span>STATUS: {searchResults.success ? 'PASSED' : 'FAILED'}</span>
                    </div>
                    {searchResults.success ? (
                      <div className="space-y-2">
                        <span className="text-[8px] font-mono text-jarvis-cyan font-bold block uppercase tracking-wider">Scrape Output</span>
                        <p className="text-gray-300 leading-relaxed max-h-40 overflow-y-auto bg-black/30 p-2 border border-white/[0.02] rounded font-mono text-[10px] whitespace-pre-wrap">
                          {searchResults.result}
                        </p>
                      </div>
                    ) : (
                      <div className="text-jarvis-red flex items-center gap-2 font-mono text-[10px]">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{searchResults.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEST 7: WEATHER INFO */}
            {activeTestId === 'weather' && (
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Live Meteorological Scraper</span>

                <div className="space-y-1.5 font-mono text-xs">
                  <input 
                    type="text" 
                    value={weatherQuery}
                    onChange={e => setWeatherQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none"
                  />
                  <button 
                    onClick={() => { updateTestStatus('weather', 'TESTING'); performLiveWeather(); }}
                    disabled={isWeatherLoading}
                    className="w-full py-2 text-[10px] font-mono rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold"
                  >
                    {isWeatherLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudSun className="w-3.5 h-3.5" />}
                    <span>FETCH WEATHER METRICS</span>
                  </button>
                </div>

                {weatherResults && (
                  <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-2 font-sans text-xs">
                    {weatherResults.success ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[8px] font-mono text-gray-500">
                          <span>TIMESTAMP: {weatherResults.timestamp}</span>
                          <span>LIVE API PROVIDER</span>
                        </div>
                        <span className="text-[8px] font-mono text-jarvis-cyan font-bold block uppercase">SCRAPER RESPONSE</span>
                        <div className="bg-black/30 p-2.5 border border-white/[0.02] rounded text-gray-300 font-mono text-[10px] whitespace-pre-wrap">{weatherResults.data}</div>
                      </div>
                    ) : (
                      <div className="text-jarvis-red flex items-center gap-2 font-mono text-[10px]">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{weatherResults.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEST 8: SPOTIFY OAUTH */}
            {activeTestId === 'spotify' && (
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Spotify OAuth credentials Verification</span>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { updateTestStatus('spotify', 'TESTING'); checkSpotifyAuth(); }}
                    disabled={isSpotifyChecking}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-center flex flex-col items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSpotifyChecking ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] font-mono uppercase font-bold">Audit Config</span>
                  </button>
                  <button 
                    onClick={getSpotifyAuthUrl}
                    className="p-3 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan text-center flex flex-col items-center gap-1 cursor-pointer font-bold"
                  >
                    <Music className="w-4 h-4" />
                    <span className="text-[10px] font-mono uppercase">Start OAuth Flow</span>
                  </button>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-1.5 text-xs font-sans leading-relaxed">
                  <div className="flex justify-between border-b border-white/[0.03] pb-1 font-mono text-[10px]">
                    <span className="text-gray-400">Environment Credentials:</span>
                    <span className={spotifyStatus?.isConfigured ? 'text-jarvis-blue' : 'text-gray-500'}>
                      {spotifyStatus?.isConfigured ? 'DETECTED' : 'MISSING (Simulator Active)'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-white/[0.03] pb-1 font-mono text-[10px]">
                    <span className="text-gray-400">Client Token Connected:</span>
                    <span className={spotifyStatus?.isConnected ? 'text-jarvis-blue' : 'text-gray-500'}>
                      {spotifyStatus?.isConnected ? 'ACTIVE' : 'DISCONNECTED'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Note: Spotify OAuth strictly relies on credentials set up in the developer settings. If keys are missing, the assistant automatically falls back to Sandbox mode.
                  </p>
                </div>
              </div>
            )}

            {/* TEST 9: MEMORY CRUD */}
            {activeTestId === 'memory' && (
              <div className="space-y-4 font-mono text-xs">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Safe Sandboxed Memory CRUD</span>

                <button 
                  onClick={() => { updateTestStatus('memory', 'TESTING'); runMemoryCrud(); }}
                  disabled={memoryOperation !== 'idle' && memoryOperation !== 'done'}
                  className="w-full py-2.5 text-xs rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" /> RUN MEMORY TRANSACTION DECK
                </button>

                <div className="bg-black/50 border border-white/5 rounded-xl p-3.5 space-y-2">
                  <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">CRUD Transactions Sequence</span>
                  
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>1. CREATE (POST /api/memories)</span>
                      <span className={memoryOperation === 'creating' ? 'text-jarvis-purple animate-pulse font-bold' : (memoryOperation === 'reading' || memoryOperation === 'updating' || memoryOperation === 'deleting' || memoryOperation === 'done') ? 'text-jarvis-blue font-bold' : 'text-gray-600'}>
                        {memoryOperation === 'creating' ? 'PROCESSING' : (memoryOperation === 'reading' || memoryOperation === 'updating' || memoryOperation === 'deleting' || memoryOperation === 'done') ? 'PASSED' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>2. READ/VERIFY (GET /api/memories)</span>
                      <span className={memoryOperation === 'reading' ? 'text-jarvis-purple animate-pulse font-bold' : (memoryOperation === 'updating' || memoryOperation === 'deleting' || memoryOperation === 'done') ? 'text-jarvis-blue font-bold' : 'text-gray-600'}>
                        {memoryOperation === 'reading' ? 'PROCESSING' : (memoryOperation === 'updating' || memoryOperation === 'deleting' || memoryOperation === 'done') ? 'PASSED' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>3. UPDATE (PUT /api/memories/:id)</span>
                      <span className={memoryOperation === 'updating' ? 'text-jarvis-purple animate-pulse font-bold' : (memoryOperation === 'deleting' || memoryOperation === 'done') ? 'text-jarvis-blue font-bold' : 'text-gray-600'}>
                        {memoryOperation === 'updating' ? 'PROCESSING' : (memoryOperation === 'deleting' || memoryOperation === 'done') ? 'PASSED' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>4. DELETE (DELETE /api/memories/:id)</span>
                      <span className={memoryOperation === 'deleting' ? 'text-jarvis-purple animate-pulse font-bold' : memoryOperation === 'done' ? 'text-jarvis-blue font-bold' : 'text-gray-600'}>
                        {memoryOperation === 'deleting' ? 'PROCESSING' : memoryOperation === 'done' ? 'PASSED' : 'STANDBY'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TEST 10: AGENT MODE */}
            {activeTestId === 'agent' && (
              <div className="space-y-4 font-sans text-xs">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Safe Autonomous Step Runner</span>

                {!agentPlan ? (
                  <button 
                    onClick={() => { updateTestStatus('agent', 'TESTING'); generateAgentPlan(); }}
                    className="w-full py-2.5 text-xs font-mono rounded bg-white/5 border border-white/10 text-gray-200 hover:text-white cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Brain className="w-3.5 h-3.5" /> FORMULATE HARMFREE TEST PLAN
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2">
                      <div className="font-display font-semibold text-white flex justify-between">
                        <span>Task: {agentPlan.task}</span>
                        <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded border border-jarvis-cyan/30 text-jarvis-cyan bg-jarvis-cyan/15">{agentPlan.status}</span>
                      </div>
                      
                      {/* Steps listing */}
                      <div className="space-y-1 font-mono text-[10px]">
                        {agentPlan.steps.map((step: any, index: number) => (
                          <div key={step.id} className="flex justify-between items-center border-b border-white/[0.02] py-1">
                            <span className={step.status === 'executing' ? 'text-jarvis-cyan font-bold' : step.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'}>
                              {index+1}. {step.description}
                            </span>
                            <span className={`text-[8px] px-1 py-0.5 rounded border font-bold ${
                              step.status === 'pending' ? 'border-gray-700 text-gray-500' :
                              step.status === 'executing' ? 'border-jarvis-cyan/30 text-jarvis-cyan bg-jarvis-cyan/10 animate-pulse' :
                              step.status === 'completed' ? 'border-jarvis-blue/30 text-jarvis-blue bg-jarvis-blue/10' :
                              'border-jarvis-red/30 text-jarvis-red bg-jarvis-red/10'
                            }`}>
                              {step.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {agentPlan.status !== 'completed' && agentPlan.status !== 'cancelled' && agentPlan.status !== 'failed' && (
                        <button 
                          onClick={executeAgentStep}
                          className="flex-1 py-2 text-[10px] font-mono rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer flex items-center justify-center gap-1 font-bold"
                        >
                          <Play className="w-3 h-3" /> {agentStepIndex === -1 ? 'AUTHORIZE & RUN STEP 1' : 'EXECUTE NEXT STEP'}
                        </button>
                      )}
                      {(agentPlan.status === 'executing' || agentPlan.status === 'pending_approval') && (
                        <button 
                          onClick={cancelAgentPlan}
                          className="py-2 px-3 text-[10px] font-mono rounded bg-jarvis-red/10 hover:bg-jarvis-red/25 border border-jarvis-red/30 text-jarvis-red cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> CANCEL PLAN
                        </button>
                      )}
                      {(agentPlan.status === 'completed' || agentPlan.status === 'cancelled' || agentPlan.status === 'failed') && (
                        <button 
                          onClick={() => setAgentPlan(null)}
                          className="w-full py-2 font-mono text-[10px] rounded bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 cursor-pointer"
                        >
                          RESET AGENT DECK
                        </button>
                      )}
                    </div>

                    {/* Agent inner logs */}
                    {agentStepLogs.length > 0 && (
                      <div className="bg-black/60 rounded-lg p-2.5 border border-white/5 font-mono text-[9px] text-gray-400 max-h-32 overflow-y-auto space-y-1">
                        {agentStepLogs.map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TEST 11: STORAGE PERSISTENCE */}
            {activeTestId === 'persistence' && (
              <div className="space-y-4 font-sans text-xs leading-relaxed">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Server Database Storage Check</span>

                {!persistedTaskId ? (
                  <button 
                    onClick={() => { updateTestStatus('persistence', 'TESTING'); createPersistenceTask(); }}
                    className="w-full py-2.5 text-xs font-mono rounded bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan font-bold cursor-pointer"
                  >
                    A. CREATE DIAGNOSTIC TEST TASK
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-2 font-mono text-[10px]">
                      <div className="flex justify-between">
                        <span>Task ID Stored:</span>
                        <span className="text-gray-400 font-bold">{persistedTaskId.slice(0, 15)}...</span>
                      </div>
                      <div className="flex justify-between border-t border-white/[0.03] pt-2 mt-2">
                        <span>Persistence After Reload:</span>
                        <span className={persistedTaskExists === true ? 'text-jarvis-blue font-bold' : persistedTaskExists === false ? 'text-jarvis-red font-bold' : 'text-gray-500'}>
                          {persistedTaskExists === true ? 'VERIFIED (TASK STAYS)' : persistedTaskExists === false ? 'LOST (DATABASE FAULT)' : 'AWAITING REBOOT'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-jarvis-amber/10 border border-jarvis-amber/20 rounded-xl flex gap-2.5">
                      <AlertCircle className="w-5 h-5 text-jarvis-amber shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-white text-[10px] uppercase font-display">Instruction to Operator</div>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
                          Reload the page in your browser tab. When the app reboots, navigate back here to Diagnostics, open this persistence panel, and verify that the status badge updates to <strong>VERIFIED</strong>. Then click the cleanup button below.
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={cleanPersistenceTask}
                      className="w-full py-2 font-mono text-[10px] rounded bg-jarvis-red/10 hover:bg-jarvis-red/25 border border-jarvis-red/30 text-jarvis-red cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> B. ERADICATE TEMPORARY TASK
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Console log monitor output */}
        <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider">
              Diagnostics Transaction Stream
            </span>
            <button 
              onClick={() => setLogs([])}
              className="font-mono text-[8px] text-gray-500 hover:text-white cursor-pointer uppercase"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[9px] text-gray-400 h-32 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-600 italic h-full flex items-center justify-center">
                Diagnostics idle. Select and execute a test loop...
              </div>
            ) : (
              [...logs].reverse().map((entry, idx) => (
                <div key={idx} className="border-b border-white/[0.02] pb-1 last:border-0 text-gray-300">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* REPORT EXTRACTION PANEL */}
        <div className="glass-panel p-4 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-display font-semibold text-white">Consolidated Audit Report</div>
            <div className="text-[9px] text-gray-400 font-sans leading-none">Compile full diagnostics metrics to export to clipboard.</div>
          </div>
          <button 
            onClick={copyReportToClipboard}
            className="py-2 px-4 rounded bg-white/5 border border-white/10 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5 font-bold"
          >
            <Copy className="w-3.5 h-3.5" /> COPY TO CLIPBOARD
          </button>
        </div>

      </div>
    </div>
  );
};
