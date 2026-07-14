/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Cpu, Mic, Sliders, Volume2, Shield, Eye, HelpCircle, Save,
  Link2
} from 'lucide-react';
import { SettingsState } from '../types';

interface SettingsPanelProps {
  settings: SettingsState;
  onUpdateSettings: (updater: (prev: SettingsState) => SettingsState) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdateSettings }) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'ai' | 'voice' | 'hardware' | 'appearance' | 'privacy'>('ai');
  
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [microphones, setMicrophones] = React.useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = React.useState<MediaDeviceInfo[]>([]);

  React.useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const updateDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          // Temporarily request mic permission to let labels populate if not done already
          await navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            stream.getTracks().forEach(t => t.stop());
          }).catch(() => null);

          const allDevices = await navigator.mediaDevices.enumerateDevices();
          setMicrophones(allDevices.filter(d => d.kind === 'audioinput'));
          setSpeakers(allDevices.filter(d => d.kind === 'audiooutput'));
        }
      } catch (err) {
        console.warn("[SettingsPanel] Failed to retrieve audio devices:", err);
      }
    };
    updateDevices();
  }, []);

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

  // Sub-tabs of settings
  const subTabs = [
    { id: 'ai', label: 'AI Engine', icon: Cpu, desc: 'Model parameters & guidelines' },
    { id: 'voice', label: 'Voice Profile', icon: Volume2, desc: 'Speech and audio profiles' },
    { id: 'hardware', label: 'Hardware Integration', icon: Mic, desc: 'Microphone & sensor mapping' },
    { id: 'appearance', label: 'Appearance', icon: Sliders, desc: 'Themes & dynamic motion' },
    { id: 'privacy', label: 'Privacy & Sync', icon: Shield, desc: 'Data security & logging rules' },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-2xl border border-white/5 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]"
    >
      {/* Settings Navigation Column */}
      <div className="md:col-span-4 bg-black/40 border-r border-white/5 p-4 space-y-4">
        <div className="flex items-center gap-2.5 px-2 pb-2 border-b border-white/5">
          <Settings className="w-4 h-4 text-jarvis-cyan" />
          <h2 className="font-display font-medium text-xs tracking-widest text-white uppercase">
            Configuration Matrix
          </h2>
        </div>

        <div className="space-y-1">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-all group cursor-pointer ${
                  isActive 
                    ? 'bg-white/[0.04] border border-white/10 text-white' 
                    : 'border border-transparent hover:bg-white/[0.02] text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 transition-colors ${
                  isActive ? 'text-jarvis-cyan' : 'text-gray-500 group-hover:text-gray-400'
                }`} />
                <div className="space-y-0.5">
                  <div className="text-xs font-display font-medium leading-none">{tab.label}</div>
                  <div className="text-[10px] text-gray-500 font-sans font-light leading-none">{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-4 border-t border-white/5 space-y-2">
          <div className="p-3.5 rounded-xl border border-jarvis-cyan/15 bg-jarvis-cyan/5 text-gray-300 space-y-2 font-sans text-[11px]">
            <div className="flex items-center gap-2 text-white font-medium">
              <Link2 className="w-4 h-4 text-jarvis-cyan" />
              <span>Real-World Integrations</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              Manage API keys, toggle Spotify Sandboxing, connect desktop actions, and audit security permissions directly from the main <strong>Integrations</strong> console tab.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-white/5 px-2 text-[10px] font-mono text-gray-600 uppercase space-y-1 select-none">
          <div>Platform: AI Studio Shell</div>
          <div>Registry: config.json (ready)</div>
        </div>
      </div>

      {/* Settings Content Column */}
      <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between">
        
        {/* Dynamic content sections */}
        <div className="space-y-6">
          {activeSubTab === 'ai' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-medium text-sm text-white">AI Model & Directives</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Configure the primary server-side generative engine parameters. (Pre-configured placeholders for Stage 2).
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-gray-400 uppercase">Core Language Model</label>
                  <select
                    value={settings.ai.modelName}
                    onChange={(e) => updateSetting('ai', 'modelName', e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Precision)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Temperature (Creativity)</label>
                    <span className="font-mono text-[10px] text-jarvis-cyan font-medium">{settings.ai.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.ai.temperature}
                    onChange={(e) => updateSetting('ai', 'temperature', parseFloat(e.target.value))}
                    className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-gray-600">
                    <span>Deterministic (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-gray-400 uppercase">System Directives & Instructions</label>
                  <textarea
                    rows={4}
                    value={settings.ai.systemInstruction}
                    onChange={(e) => updateSetting('ai', 'systemInstruction', e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-jarvis-cyan/30 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'voice' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-medium text-sm text-white">Voice & Speech Profile</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Configure speech synthesis vocal textures, playback volumes, language locales, and conversational triggering modes.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Vocal Persona (System Voice)</label>
                    <select
                      value={settings.voice.voiceId}
                      onChange={(e) => updateSetting('voice', 'voiceId', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="jarvis-classic">Jarvis Classic (British Male Default)</option>
                      {voices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="font-mono text-[9px] text-gray-400 uppercase">Vocal Volume</label>
                      <span className="font-mono text-[10px] text-jarvis-cyan">{Math.round(settings.voice.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.voice.volume}
                      onChange={(e) => updateSetting('voice', 'volume', parseFloat(e.target.value))}
                      className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Input Capture Language</label>
                    <select
                      value={settings.voice.inputLanguage}
                      onChange={(e) => updateSetting('voice', 'inputLanguage', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="en-GB">English (United Kingdom)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="de-DE">German (Germany)</option>
                      <option value="it-IT">Italian (Italy)</option>
                      <option value="ja-JP">Japanese (Japan)</option>
                      <option value="zh-CN">Chinese (Simplified)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Output Speech Language</label>
                    <select
                      value={settings.voice.outputLanguage}
                      onChange={(e) => updateSetting('voice', 'outputLanguage', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="en-GB">English (United Kingdom)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="de-DE">German (Germany)</option>
                      <option value="it-IT">Italian (Italy)</option>
                      <option value="ja-JP">Japanese (Japan)</option>
                      <option value="zh-CN">Chinese (Simplified)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="font-mono text-[9px] text-gray-400 uppercase">Speech Rate (Speed)</label>
                      <span className="font-mono text-[10px] text-jarvis-cyan">{settings.voice.rate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.voice.rate}
                      onChange={(e) => updateSetting('voice', 'rate', parseFloat(e.target.value))}
                      className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="font-mono text-[9px] text-gray-400 uppercase">Pitch Frequency</label>
                      <span className="font-mono text-[10px] text-jarvis-cyan">{settings.voice.pitch}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.voice.pitch}
                      onChange={(e) => updateSetting('voice', 'pitch', parseFloat(e.target.value))}
                      className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Conversation Silence Timeout</label>
                    <span className="font-mono text-[10px] text-jarvis-cyan">{settings.voice.conversationTimeout} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={settings.voice.conversationTimeout}
                    onChange={(e) => updateSetting('voice', 'conversationTimeout', parseFloat(e.target.value))}
                    className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-gray-600">
                    <span>Aggressive (1s)</span>
                    <span>Generous (5s)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-medium text-white font-display">Voice Activation (VAD)</div>
                      <div className="text-[10px] text-gray-500 font-sans">Hands-free automatic dialogue triggers</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.voice.voiceActivation}
                      onChange={(e) => {
                        updateSetting('voice', 'voiceActivation', e.target.checked);
                        // sync with old alwaysListening flag for backward compatibility
                        updateSetting('voice', 'alwaysListening', e.target.checked);
                      }}
                      className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-medium text-white font-display">Push-To-Talk (PTT)</div>
                      <div className="text-[10px] text-gray-500 font-sans">Manual clicks instead of silence timers</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.voice.pushToTalk}
                      onChange={(e) => updateSetting('voice', 'pushToTalk', e.target.checked)}
                      className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-medium text-white font-display">Vocal Interruption Mode</div>
                    <div className="text-[10px] text-gray-500 font-sans">Allows you to interrupt JARVIS while speaking by simply talking</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.voice.interruptionEnabled ?? false}
                    onChange={(e) => updateSetting('voice', 'interruptionEnabled', e.target.checked)}
                    className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Wake Word Sub-Matrix */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                  <span className="font-mono text-[9px] text-jarvis-cyan uppercase tracking-wider block">
                    Wake Word Detection Engine
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-2.5 rounded bg-black/30 border border-white/5">
                      <div className="space-y-0.5">
                        <div className="text-xs text-white font-display">Continuous Wake Word</div>
                        <div className="text-[9px] text-gray-500">Listen for phrase to awake from STANDBY</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.voice.wakeWordEnabled}
                        onChange={(e) => updateSetting('voice', 'wakeWordEnabled', e.target.checked)}
                        className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded bg-black/30 border border-white/5">
                      <div className="space-y-0.5">
                        <div className="text-xs text-white font-display">Follow-up Dialogue Loop</div>
                        <div className="text-[9px] text-gray-500">Allow follow-up queries without repeating wake phrase</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.voice.followUpEnabled}
                        onChange={(e) => updateSetting('voice', 'followUpEnabled', e.target.checked)}
                        className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 cursor-pointer"
                      />
                    </div>
                  </div>

                  {settings.voice.wakeWordEnabled && (
                    <div className="space-y-3 pt-1 border-t border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-mono text-[8px] text-gray-400 uppercase">Detection Phrase</label>
                          <input
                            type="text"
                            value={settings.voice.wakePhrase}
                            onChange={(e) => updateSetting('voice', 'wakePhrase', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <label className="font-mono text-[8px] text-gray-400 uppercase">Return to Standby Timeout</label>
                            <span className="font-mono text-[9px] text-jarvis-cyan">{settings.voice.returnToStandbyTimeout}s</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="30"
                            step="1"
                            value={settings.voice.returnToStandbyTimeout}
                            onChange={(e) => updateSetting('voice', 'returnToStandbyTimeout', parseInt(e.target.value))}
                            className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded cursor-pointer appearance-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="font-mono text-[8px] text-gray-400 uppercase">Word Sensitivity Threshold</label>
                          <span className="font-mono text-[9px] text-jarvis-cyan">{settings.voice.wakeSensitivity}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          value={settings.voice.wakeSensitivity}
                          onChange={(e) => updateSetting('voice', 'wakeSensitivity', parseInt(e.target.value))}
                          className="w-full accent-jarvis-cyan h-1 bg-white/10 rounded cursor-pointer appearance-none"
                        />
                        <div className="flex justify-between text-[8px] font-mono text-gray-600">
                          <span>Loose (10%)</span>
                          <span>Strict (100%)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'hardware' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-medium text-sm text-white">Audio Hardware & Capture</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Configure hardware input/output capture drivers, pre-amplification parameters, and echo cancellations.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Primary Input Device (Microphone)</label>
                    <select
                      value={settings.microphone.deviceId}
                      onChange={(e) => updateSetting('microphone', 'deviceId', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="default">Default OS Capture Driver</option>
                      {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                          {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Primary Output Device (Speaker)</label>
                    <select
                      value={settings.microphone.speakerId}
                      onChange={(e) => updateSetting('microphone', 'speakerId', e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                    >
                      <option value="default">Default OS Speaker Driver</option>
                      {speakers.map((spk) => (
                        <option key={spk.deviceId} value={spk.deviceId}>
                          {spk.label || `Speaker ${spk.deviceId.substring(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="font-mono text-[9px] text-gray-400 uppercase">Input Pre-Amplification Gain</label>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-medium text-white font-display">Noise Suppression</div>
                      <div className="text-[10px] text-gray-500 font-sans">Filter ambient environmental noise from input feeds</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.microphone.noiseSuppression}
                      onChange={(e) => updateSetting('microphone', 'noiseSuppression', e.target.checked)}
                      className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-xs font-medium text-white font-display">Acoustic Echo Cancellation</div>
                      <div className="text-[10px] text-gray-500 font-sans">Prevent audio loopbacks and speaker feedback</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.microphone.echoCancellation}
                      onChange={(e) => updateSetting('microphone', 'echoCancellation', e.target.checked)}
                      className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'appearance' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-medium text-sm text-white">Interface Customization</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Fine-tune the appearance, active graphics, and cinematic canvas features of the shell.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-gray-400 uppercase">Visual Layout Theme</label>
                  <select
                    value={settings.appearance.theme}
                    onChange={(e) => updateSetting('appearance', 'theme', e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan/30"
                  >
                    <option value="dark-cinematic">Dark Cinematic Slate (Recommended)</option>
                    <option value="dark-pure">Deep Obsidian Pure Black</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-gray-400 uppercase">Display Accent Color</label>
                  <div className="flex gap-2.5 pt-1">
                    {[
                      { id: '#00f0ff', name: 'cyan', class: 'bg-jarvis-cyan' },
                      { id: '#0070f3', name: 'blue', class: 'bg-jarvis-blue' },
                      { id: '#7928ca', name: 'purple', class: 'bg-jarvis-purple' },
                      { id: '#ffaa00', name: 'amber', class: 'bg-jarvis-amber' },
                      { id: '#ff0055', name: 'red', class: 'bg-jarvis-red' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => updateSetting('appearance', 'accentColor', col.id)}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                          settings.appearance.accentColor === col.id 
                            ? 'border-white scale-105 shadow-md' 
                            : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full ${col.class}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-medium text-white font-display">Respect Reduced Motion</div>
                    <div className="text-[10px] text-gray-500 font-sans">Disable complex circular core spins and ripple animations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.appearance.reducedMotion}
                    onChange={(e) => updateSetting('appearance', 'reducedMotion', e.target.checked)}
                    className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'privacy' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-display font-medium text-sm text-white">Security, Logging & Privacy</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                  Manage the local privacy sandboxes and remote sync protocols. (Placeholders for secure state storage).
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-medium text-white font-display">Store Local Conversation Logs</div>
                    <div className="text-[10px] text-gray-500 font-sans">Retain dialogue context securely in local state arrays</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacy.storeLogs}
                    onChange={(e) => updateSetting('privacy', 'storeLogs', e.target.checked)}
                    className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                  <div className="space-y-0.5 pr-4">
                    <div className="text-xs font-medium text-white font-display">End-To-End Memory Encryption</div>
                    <div className="text-[10px] text-gray-500 font-sans">Encrypt context indices prior to local browser saves</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.privacy.encryptedMemory}
                    onChange={(e) => updateSetting('privacy', 'encryptedMemory', e.target.checked)}
                    className="w-4 h-4 rounded accent-jarvis-cyan bg-white/5 border-white/10"
                  />
                </div>

                <div className="p-3 border border-jarvis-red/25 bg-jarvis-red/5 rounded-xl space-y-2">
                  <div className="text-xs font-medium text-white flex items-center gap-1.5 font-display">
                    Danger Zone: Reset Engine State
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                    Clearing cache forces the state model back to defaults and empties local diagnostic simulation memory.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear entire client-side cache and configurations?')) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="text-[10px] font-mono tracking-wider text-white hover:text-white bg-jarvis-red/20 hover:bg-jarvis-red/30 px-3 py-1.5 rounded-lg border border-jarvis-red/40 transition-colors uppercase cursor-pointer"
                    >
                      Clear Cache & Reload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Re-launch first-time onboarding calibration wizard?')) {
                          localStorage.removeItem("jarvis_onboarding_completed");
                          window.location.reload();
                        }
                      }}
                      className="text-[10px] font-mono tracking-wider text-jarvis-cyan hover:bg-jarvis-cyan/15 px-3 py-1.5 rounded-lg border border-jarvis-cyan/30 bg-jarvis-cyan/5 transition-colors uppercase cursor-pointer"
                    >
                      Re-launch Onboarding
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Footer Message */}
        <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500 mt-6">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-gray-500" />
            <span>Configured parameters are maintained in local state</span>
          </div>
          <span className="text-jarvis-cyan font-semibold">Active Profile: DEFAULT</span>
        </div>
      </div>
    </motion.div>
  );
};
