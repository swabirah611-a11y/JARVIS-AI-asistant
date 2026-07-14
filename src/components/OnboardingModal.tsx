/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Mic, Volume2, Shield, Eye, HelpCircle, Save, Check,
  User, Cpu, Bell, Folder, Music, ArrowRight, ArrowLeft, VolumeX
} from 'lucide-react';
import { SettingsState } from '../types';

interface OnboardingModalProps {
  settings: SettingsState;
  onUpdateSettings: (updater: (prev: SettingsState) => SettingsState) => void;
  onComplete: (preferredName: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  settings, 
  onUpdateSettings, 
  onComplete 
}) => {
  const [step, setStep] = useState(1);
  const [preferredName, setPreferredName] = useState('Tony');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>('default');
  
  // Local folder approvals list
  const [folderInput, setFolderInput] = useState('');
  const [approvedFolders, setApprovedFolders] = useState<string[]>(['~/Projects', '~/Documents/JARVIS']);

  // Real-time microphone audio feedback testing
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testVolume, setTestVolume] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);
  const [animationId, setAnimationId] = useState<number | null>(null);

  useEffect(() => {
    // 1. Fetch system Synthesis voices
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    // 2. Fetch available media hardware
    const updateDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          setMicrophones(allDevices.filter(d => d.kind === 'audioinput'));
          setSpeakers(allDevices.filter(d => d.kind === 'audiooutput'));
        }
      } catch (err) {
        console.warn("[Onboarding] Failed to query media hardware list:", err);
      }
    };
    updateDevices();

    // 3. Sync initial permission statuses
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  // Request browser notification permissions
  const requestNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
    }
  };

  // Add folder mapping helpers
  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderInput.trim() && !approvedFolders.includes(folderInput.trim())) {
      setApprovedFolders([...approvedFolders, folderInput.trim()]);
      setFolderInput('');
    }
  };

  const handleRemoveFolder = (folder: string) => {
    setApprovedFolders(approvedFolders.filter(f => f !== folder));
  };

  // Toggle active microphone testing feedback meter
  const toggleMicTest = async () => {
    if (isTestingMic) {
      // Turn off mic stream
      if (animationId) cancelAnimationFrame(animationId);
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      setAudioStream(null);
      setAudioAnalyser(null);
      setTestVolume(0);
      setIsTestingMic(false);
    } else {
      try {
        // Request lightweight stream cleanly
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: settings.microphone.deviceId === 'default' 
            ? true 
            : { deviceId: { exact: settings.microphone.deviceId } } 
        });
        
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        setAudioStream(stream);
        setAudioAnalyser(analyser);
        setIsTestingMic(true);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateMeter = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setTestVolume(avg / 128); // map average value between 0.0 and 1.0
          const frameId = requestAnimationFrame(updateMeter);
          setAnimationId(frameId);
        };
        updateMeter();
      } catch (err) {
        console.warn("[Onboarding] Failed to start microphone hardware preview:", err);
      }
    }
  };

  // Clean up mic test on unmount
  useEffect(() => {
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream, animationId]);

  const updateSetting = <K extends keyof SettingsState>(
    section: K,
    key: keyof SettingsState[K],
    value: any
  ) => {
    onUpdateSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleFinish = async () => {
    // Save approved directory tags or files metadata if necessary
    localStorage.setItem("jarvis_approved_folders", JSON.stringify(approvedFolders));
    localStorage.setItem("jarvis_onboarding_completed", "true");
    
    // Attempt saving preferred user profile on backend
    try {
      await fetch('/api/context/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredName,
          approvedFolders,
          useMemories: settings.memory.longTermEnabled,
          useProjects: true,
          useTasks: true,
          useCalendar: true
        })
      });
    } catch (e) {
      console.warn("[Onboarding] Failed to push parameters to backend privacy profile:", e);
    }

    onComplete(preferredName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-[#090d15] border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]"
      >
        {/* Onboarding Header */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-jarvis-cyan/10 via-transparent to-transparent flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-jarvis-cyan animate-pulse" />
            <div>
              <h1 className="font-display font-semibold text-sm tracking-widest text-white uppercase">
                JARVIS System Initialization
              </h1>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wide">
                Calibration Sequence — Stage {step} of 4
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span 
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-4 bg-jarvis-cyan' : i < step ? 'bg-jarvis-cyan/40' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Steps Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[380px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-display text-white font-medium flex items-center gap-2">
                    <User className="w-5 h-5 text-jarvis-cyan" />
                    Who is the System Architect?
                  </h2>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Identify yourself. JARVIS adapts conversational directives, system responses, and summaries based on your preferred name.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block font-mono text-[9px] text-gray-500 uppercase">Preferred Designation</label>
                  <input 
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="Tony, Swabirah, or Guest..."
                    className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-jarvis-cyan/30"
                  />
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <Bell className="w-4 h-4 text-jarvis-cyan" />
                      Proactive Push Notifications
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      Receive alerts on meeting clashes, daily tasks, background reminder fires, and active Spotify sandbox updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={requestNotifications}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      notificationStatus === 'granted' 
                        ? 'bg-jarvis-cyan/10 border-jarvis-cyan/30 text-jarvis-cyan' 
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {notificationStatus === 'granted' ? 'Approved' : 'Grant Perm'}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-display text-white font-medium flex items-center gap-2">
                    <Mic className="w-5 h-5 text-jarvis-cyan" />
                    Acoustic Calibration
                  </h2>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Map standard OS capture and output drivers, calibrate pre-amplification thresholds, and check live volume decibel responses.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-500 uppercase">Input Device (Microphone)</label>
                    <select
                      value={settings.microphone.deviceId}
                      onChange={(e) => updateSetting('microphone', 'deviceId', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="default">Default OS Mic</option>
                      {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || `Mic ${mic.deviceId.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-500 uppercase">Output Device (Speaker)</label>
                    <select
                      value={settings.microphone.speakerId}
                      onChange={(e) => updateSetting('microphone', 'speakerId', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="default">Default Speaker</option>
                      {speakers.map((spk) => (
                        <option key={spk.deviceId} value={spk.deviceId}>
                          {spk.label || `Speaker ${spk.deviceId.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="font-mono text-[9px] text-gray-500 uppercase">Pre-Amp Gain</label>
                      <span className="font-mono text-[10px] text-jarvis-cyan">{settings.microphone.gain}dB</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={settings.microphone.gain}
                      onChange={(e) => updateSetting('microphone', 'gain', parseInt(e.target.value))}
                      className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-500 uppercase">Acoustic Testing Feed</label>
                    <button
                      type="button"
                      onClick={toggleMicTest}
                      className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg border text-xs font-display transition-colors cursor-pointer ${
                        isTestingMic 
                          ? 'bg-jarvis-red/15 border-jarvis-red/30 text-jarvis-red hover:bg-jarvis-red/25' 
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      {isTestingMic ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Stop Sensor Probe</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>Probe Mic Feed</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Real-time mic indicator meter */}
                {isTestingMic && (
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono text-[8px] text-gray-600 uppercase">
                      <span>Spectral Level Monitor</span>
                      <span>RMS: {(testVolume * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/5 flex gap-0.5 p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-jarvis-cyan to-jarvis-blue rounded-full transition-all duration-75"
                        style={{ width: `${Math.min(100, testVolume * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-display text-white font-medium flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-jarvis-cyan" />
                    AI Core & Synthesis Voice
                  </h2>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Select the generative engine model, configure vocal synthetic persona speeds, and activate continuous wake-word standby triggers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-500 uppercase">Vocal Persona</label>
                    <select
                      value={settings.voice.voiceId}
                      onChange={(e) => updateSetting('voice', 'voiceId', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                    >
                      <option value="jarvis-classic">Jarvis Classic (British Male)</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-500 uppercase">AI Model Mapping</label>
                    <select
                      value={settings.ai.modelName}
                      onChange={(e) => updateSetting('ai', 'modelName', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Precision)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-white font-display">Hands-Free Wake Phrase</div>
                      <div className="text-[9px] text-gray-500 font-sans">Listen for "Hey JARVIS" continuously</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.voice.wakeWordEnabled}
                      onChange={(e) => updateSetting('voice', 'wakeWordEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-jarvis-cyan cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-white font-display">Vocal Interruption</div>
                      <div className="text-[9px] text-gray-500 font-sans">Interrupt speaker simply by speaking</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.voice.interruptionEnabled}
                      onChange={(e) => updateSetting('voice', 'interruptionEnabled', e.target.checked)}
                      className="w-4 h-4 rounded accent-jarvis-cyan cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-white font-display">Memory Storage Retention</div>
                    <div className="text-[9px] text-gray-500 font-sans">Retain dialogue contexts in long-term local indices</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.memory.longTermEnabled}
                    onChange={(e) => updateSetting('memory', 'longTermEnabled', e.target.checked)}
                    className="w-4 h-4 rounded accent-jarvis-cyan cursor-pointer"
                  />
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <h2 className="text-base font-display text-white font-medium flex items-center gap-2">
                    <Folder className="w-5 h-5 text-jarvis-cyan" />
                    Directory Clearances & Integrations
                  </h2>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Grant workspace index access to local folders and activate optional services. Unselected integrations will run in local simulation mode.
                  </p>
                </div>

                {/* Directory Approved Mapping */}
                <div className="space-y-2 pt-1">
                  <label className="block font-mono text-[9px] text-gray-500 uppercase">Approved Workspace Directories</label>
                  <form onSubmit={handleAddFolder} className="flex gap-2">
                    <input 
                      type="text"
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                      placeholder="e.g., ~/Desktop/Notes"
                      className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-jarvis-cyan/15 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Authorize
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {approvedFolders.map((f) => (
                      <span 
                        key={f}
                        onClick={() => handleRemoveFolder(f)}
                        className="px-2 py-1 bg-white/5 hover:bg-jarvis-red/20 hover:text-jarvis-red transition-all border border-white/5 text-[10px] rounded-md font-mono cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{f}</span>
                        <span className="text-[8px] font-bold">×</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Integrations sandbox indicator list */}
                <div className="space-y-1.5 pt-1">
                  <label className="block font-mono text-[9px] text-gray-500 uppercase">Active Core Sandboxes</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border border-white/5 bg-white/[0.01] rounded flex items-center gap-2 text-[11px] text-gray-300">
                      <Music className="w-3.5 h-3.5 text-jarvis-cyan" />
                      <span>Spotify Integration</span>
                    </div>
                    <div className="p-2 border border-white/5 bg-white/[0.01] rounded flex items-center gap-2 text-[11px] text-gray-300">
                      <Cpu className="w-3.5 h-3.5 text-jarvis-cyan" />
                      <span>wttr.in Weather</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Onboarding Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-medium border border-white/10 text-gray-300 transition-colors cursor-pointer ${
              step === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-jarvis-cyan hover:bg-jarvis-cyan/90 text-black rounded-xl text-xs font-display font-semibold shadow-lg shadow-jarvis-cyan/15 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-jarvis-cyan to-jarvis-blue hover:brightness-110 text-black rounded-xl text-xs font-display font-bold shadow-lg shadow-jarvis-cyan/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
              <span>Initialize System</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
