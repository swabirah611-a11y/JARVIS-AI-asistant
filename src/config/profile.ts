/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  preferredName: string;
  profession: string;
  creativeWork: string;
  communicationPreferences: string;
  currentProjects: string[];
}

/**
 * Stage 2 User Profile Configuration
 * Edit these values to personalize JARVIS's context and conversation style.
 */
export const currentUserProfile: UserProfile = {
  preferredName: "Tony",
  profession: "System Architect & Creative Technologist",
  creativeWork: "Interactive interface design, high-performance web systems, and cinematic computing",
  communicationPreferences: "Concise, objective, and intellectually precise. Prefers subtle wit and appreciates brief structural analysis over general conversational filler.",
  currentProjects: [
    "JARVIS AI Stage 2 System Core Integration",
    "Multi-turn streaming protocol optimization",
    "High-fidelity GPU-accelerated motion widgets"
  ]
};
