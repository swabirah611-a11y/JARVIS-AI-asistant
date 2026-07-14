/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssistantState, SettingsState } from '../../types';
import { AudioSessionManager } from './AudioSessionManager';
import { NoiseDetection } from './NoiseDetection';
import { VoiceInput } from './VoiceInput';
import { VoiceOutput } from './VoiceOutput';
import { WakeStateController } from './WakeStateController';
import { WakeWordEngine } from './WakeWordEngine';

export interface ConversationControllerCallbacks {
  onStateChange: (state: AssistantState) => void;
  onTranscriptChange: (text: string, isFinal: boolean) => void;
  onFinalTranscript: (text: string) => void;
  onError: (errorMsg: string) => void;
  onSystemCommand?: (command: 'clear-logs' | 'demo-on' | 'demo-off' | 'stop-listening' | 'stop-speaking' | 'reset-system') => void;
}

/**
 * Conversation Controller
 * Central coordinator and guard for the entire Voice State Machine.
 * Enforces strict single-state constraints: never listens while speaking,
 * never speaks while listening, and resolves voice segments gracefully.
 */
export class ConversationController {
  private static instance: ConversationController | null = null;

  private state: AssistantState = AssistantState.IDLE;
  private settings: SettingsState | null = null;

  // Independent modular components
  private audioSession: AudioSessionManager;
  private noiseDetection: NoiseDetection;
  private voiceInput: VoiceInput;
  private voiceOutput: VoiceOutput;
  private wakeState: WakeStateController;
  private wakeWordEngine: WakeWordEngine;

  // Active transcript buffer
  private activeTranscript = '';

  // Callbacks
  private callbacks: ConversationControllerCallbacks | null = null;

  private constructor() {
    this.audioSession = AudioSessionManager.getInstance();
    this.noiseDetection = new NoiseDetection();
    this.voiceInput = new VoiceInput();
    this.voiceOutput = new VoiceOutput();
    this.wakeState = new WakeStateController();
    this.wakeWordEngine = new WakeWordEngine();

    this.setupServicePipelines();
  }

  public static getInstance(): ConversationController {
    if (!ConversationController.instance) {
      ConversationController.instance = new ConversationController();
    }
    return ConversationController.instance;
  }

