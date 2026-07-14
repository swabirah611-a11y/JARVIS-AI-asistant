/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Audio Session Manager
 * Responsible for managing microphone MediaStream, single AudioContext instance,
 * pre-amplification GainNode, and querying audio input/output hardware.
 */
export class AudioSessionManager {
  private static instance: AudioSessionManager | null = null;
  
  private audioContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private constructor() {}

  public static getInstance(): AudioSessionManager {
    if (!AudioSessionManager.instance) {
      AudioSessionManager.instance = new AudioSessionManager();
    }
    return AudioSessionManager.instance;
  }

  /**
   * Initializes or returns the active AudioContext.
   * Ensures single instance exists.
   */
  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error("Web Audio API is not supported in this browser environment.");
      }
      this.audioContext = new AudioCtx();
    }
    
    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn("[AudioSessionManager] Failed to resume AudioContext:", err);
      });
    }
    
    return this.audioContext;
  }

  /**
   * Requests microphone access and sets up nodes with correct constraints.
   */
  public async acquireMicrophone(
    deviceId: string,
    noiseSuppression: boolean,
    echoCancellation: boolean
  ): Promise<MediaStream> {
    // Release existing stream if any
    this.releaseMicrophone();

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
        noiseSuppression: noiseSuppression,
        echoCancellation: echoCancellation,
        autoGainControl: true,
      },
      video: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;
      
      // Connect to Web Audio context for pre-amplification or visualization
      const ctx = this.getAudioContext();
      this.sourceNode = ctx.createMediaStreamSource(stream);
      this.gainNode = ctx.createGain();
      
      // Connect source to gain node (does NOT connect to destination to prevent speaker feedback howling)
      this.sourceNode.connect(this.gainNode);
      
      // Default gain to 1.0 (will be adjusted via setGain)
      this.gainNode.gain.value = 1.0;

      console.log("[AudioSessionManager] Microphone acquired successfully.");
      return stream;
    } catch (err) {
      console.error("[AudioSessionManager] Failed to acquire microphone:", err);
      throw err;
    }
  }

  /**
   * Sets the pre-amplification gain.
   * @param value gain factor (e.g. 1.0 for original, or mapped from 0 to 20 gain setting)
   */
  public setGain(value: number) {
    if (this.gainNode) {
      // Scale gain node value linearly or logarithmically
      // Mapping setting value (0 to 20) to linear gain (0.5 to 4.0)
      const linearGain = 0.5 + (value / 20) * 3.5;
      this.gainNode.gain.setValueAtTime(linearGain, this.getAudioContext().currentTime);
    }
  }

  /**
   * Releases current microphone resources cleanly.
   */
  public releaseMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[AudioSessionManager] Track stopped: ${track.label}`);
      });
      this.micStream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
  }

  /**
   * Returns standard input devices (microphones).
   */
  public async getMicrophones(): Promise<MediaDeviceInfo[]> {
    try {
      // Request permission briefly if not already granted to list labels
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicPermission = devices.some(d => d.kind === 'audioinput' && d.label !== '');
        
        if (!hasMicPermission) {
          // Trigger a lightweight permission check
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
          if (tempStream) {
            tempStream.getTracks().forEach(t => t.stop());
          }
        }
        
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        return allDevices.filter(d => d.kind === 'audioinput');
      }
      return [];
    } catch (err) {
      console.warn("[AudioSessionManager] Failed to list microphones:", err);
      return [];
    }
  }

  /**
   * Returns standard output devices (speakers).
   */
  public async getSpeakers(): Promise<MediaDeviceInfo[]> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'audiooutput');
      }
      return [];
    } catch (err) {
      console.warn("[AudioSessionManager] Failed to list speakers:", err);
      return [];
    }
  }

  /**
   * Attempts to set the audio output sink (speaker) on an audio element if supported.
   */
  public async applySpeakerSink(audioElement: HTMLAudioElement, speakerId: string): Promise<boolean> {
    if (!speakerId || speakerId === 'default') return false;
    
    const audioWithSink = audioElement as any;
    if (typeof audioWithSink.setSinkId === 'function') {
      try {
        await audioWithSink.setSinkId(speakerId);
        console.log(`[AudioSessionManager] Speaker sink mapped to ${speakerId}`);
        return true;
      } catch (err) {
        console.warn("[AudioSessionManager] Failed to map speaker sink:", err);
        return false;
      }
    } else {
      console.info("[AudioSessionManager] setSinkId is not supported in this browser.");
      return false;
    }
  }

  /**
   * Exposes active gain node for visualization or volume monitoring.
   */
  public getGainNode(): GainNode | null {
    return this.gainNode;
  }

  /**
   * Tears down entire AudioContext when necessary.
   */
  public async destroy() {
    this.releaseMicrophone();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    AudioSessionManager.instance = null;
  }
}
