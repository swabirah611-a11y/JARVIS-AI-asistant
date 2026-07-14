/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSessionManager } from './AudioSessionManager';

export interface NoiseDetectionConfig {
  speechThreshold: number; // Sensitivity threshold (0.0 to 1.0)
  minSpeechDuration: number; // Milliseconds of continuous sound to qualify as speech (ignores clicks/taps)
  maxSilenceTimeout: number; // Milliseconds of quiet before triggering auto-commit/silence detection
  noiseSuppressionEnabled: boolean;
}

/**
 * Noise Detection and Voice Activity Detector (VAD) Service
 * Analyzes microphone audio to isolate nearby human speech from ambient noise,
 * keyboard taps, and mouse clicks.
 */
export class NoiseDetection {
  private config: NoiseDetectionConfig = {
    speechThreshold: 0.015, // Default RMS threshold
    minSpeechDuration: 200,  // Clicks are < 150ms, speech is continuous
    maxSilenceTimeout: 2000, // Wait 2s naturally before auto-commit
    noiseSuppressionEnabled: true,
  };

  private analyser: AnalyserNode | null = null;
  private bandpassFilter: BiquadFilterNode | null = null;
  private animationFrameId: number | null = null;
  private audioSession: AudioSessionManager;

  // State trackers
  private isUserSpeaking = false;
  private soundDetectedStartTime: number | null = null;
  private silenceStartTime: number | null = null;
  private currentVolumeLevel = 0;
  private movingAverageNoiseFloor = 0.005; // Dynamic gate

  // Callbacks
  public onSpeechStart: (() => void) | null = null;
  public onSpeechEnd: (() => void) | null = null;
  public onSilenceTimeout: (() => void) | null = null;
  public onVolumeUpdate: ((volume: number) => void) | null = null;

  constructor() {
    this.audioSession = AudioSessionManager.getInstance();
  }

  /**
   * Updates configuration properties dynamically.
   */
  public updateConfig(newConfig: Partial<NoiseDetectionConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log("[NoiseDetection] Updated VAD Config:", this.config);
  }

  /**
   * Attaches real-time spectral/amplitude analyzer to the microphone stream.
   * Connects a BiquadFilterNode to suppress off-frequency noise (keep 100Hz - 3000Hz human vocal band).
   */
  public start() {
    this.stop();

    const ctx = this.audioSession.getAudioContext();
    const gainNode = this.audioSession.getGainNode();
    if (!gainNode) {
      console.warn("[NoiseDetection] No active microphone gain node found. Ensure mic is acquired first.");
      return;
    }

    // 1. Create a Bandpass filter to suppress low/high non-human frequency bands
    // Vocal fundamental frequencies: ~85Hz - 255Hz, harmonics up to 3000Hz.
    this.bandpassFilter = ctx.createBiquadFilter();
    this.bandpassFilter.type = 'bandpass';
    this.bandpassFilter.frequency.value = 1000; // Center frequency
    this.bandpassFilter.Q.value = 0.5; // Broad bandwidth keeping vocal spectrum

    // 2. Create the AnalyserNode
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256; // High time resolution
    
    // Connect: GainNode -> Bandpass Filter -> Analyser
    gainNode.connect(this.bandpassFilter);
    this.bandpassFilter.connect(this.analyser);

    // Reset tracking state variables
    this.isUserSpeaking = false;
    this.soundDetectedStartTime = null;
    this.silenceStartTime = null;
    this.currentVolumeLevel = 0;

    // Start analyzing animation loop
    this.analyze();
    console.log("[NoiseDetection] Voice Activity and Spectral Filter initialized.");
  }

  /**
   * Recursive evaluation loop running on requestAnimationFrame.
   */
  private analyze = () => {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);

    // 1. Compute Root Mean Square (RMS) volume level
    let sumOfSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumOfSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumOfSquares / bufferLength);
    this.currentVolumeLevel = rms;

    if (this.onVolumeUpdate) {
      this.onVolumeUpdate(rms);
    }

    // 2. Dynamic Noise Floor Tracking
    // Slowly adapt noise floor to constant background rumbles (fans, traffic)
    if (rms < this.movingAverageNoiseFloor) {
      this.movingAverageNoiseFloor = this.movingAverageNoiseFloor * 0.95 + rms * 0.05;
    } else {
      // Very slow upward bleed to prevent permanent gating locks
      this.movingAverageNoiseFloor = this.movingAverageNoiseFloor * 0.999 + rms * 0.001;
    }

    // Dynamic threshold: base threshold + adaptive noise floor
    const activeThreshold = Math.max(this.config.speechThreshold, this.movingAverageNoiseFloor * 1.5);
    const soundExceedsThreshold = rms > activeThreshold;
    const now = Date.now();

    if (soundExceedsThreshold) {
      this.silenceStartTime = null; // Reset silence counter

      if (!this.isUserSpeaking) {
        if (this.soundDetectedStartTime === null) {
          this.soundDetectedStartTime = now;
        } else if (now - this.soundDetectedStartTime >= this.config.minSpeechDuration) {
          // Qualified Speech: exceeded threshold consistently longer than minimum duration
          this.isUserSpeaking = true;
          this.soundDetectedStartTime = null;
          if (this.onSpeechStart) {
            console.log(`[NoiseDetection] Human speech detected (RMS: ${rms.toFixed(4)}, Threshold: ${activeThreshold.toFixed(4)})`);
            this.onSpeechStart();
          }
        }
      }
    } else {
      this.soundDetectedStartTime = null; // Reset transient signal timer

      if (this.isUserSpeaking) {
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= this.config.maxSilenceTimeout) {
          // Silence Timeout: sustained silence after speech has ended
          this.isUserSpeaking = false;
          this.silenceStartTime = null;
          console.log("[NoiseDetection] Silence timeout reached. Committing user segment.");
          if (this.onSilenceTimeout) {
            this.onSilenceTimeout();
          }
          if (this.onSpeechEnd) {
            this.onSpeechEnd();
          }
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(this.analyze);
  };

  /**
   * Gets current real-time volume RMS level.
   */
  public getCurrentVolume(): number {
    return this.currentVolumeLevel;
  }

  /**
   * Checks if user is currently flagged as actively speaking.
   */
  public isSpeaking(): boolean {
    return this.isUserSpeaking;
  }

  /**
   * Stop analysis loop and release Web Audio nodes.
   */
  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.bandpassFilter) {
      try {
        this.bandpassFilter.disconnect();
      } catch (e) {}
      this.bandpassFilter = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {}
      this.analyser = null;
    }

    this.isUserSpeaking = false;
    this.soundDetectedStartTime = null;
    this.silenceStartTime = null;
  }
}