  /**
   * Links and orchestrates event streams across modules.
   */
  private setupServicePipelines() {
    // 1. Voice Input Events
    this.voiceInput.registerEvents({
      onStart: () => {
        this.updateState(AssistantState.LISTENING);
      },
      onEnd: () => {
        // If we end input but we are not moving to THINKING, revert to IDLE
        if (this.state === AssistantState.LISTENING) {
          this.updateState(AssistantState.IDLE);
        }
      },
      onResult: (transcript, isFinal) => {
        if (this.state !== AssistantState.LISTENING) return;
        
        this.activeTranscript = transcript;
        if (this.callbacks) {
          this.callbacks.onTranscriptChange(transcript, isFinal);
        }

        // If push-to-talk is disabled and recognition thinks it's final (backup to VAD)
        if (isFinal && this.settings?.voice.pushToTalk === false) {
          console.log("[ConversationController] Speech engine flagged final result.");
          this.commitActiveTranscript();
        }
      },
      onError: (err) => {
        console.error("[ConversationController] Recognition Error:", err);
        this.updateState(AssistantState.ERROR);
        if (this.callbacks) {
          this.callbacks.onError(err);
        }
      }
    });

    // 2. Voice Activity Detection (Noise Detection) Events
    this.noiseDetection.onSpeechStart = () => {
      // Human speech started
      console.log("[ConversationController] User started speaking.");
      
      // If JARVIS is speaking and voice interruption is enabled, halt speaking and start listening
      if (this.state === AssistantState.SPEAKING && this.settings?.voice?.interruptionEnabled) {
        console.log("[ConversationController] Interruption triggered. Stopping assistant speech, transitioning to active listening.");
        this.stopSpeakingSession();
        this.startListeningSession();
      }
    };

    this.noiseDetection.onSilenceTimeout = () => {
      // User finished speaking (silence gap reached)
      console.log("[ConversationController] Silence threshold met. Closing capture window.");
      
      if (this.settings?.voice.pushToTalk === false) {
        this.commitActiveTranscript();
      }
    };

    // 3. Voice Output (Synthesis) Events
    this.voiceOutput.registerEvents({
      onStart: () => {
        this.updateState(AssistantState.SPEAKING);
        if (this.settings?.voice?.interruptionEnabled) {
          // Temporarily make noise detection less sensitive during assistant speech to prevent self-interruption
          const baseThreshold = this.settings.microphone.gain > 0 
            ? (0.03 - (this.settings.microphone.gain / 20) * 0.02) 
            : 0.015;
          this.noiseDetection.updateConfig({
            speechThreshold: baseThreshold * 1.8
          });
        }
      },
      onEnd: () => {
        if (this.settings) {
          // Restore base sensitivity
          const baseThreshold = this.settings.microphone.gain > 0 
            ? (0.03 - (this.settings.microphone.gain / 20) * 0.02) 
            : 0.015;
          this.noiseDetection.updateConfig({
            speechThreshold: baseThreshold
          });
        }

        if (this.settings?.voice?.interruptionEnabled && !this.settings?.voice?.followUpEnabled) {
          // Shut down active capture if no follow-up requested
          this.stopListeningSession();
        }

        if (this.settings?.voice?.followUpEnabled) {
          console.log("[ConversationController] Follow-up mode active. Listening for subsequent voice command...");
          this.startListeningSession();
        } else if (this.settings?.voice?.wakeWordEnabled) {
          this.updateState(AssistantState.STANDBY);
        } else {
          this.updateState(AssistantState.IDLE);
          // Inform wake state to check if automatic listening should resume (hands-free)
          this.wakeState.handleSpeechSynthesisCompleted();
        }
      },
      onError: (err) => {
        console.error("[ConversationController] Synthesis Error:", err);
        this.updateState(AssistantState.ERROR);
        if (this.callbacks) {
          this.callbacks.onError(err);
        }
      }
    });

    // 4. Wake State Event: triggers auto-listening
    this.wakeState.onTriggerListen = () => {
      this.startListeningSession();
    };

    // 5. Native Wake Word Event: triggers session
    this.wakeWordEngine.registerOnTrigger(() => {
      console.log("[ConversationController] Native wake-phrase 'Hey JARVIS' triggered. Transitioning to active listening.");
      // Play brief audible feedback/beep if supported, or start listening immediately
      this.startListeningSession();
    });
  }

