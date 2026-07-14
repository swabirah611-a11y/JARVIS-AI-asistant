/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VoiceOutputEvents {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

/**
 * Voice Output Service (Speech Synthesis)
 * Interchanges with window.speechSynthesis to provide natural pacing, clear pronunciation,
 * custom vocal parameters (rate, pitch, volume, speaker profiles), and stable chunked playback.
 */
export class VoiceOutput {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingActive = false;

  // Registered event handlers
  private events: VoiceOutputEvents = {};

  // Parameters
  private voiceName = 'jarvis-classic';
  private rate = 1.0;
  private pitch = 1.0;
  private volume = 1.0;
  private lang = 'en-US';

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    } else {
      console.warn("[VoiceOutput] Web Speech Synthesis API is not supported in this browser.");
    }
  }

  /**
   * Registers event callback hooks.
   */
  public registerEvents(events: VoiceOutputEvents) {
    this.events = events;
  }

  /**
   * Fetches all available synthesis voices on the host operating system.
   */
  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  /**
   * Updates synthesis configurations.
   */
  public updateParameters(params: {
    voiceId?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
    lang?: string;
  }) {
    if (params.voiceId !== undefined) this.voiceName = params.voiceId;
    if (params.rate !== undefined) this.rate = params.rate;
    if (params.pitch !== undefined) this.pitch = params.pitch;
    if (params.volume !== undefined) this.volume = params.volume;
    if (params.lang !== undefined) this.lang = params.lang;
    
    console.log("[VoiceOutput] Updated parameters:", {
      voiceName: this.voiceName,
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      lang: this.lang
    });
  }

  /**
   * Speaks the given text cleanly.
   * Splits long text into natural sentence fragments to prevent SpeechSynthesis freeze bugs.
   */
  public speak(text: string) {
    this.stop();

    if (!this.synth) {
      console.warn("[VoiceOutput] Synthesis engine unavailable.");
      if (this.events.onError) this.events.onError("Speech synthesis is not supported on this platform.");
      return;
    }

    if (!text || !text.trim()) {
      if (this.events.onEnd) this.events.onEnd();
      return;
    }

    try {
      // Clean markdown tags from the text before speaking
      const plainText = this.stripMarkdown(text);
      
      // Split into sentence blocks to maintain stable timing and prevent 15-second browser freezes
      const sentences = this.splitIntoChunks(plainText);
      let currentSentenceIdx = 0;

      const speakNextChunk = () => {
        if (currentSentenceIdx >= sentences.length) {
          this.isSpeakingActive = false;
          console.log("[VoiceOutput] Completed entire text vocalization.");
          if (this.events.onEnd) this.events.onEnd();
          return;
        }

        const chunkText = sentences[currentSentenceIdx].trim();
        if (!chunkText) {
          currentSentenceIdx++;
          speakNextChunk();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunkText);
        this.currentUtterance = utterance;

        // Apply configuration variables
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.volume = this.volume;

        // Apply voice selection
        const voices = this.getVoices();
        let selectedVoice = voices.find(v => v.name === this.voiceName);
        
        // Smart fallback: If specific voice not found, match by English or language code prefix
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.startsWith(this.lang.substring(0, 2))) ||
                          voices.find(v => v.lang.startsWith('en')) ||
                          voices[0];
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          if (currentSentenceIdx === 0) {
            this.isSpeakingActive = true;
            if (this.events.onStart) this.events.onStart();
          }
        };

        utterance.onend = () => {
          currentSentenceIdx++;
          speakNextChunk();
        };

        utterance.onerror = (evt) => {
          console.error("[VoiceOutput] Utterance playback failed:", evt);
          this.isSpeakingActive = false;
          if (this.events.onError) {
            this.events.onError(`Speech output failed during playback chunk: ${evt.error}`);
          }
        };

        this.synth!.speak(utterance);
      };

      // Begin chunk sequence
      speakNextChunk();

    } catch (err: any) {
      console.error("[VoiceOutput] Error executing speak cycle:", err);
      this.isSpeakingActive = false;
      if (this.events.onError) this.events.onError(err.message || "Unknown synthesis error.");
    }
  }

  /**
   * Instantly terminates all active and queued speech outputs.
   */
  public stop() {
    this.isSpeakingActive = false;
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  /**
   * Returns active state of synthesizer.
   */
  public isSpeaking(): boolean {
    return this.isSpeakingActive;
  }

  /**
   * Strips out markdown syntax, asterisks, hashtags, and blockquotes for clean vocal reading.
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/\*(.*?)\*/g, '$1')     // italic
      .replace(/`(.*?)`/g, '$1')       // inline code
      .replace(/#+\s+(.*?)\n/g, '$1. ') // headers
      .replace(/>\s+(.*?)\n/g, '$1. ')  // quotes
      .replace(/-\s+/g, '')            // list bullets
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
      .replace(/[`*_\-#[\]\n]/g, ' ')  // remaining special symbols or returns
      .replace(/\s+/g, ' ')            // double spacing
      .trim();
  }

  /**
   * Splits plain text into logical sentence fragments, respecting pausing.
   */
  private splitIntoChunks(text: string): string[] {
    // Regex matches sentence terminations (., !, ?, ;, etc.) followed by space
    const sentences = text.split(/(?<=[.!?;\n])\s+/);
    const chunks: string[] = [];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      // Chrome has issues if a single chunk is larger than 120 characters, let's keep chunks medium-sized
      if ((currentChunk + sentence).length < 150) {
        currentChunk += ' ' + sentence;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}
