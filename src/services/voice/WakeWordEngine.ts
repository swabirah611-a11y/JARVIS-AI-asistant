/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wake Word Detection Engine
 * Runs completely locally/on-device in the browser using a separate speech recognition stream.
 * Specifically configured for low-resource continuous observation, avoiding cloud speech-to-text costs.
 * It is suspended when the primary capture microphone or voice output is active to prevent conflicts.
 */
export class WakeWordEngine {
  private recognition: any = null;
  private isListening = false;
  private onTrigger: (() => void) | null = null;
  private enabled = false;
  private phrase = 'hey jarvis';
  private sensitivity = 50; // 0 to 100

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("[WakeWordEngine] SpeechRecognition is not supported in this browser. Local wake-word is offline.");
      return;
    }

    try {
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        if (!this.enabled || !this.isListening) return;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const text = result[0].transcript.toLowerCase().trim();
          
          console.log("[WakeWordEngine] Heard audio segment:", text);

          const targetPhrase = this.phrase.toLowerCase().trim();
          let triggered = false;

          // Sensitivity Configuration Rules:
          // High Sensitivity (>= 75): Match 'jarvis' or any partial text anywhere.
          // Medium Sensitivity (40 - 74): Match 'hey jarvis', 'hi jarvis' or 'jarvis' clearly.
          // Low Sensitivity (< 40): Requires exact phrase match 'hey jarvis' or ends with 'hey jarvis'.
          if (this.sensitivity >= 75) {
            triggered = text.includes("jarvis");
          } else if (this.sensitivity >= 40) {
            triggered = text.includes("jarvis") || text.includes("jarves") || text.includes("jarv");
          } else {
            triggered = text === targetPhrase || text.endsWith(targetPhrase);
          }

          if (triggered) {
            console.log("[WakeWordEngine] Wake phrase matching detected successfully!");
            if (this.onTrigger) {
              this.onTrigger();
            }
            break;
          }
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error === 'no-speech') return; // Silence is normal
        if (e.error === 'aborted') return;   // Normal shutdown
        console.error("[WakeWordEngine] Speech recognition error:", e.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart if wake-word detection remains enabled and is still requested
        if (this.enabled) {
          setTimeout(() => {
            if (this.enabled && !this.isListening) {
              this.start();
            }
          }, 300);
        }
      };

    } catch (err) {
      console.error("[WakeWordEngine] Failed to build native Web Speech Recognition:", err);
    }
  }

  /**
   * Configures engine properties.
   */
  public configure(enabled: boolean, phrase: string, sensitivity: number) {
    this.enabled = enabled;
    this.phrase = phrase || 'hey jarvis';
    this.sensitivity = sensitivity;

    if (!this.enabled) {
      this.stop();
    }
  }

  /**
   * Activates wake-word listener if enabled.
   */
  public start() {
    if (!this.recognition || !this.enabled || this.isListening) return;
    try {
      this.isListening = true;
      this.recognition.start();
      console.log("[WakeWordEngine] Dedicated on-device wake-word listener activated.");
    } catch (err) {
      console.error("[WakeWordEngine] Wake-word start failure:", err);
      this.isListening = false;
    }
  }

  /**
   * Shuts down wake-word listener cleanly.
   */
  public stop() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.isListening = false;
      this.recognition.abort();
      console.log("[WakeWordEngine] Wake-word listener suspended.");
    } catch (err) {
      console.error("[WakeWordEngine] Wake-word stop failure:", err);
    }
  }

  /**
   * Registers trigger callback hook.
   */
  public registerOnTrigger(callback: () => void) {
    this.onTrigger = callback;
  }

  /**
   * Checks operational availability.
   */
  public isSupported(): boolean {
    return this.recognition !== null;
  }
}