  /**
   * Sets callback listener interface.
   */
  public registerCallbacks(callbacks: ConversationControllerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Binds current settings across all modules.
   */
  public configure(settings: SettingsState) {
    this.settings = settings;

    // A. Configure input language
    this.voiceInput.setLanguage(settings.voice.inputLanguage);

    // B. Configure speech output parameters
    this.voiceOutput.updateParameters({
      voiceId: settings.voice.voiceId,
      rate: settings.voice.rate,
      pitch: settings.voice.pitch,
      volume: settings.voice.volume,
      lang: settings.voice.outputLanguage
    });

    // C. Configure VAD threshold and timing
    this.noiseDetection.updateConfig({
      speechThreshold: settings.microphone.gain > 0 ? (0.03 - (settings.microphone.gain / 20) * 0.02) : 0.015,
      maxSilenceTimeout: settings.voice.conversationTimeout * 1000,
      noiseSuppressionEnabled: settings.microphone.noiseSuppression
    });

    // D. Configure Wake/PTT logic
    this.wakeState.configure(settings.voice.voiceActivation, settings.voice.pushToTalk);
    this.wakeWordEngine.configure(
      settings.voice.wakeWordEnabled,
      settings.voice.wakePhrase,
      settings.voice.wakeSensitivity
    );
    
    // E. Dynamic pre-amplification gain application
    this.audioSession.setGain(settings.microphone.gain);

    // F. Transition to initial Standby state if appropriate
    if (settings.voice.wakeWordEnabled && this.state === AssistantState.IDLE) {
      this.updateState(AssistantState.STANDBY);
    }
  }

  /**
   * Central core state transition manager.
   */
  private updateState(newState: AssistantState) {
    if (this.state === newState) return;
    
    console.log(`[ConversationController] State Transition: ${this.state} -> ${newState}`);
    this.state = newState;
    
    // Securely toggle wake word local recognizer based on application operational state
    if (newState === AssistantState.STANDBY) {
      this.wakeWordEngine.start();
    } else {
      this.wakeWordEngine.stop();
    }
    
    if (this.callbacks) {
      this.callbacks.onStateChange(newState);
    }
  }

  /**
   * Enforces mutual exclusivity: halts output and triggers input capture session.
   */
  public async startListeningSession() {
    this.wakeState.cancelScheduledTrigger();

    // Enforce Mutex: Never speak while listening
    this.voiceOutput.stop();

    if (!this.settings) {
      console.warn("[ConversationController] Cannot start listen. Settings unconfigured.");
      return;
    }

    try {
      // 1. Acquire mic stream
      await this.audioSession.acquireMicrophone(
        this.settings.microphone.deviceId,
        this.settings.microphone.noiseSuppression,
        this.settings.microphone.echoCancellation
      );

      // Apply initial gain settings
      this.audioSession.setGain(this.settings.microphone.gain);

      // 2. Start VAD Noise analysis
      this.noiseDetection.start();

      // 3. Clear transcript buffer
      this.activeTranscript = '';

      // 4. Start Web Speech Recognition
      this.voiceInput.start();

    } catch (err: any) {
      console.error("[ConversationController] Listening allocation failed:", err);
      this.updateState(AssistantState.ERROR);
      if (this.callbacks) {
        this.callbacks.onError(err.message || "Failed to initialize audio capture hardware.");
      }
    }
  }

  /**
   * Commits the active transcript and triggers processing.
   */
  public commitActiveTranscript() {
    const finalSentence = this.activeTranscript.trim();
    
    // Stop capturing instantly to prevent overlap
    this.stopListeningSession();

    if (finalSentence && finalSentence.length > 1) {
      console.log(`[ConversationController] Committing text segment: "${finalSentence}"`);
      
      const systemCommand = this.detectSystemCommand(finalSentence);
      if (systemCommand) {
        console.log(`[ConversationController] System command detected: ${systemCommand}`);
        this.executeSystemCommand(systemCommand);
        return;
      }

      this.updateState(AssistantState.THINKING);
      if (this.callbacks) {
        this.callbacks.onFinalTranscript(finalSentence);
      }
    } else {
      console.log("[ConversationController] Empty transcript segment ignored. Reverting.");
      if (this.settings?.voice?.wakeWordEnabled) {
        this.updateState(AssistantState.STANDBY);
      } else {
        this.updateState(AssistantState.IDLE);
        // Re-trigger listening if voice-activation is enabled
        this.wakeState.handleSpeechSynthesisCompleted();
      }
    }
  }

  /**
   * Checks if the transcript matches a predefined vocal system command.
   */
  private detectSystemCommand(text: string): 'clear-logs' | 'demo-on' | 'demo-off' | 'stop-listening' | 'stop-speaking' | 'reset-system' | null {
    const clean = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    
    if (
      clean.includes("clear the logs") || 
      clean.includes("clear logs") || 
      clean.includes("wipe logs") ||
      (clean.includes("clear") && clean.includes("log"))
    ) {
      return 'clear-logs';
    }
    
    if (
      clean.includes("switch to demo mode") || 
      clean.includes("activate demo mode") || 
      clean.includes("enable demo mode") || 
      clean.includes("turn on demo mode") ||
      (clean.includes("demo") && (clean.includes("switch") || clean.includes("activate") || clean.includes("enable") || clean.includes("turn on")))
    ) {
      return 'demo-on';
    }
    
    if (
      clean.includes("switch to live mode") || 
      clean.includes("activate live mode") || 
      clean.includes("disable demo mode") || 
      clean.includes("turn off demo mode") ||
      clean.includes("switch to active mode") ||
      (clean.includes("live") && (clean.includes("switch") || clean.includes("activate") || clean.includes("enable") || clean.includes("turn on")))
    ) {
      return 'demo-off';
    }
    
    if (clean.includes("stop listening") || clean.includes("go to sleep")) {
      return 'stop-listening';
    }
    
    if (
      clean.includes("stop speaking") || 
      clean.includes("be quiet") || 
      clean.includes("shut up") || 
      clean.includes("stop talking")
    ) {
      return 'stop-speaking';
    }
    
    if (
      clean.includes("reset system") || 
      clean.includes("restart jarvis") || 
      clean.includes("system reset")
    ) {
      return 'reset-system';
    }
    
    return null;
  }

  /**
   * Executes a matched system command locally.
   */
  private executeSystemCommand(command: 'clear-logs' | 'demo-on' | 'demo-off' | 'stop-listening' | 'stop-speaking' | 'reset-system') {
    let responseText = '';
    
    switch (command) {
      case 'clear-logs':
        responseText = "Understood, Tony. Clearing conversation logs and resetting context.";
        break;
      case 'demo-on':
        responseText = "Acknowledged. Transitioning system parameters to offline demo simulation mode.";
        break;
      case 'demo-off':
        responseText = "Understood. Transitioning cognitive matrix to live Gemini API mode.";
        break;
      case 'stop-listening':
        responseText = "Acknowledged. Standing down.";
        break;
      case 'stop-speaking':
        this.stopSpeakingSession();
        break;
      case 'reset-system':
        responseText = "Understood. Initiating complete voice system reset.";
        this.reset();
        break;
    }

    if (responseText) {
      this.speakResponse(responseText);
    }

    // Inform outer application container
    if (this.callbacks && this.callbacks.onSystemCommand) {
      this.callbacks.onSystemCommand(command);
    }
  }

  /**
   * Shuts down capture services cleanly.
   */
  public stopListeningSession() {
    this.voiceInput.stop();
    this.noiseDetection.stop();
    this.audioSession.releaseMicrophone();
    
    if (this.state === AssistantState.LISTENING) {
      this.updateState(AssistantState.IDLE);
    }
  }

  /**
   * Triggers text vocalization. Stops microphone input automatically first.
   */
  public speakResponse(text: string) {
    this.wakeState.cancelScheduledTrigger();

    if (this.settings?.voice?.interruptionEnabled) {
      // Keep mic and noise detection active, but stop speech recognition so it doesn't process text
      this.voiceInput.stop();
      if (this.state === AssistantState.LISTENING) {
        // Prepare state transition (onStart of synthesis will formally transition state to SPEAKING)
        this.state = AssistantState.SPEAKING;
        if (this.callbacks) {
          this.callbacks.onStateChange(AssistantState.SPEAKING);
        }
      }
    } else {
      this.stopListeningSession();
    }

    this.voiceOutput.speak(text);
  }

  /**
   * Halts active speech.
   */
  public stopSpeakingSession() {
    this.voiceOutput.stop();
    if (this.state === AssistantState.SPEAKING) {
      this.updateState(AssistantState.IDLE);
    }
  }

  /**
   * Manual cancellation or system reset. Stops all operations cleanly.
   */
  public reset() {
    this.wakeState.cancelScheduledTrigger();
    this.stopListeningSession();
    this.stopSpeakingSession();
    this.updateState(AssistantState.IDLE);
  }

  public getActiveState(): AssistantState {
    return this.state;
  }

  public getVoiceInputService(): VoiceInput {
    return this.voiceInput;
  }

  public getVoiceOutputService(): VoiceOutput {
    return this.voiceOutput;
  }
}
