/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Wake State Controller
 * Manages automation rules around automatic microphone triggering,
 * hands-free Voice Activation (VAD-loop), and Push-To-Talk coordination.
 */
export class WakeStateController {
  private isVoiceActivationEnabled = false;
  private isPushToTalkEnabled = false;
  private autoTriggerTimer: NodeJS.Timeout | null = null;

  public onTriggerListen: (() => void) | null = null;

  constructor() {}

  /**
   * Sets up policy states.
   */
  public configure(voiceActivation: boolean, pushToTalk: boolean) {
    this.isVoiceActivationEnabled = voiceActivation;
    this.isPushToTalkEnabled = pushToTalk;
    
    if (!this.isVoiceActivationEnabled) {
      this.cancelScheduledTrigger();
    }
  }

  /**
   * Evaluates and schedules microphone activation once speaking finishes.
   */
  public handleSpeechSynthesisCompleted() {
    this.cancelScheduledTrigger();

    if (this.isVoiceActivationEnabled && !this.isPushToTalkEnabled) {
      console.log("[WakeStateController] Scheduling automatic microphone trigger...");
      
      // Delay slightly (e.g. 600ms) to let speakers quiet down, avoiding self-triggering
      this.autoTriggerTimer = setTimeout(() => {
        if (this.onTriggerListen) {
          console.log("[WakeStateController] Executing auto-listen trigger.");
          this.onTriggerListen();
        }
      }, 600);
    }
  }

  /**
   * Aborts any pending auto-activation timer.
   */
  public cancelScheduledTrigger() {
    if (this.autoTriggerTimer) {
      clearTimeout(this.autoTriggerTimer);
      this.autoTriggerTimer = null;
    }
  }

  /**
   * Determines if hands-free conversation loop is active.
   */
  public isHandsFreeActive(): boolean {
    return this.isVoiceActivationEnabled && !this.isPushToTalkEnabled;
  }
}
