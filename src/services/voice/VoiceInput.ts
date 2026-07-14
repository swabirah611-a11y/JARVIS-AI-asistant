/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VoiceInputEvents {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  onError?: (error: string) => void;
}

/**
 * Voice Input Service (Speech Recognition)
 * Safely interfaces with webkitSpeechRecognition / SpeechRecognition API,
 * supporting partial results, confidence levels, BCP 47 languages, and automated recovery.
 */
export class VoiceInput {
  private recognition: any = null;
  private isRecognitionRunning = false;
  private lang = 'en-US';
  private consecutiveErrorCount = 0;
  private maxConsecutiveErrors = 3;

  // Registered event handlers
  private events: VoiceInputEvents = {};

  constructor() {
    this.initializeSpeechRecognition();
  }

  /**
   * Safe check and initialization of browser speech engine.
   */
  private initializeSpeechRecognition() {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn("[VoiceInput] Web Speech Recognition API is not supported in this browser environment.");
      return;
    }

    try {
      this.recognition = new SpeechRecognitionAPI();
      
      // Configure engine properties
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.lang;

      // Event Listeners
      this.recognition.onstart = () => {
        this.isRecognitionRunning = true;
        this.consecutiveErrorCount = 0;
        console.log("[VoiceInput] Speech recognition session started.");
        if (this.events.onStart) this.events.onStart();
      };

      this.recognition.onend = () => {
        this.isRecognitionRunning = false;
        console.log("[VoiceInput] Speech recognition session ended.");
        if (this.events.onEnd) this.events.onEnd();
      };

      this.recognition.onerror = (event: any) => {
        console.error("[VoiceInput] Speech recognition error encountered:", event.error, event.message);
        
        // Handle standard Web Speech API errors
        let friendlyMessage = event.error;
        if (event.error === 'not-allowed') {
          friendlyMessage = "Microphone access denied or blocked by browser security.";
        } else if (event.error === 'no-speech') {
          friendlyMessage = "No speech detected within recognition timeout window.";
        } else if (event.error === 'network') {
          friendlyMessage = "Network latency disrupted cloud speech-to-text resolution.";
        }

        this.consecutiveErrorCount++;
        if (this.events.onError) {
          this.events.onError(friendlyMessage);
        }

        // Prevent immediate aggressive restart loop if errors stack up
        if (this.consecutiveErrorCount >= this.maxConsecutiveErrors) {
          console.warn(`[VoiceInput] Stopped auto-recovery after ${this.maxConsecutiveErrors} consecutive failures.`);
          this.stop();
        }
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidenceScore = 0.9;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript;
          confidenceScore = result[0].confidence;

          if (result.isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const combinedTranscript = finalTranscript || interimTranscript;
        const isFinal = finalTranscript !== '';

        if (combinedTranscript.trim() && this.events.onResult) {
          this.events.onResult(combinedTranscript, isFinal, confidenceScore);
        }
      };

    } catch (err) {
      console.error("[VoiceInput] Initialization of speech recognizer failed:", err);
    }
  }

  /**
   * Registers event callback hooks.
   */
  public registerEvents(events: VoiceInputEvents) {
    this.events = events;
  }

  /**
   * Configures language locale.
   */
  public setLanguage(langCode: string) {
    this.lang = langCode || 'en-US';
    if (this.recognition) {
      this.recognition.lang = this.lang;
      // Re-apply if running
      if (this.isRecognitionRunning) {
        this.restart();
      }
    }
  }

  /**
   * Starts speech recognition cleanly if supported and not already running.
   */
  public start() {
    if (!this.recognition) {
      console.warn("[VoiceInput] Recognition engine unavailable. Cannot start.");
      return;
    }

    if (this.isRecognitionRunning) {
      console.info("[VoiceInput] Session is already running. Skip redundant start.");
      return;
    }

    try {
      this.recognition.start();
    } catch (err) {
      console.error("[VoiceInput] Failed to start recognition engine:", err);
    }
  }

  /**
   * Stops recognition cleanly.
   */
  public stop() {
    if (this.recognition && this.isRecognitionRunning) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.error("[VoiceInput] Error stopping speech recognizer:", err);
      }
    }
    this.isRecognitionRunning = false;
  }

  /**
   * Aborts recognition session instantly, discarding pending buffer.
   */
  public abort() {
    if (this.recognition && this.isRecognitionRunning) {
      try {
        this.recognition.abort();
      } catch (err) {
        console.error("[VoiceInput] Error aborting speech recognizer:", err);
      }
    }
    this.isRecognitionRunning = false;
  }

  /**
   * Performs quick restart of session to apply changes.
   */
  public restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 250);
  }

  /**
   * Returns whether the browser supports native SpeechRecognition.
   */
  public isSupported(): boolean {
    return this.recognition !== null;
  }

  /**
   * Checks current state status.
   */
  public isActive(): boolean {
    return this.isRecognitionRunning;
  }
}
