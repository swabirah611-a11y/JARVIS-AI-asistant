/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { MemoryItem, loadMemories } from "./memory";
import { loadIntegrationsData } from "./integrations";

// --- Types for Stage 7 Entities ---

export interface ProjectItem {
  id: string;
  name: string;
  clientOrOrg: string;
  type: string;
  status: "active" | "completed" | "on_hold" | "overdue";
  deadline: string; // ISO date string
  tasksCount: number;
  notes: string;
  relatedFiles: string[];
  recentActivity: string;
  createdAt: string;
  updatedAt: string;
  currentStage?: 'IDEA' | 'PRE-PRODUCTION' | 'PRODUCTION' | 'POST-PRODUCTION' | 'REVIEW' | 'DELIVERED' | 'ARCHIVED';
  shootDate?: string;
  location?: string;
  teamMembers?: string[];
  deliverables?: string[];
  aspectRatios?: string[];
  platforms?: string[];
  approvedFolder?: string;
  checklists?: {
    category: 'Shot List' | 'Production' | 'Editing' | 'Delivery' | 'General';
    items: { id: string; text: string; done: boolean }[];
  }[];
}

export interface TaskItem {
  id: string;
  projectId?: string; // Optional links to projects
  title: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "overdue";
  dueDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  time: string; // ISO date string
  status: "active" | "dismissed";
}

export interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  location?: string;
  description?: string;
}

export interface PrivacyContextConfig {
  useMemories: boolean;
  useProjects: boolean;
  useTasks: boolean;
  useActivityLogs: boolean;
  useCalendar: boolean;
}

// --- File Paths ---

const PROJECTS_FILE = path.join(process.cwd(), "data", "projects.json");
const TASKS_FILE = path.join(process.cwd(), "data", "tasks.json");
const REMINDERS_FILE = path.join(process.cwd(), "data", "reminders.json");
const CALENDAR_FILE = path.join(process.cwd(), "data", "calendar.json");
const PRIVACY_FILE = path.join(process.cwd(), "data", "privacy.json");

// --- Helpers to ensure directories and files exist ---

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- Data Seeding and IO ---

export function loadProjects(): ProjectItem[] {
  ensureDirExists(PROJECTS_FILE);
  let projects: ProjectItem[] = [];
  if (!fs.existsSync(PROJECTS_FILE)) {
    projects = [
      {
        id: "proj-1",
        name: "AAU Nightlife Promotional Reel",
        clientOrOrg: "AAU Club Group",
        type: "Promotional video",
        status: "active",
        currentStage: "PRODUCTION",
        shootDate: "2026-07-18",
        deadline: "2026-07-28T23:59:59.000Z",
        location: "Underground Plaza, Sector 4",
        teamMembers: ["Tony", "Pepper", "Rhodey"],
        deliverables: ["60s Instagram Reel (9:16)", "30s YouTube Short (9:16)", "Full 4K Master (16:9)"],
        aspectRatios: ["16:9", "9:16"],
        platforms: ["Instagram", "YouTube", "TikTok"],
        approvedFolder: "projects/aau_nightlife",
        tasksCount: 3,
        notes: "High-octane club footage highlighting neon elements and rapid visual edits.",
        relatedFiles: ["shotlist.txt", "audio_track_draft.wav"],
        recentActivity: "Shot list completed. Pre-production complete.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        checklists: [
          {
            category: "Shot List",
            items: [
              { id: "shot-1", text: "Slow motion entrance tracking shot (Sony FX6, 120fps)", done: true },
              { id: "shot-2", text: "Neon sign rack-focus transition (50mm anamorphic)", done: false },
              { id: "shot-3", text: "Crowd wide-angle pan with rhythmic strobe pulses", done: false }
            ]
          },
          {
            category: "Production",
            items: [
              { id: "prod-1", text: "Secure location access permissions & security cleared", done: true },
              { id: "prod-2", text: "Prepare battery packs & charge FX6/FX3 rigs", done: true },
              { id: "prod-3", text: "Coordinate with audio DJ for direct board recordings", done: false }
            ]
          }
        ]
      },
      {
        id: "proj-2",
        name: "Cinematic Compute Rendering Widget",
        clientOrOrg: "Hologram FX",
        type: "Creative Rendering",
        status: "active",
        currentStage: "POST-PRODUCTION",
        deadline: "2026-07-30T18:00:00.000Z",
        tasksCount: 2,
        notes: "GPU accelerated HTML Canvas structures leveraging fluid dynamic shaders.",
        relatedFiles: ["src/components/CoreVisualizer.tsx"],
        recentActivity: "Vocal vibration ripples synchronized with SVG state matrices.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aspectRatios: ["16:9"],
        platforms: ["Web"],
        checklists: [
          {
            category: "Editing",
            items: [
              { id: "edit-1", text: "Integrate vector audio FFT analyzers", done: true },
              { id: "edit-2", text: "Optimize CPU rendering loop (under 4ms)", done: false }
            ]
          }
        ]
      }
    ];
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
    return projects;
  }

  try {
    const raw = fs.readFileSync(PROJECTS_FILE, "utf8");
    projects = JSON.parse(raw);
  } catch (err) {
    console.error("[loadProjects] Failed to parse projects.json:", err);
    projects = [];
  }

  // Backwards compatibility upgrader - ensures all loaded projects have Stage 9 fields
  let upgraded = false;
  projects = projects.map(p => {
    let changed = false;
    if (!p.currentStage) {
      p.currentStage = p.status === 'completed' ? 'DELIVERED' : 'PRODUCTION';
      changed = true;
    }
    if (!p.aspectRatios) {
      p.aspectRatios = ["16:9"];
      changed = true;
    }
    if (!p.platforms) {
      p.platforms = ["YouTube"];
      changed = true;
    }
    if (!p.teamMembers) {
      p.teamMembers = ["Tony"];
      changed = true;
    }
    if (!p.deliverables) {
      p.deliverables = ["Final Render (16:9)"];
      changed = true;
    }
    if (!p.checklists) {
      p.checklists = [
        {
          category: "General",
          items: [
            { id: `chk-${Date.now()}-1`, text: "Review project guidelines", done: true },
            { id: `chk-${Date.now()}-2`, text: "Complete deliverables", done: false }
          ]
        }
      ];
      changed = true;
    }
    if (changed) upgraded = true;
    return p;
  });

  if (upgraded) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
  }

  return projects;
}

export function saveProjects(projects: ProjectItem[]) {
  ensureDirExists(PROJECTS_FILE);
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
}

export function loadTasks(): TaskItem[] {
  ensureDirExists(TASKS_FILE);
  if (!fs.existsSync(TASKS_FILE)) {
    const seed: TaskItem[] = [
      {
        id: "task-1",
        projectId: "proj-1",
        title: "Optimize semantic memory keyword matching with relevance scores",
        priority: "high",
        status: "pending",
        dueDate: "2026-07-15T23:59:59.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-2",
        projectId: "proj-1",
        title: "Build safe Context Inspector panel for developer testing",
        priority: "medium",
        status: "completed",
        dueDate: "2026-07-14T17:00:00.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-3",
        projectId: "proj-1",
        title: "Verify pronoun referential tracking in multi-turn conversation logs",
        priority: "high",
        status: "pending",
        dueDate: "2026-07-16T12:00:00.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-4",
        projectId: "proj-2",
        title: "Refine SVG shader ripple mathematical curves",
        priority: "high",
        status: "pending",
        dueDate: "2026-07-28T23:59:59.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-5",
        projectId: "proj-2",
        title: "Profile rendering frame rate on retina screens",
        priority: "low",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-6",
        projectId: "proj-3",
        title: "Log security telemetry exceptions",
        priority: "medium",
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "task-7",
        title: "Call Pepper about the Malibu garage server backups",
        priority: "medium",
        status: "pending",
        dueDate: "2026-07-13T20:00:00.000Z",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(TASKS_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8"));
}

export function saveTasks(tasks: TaskItem[]) {
  ensureDirExists(TASKS_FILE);
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

export function loadReminders(): ReminderItem[] {
  ensureDirExists(REMINDERS_FILE);
  if (!fs.existsSync(REMINDERS_FILE)) {
    const seed: ReminderItem[] = [
      {
        id: "rem-1",
        title: "Back up secure local vaults before midnight",
        time: "2026-07-13T23:45:00.000Z",
        status: "active"
      },
      {
        id: "rem-2",
        title: "Synchronize JARVIS Stage 7 model configuration",
        time: "2026-07-13T10:00:00.000Z",
        status: "active"
      }
    ];
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(REMINDERS_FILE, "utf8"));
}

export function saveReminders(reminders: ReminderItem[]) {
  ensureDirExists(REMINDERS_FILE);
  fs.writeFileSync(REMINDERS_FILE, JSON.stringify(reminders, null, 2), "utf8");
}

export function loadCalendar(): CalendarEventItem[] {
  ensureDirExists(CALENDAR_FILE);
  if (!fs.existsSync(CALENDAR_FILE)) {
    const seed: CalendarEventItem[] = [
      {
        id: "cal-1",
        title: "Tony & Pepper Malibu Server Architecture Review",
        startTime: "2026-07-13T14:00:00.000Z",
        endTime: "2026-07-13T15:30:00.000Z",
        location: "Malibu Workshop",
        description: "Reviewing server architecture, backup power grids, and local encryption keys."
      },
      {
        id: "cal-2",
        title: "Antigravity Stage 5 Demo Synchronization",
        startTime: "2026-07-14T11:00:00.000Z",
        endTime: "2026-07-14T12:00:00.000Z",
        location: "Secure Stream 4",
        description: "Demonstrate integrated control matrix to developers."
      },
      {
        id: "cal-3",
        title: "Overlapping Event Test: GPU Shader Pitch",
        startTime: "2026-07-13T14:30:00.000Z",
        endTime: "2026-07-13T15:00:00.000Z",
        location: "Hologram Lab",
        description: "This is scheduled at the same time as the Server Architecture Review to test proactive conflict suggestions!"
      }
    ];
    fs.writeFileSync(CALENDAR_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(CALENDAR_FILE, "utf8"));
}

export function saveCalendar(events: CalendarEventItem[]) {
  ensureDirExists(CALENDAR_FILE);
  fs.writeFileSync(CALENDAR_FILE, JSON.stringify(events, null, 2), "utf8");
}

export function loadPrivacy(): PrivacyContextConfig {
  ensureDirExists(PRIVACY_FILE);
  if (!fs.existsSync(PRIVACY_FILE)) {
    const seed: PrivacyContextConfig = {
      useMemories: true,
      useProjects: true,
      useTasks: true,
      useActivityLogs: true,
      useCalendar: true
    };
    fs.writeFileSync(PRIVACY_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  return JSON.parse(fs.readFileSync(PRIVACY_FILE, "utf8"));
}

export function savePrivacy(privacy: PrivacyContextConfig) {
  ensureDirExists(PRIVACY_FILE);
  fs.writeFileSync(PRIVACY_FILE, JSON.stringify(privacy, null, 2), "utf8");
}

// --- Advanced Memory Intelligence (Relevance Scoring, Duplication & Contradiction) ---

export interface MemoryAuditResult {
  isDuplicate: boolean;
  isContradiction: boolean;
  conflictingMemory?: MemoryItem;
  matchingMemory?: MemoryItem;
}

/**
 * Audit a potential memory for duplicates or direct logical contradictions.
 * Keyword and semantic overlaps are checked in the same category.
 */
export function auditMemoryEntry(category: string, content: string, memories: MemoryItem[]): MemoryAuditResult {
  const contentLower = content.toLowerCase();
  
  // Extract key nouns/subjects to run heuristic overlap checks
  const getKeywords = (txt: string) => {
    return txt.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3 && !["what", "that", "this", "they", "your", "have", "with", "prefer", "prefers", "work"].includes(w));
  };

  const newKeywords = getKeywords(content);
  
  for (const m of memories) {
    if (m.category !== category) continue;
    
    const existingLower = m.content.toLowerCase();
    
    // 1. Check exact/highly-similar duplicate
    if (existingLower === contentLower || existingLower.includes(contentLower) || contentLower.includes(existingLower)) {
      return { isDuplicate: true, isContradiction: false, matchingMemory: m };
    }
    
    // Check keyword-based similarity overlap
    const existingKeywords = getKeywords(m.content);
    const common = newKeywords.filter(w => existingKeywords.includes(w));
    const overlapPercentage = common.length / Math.max(newKeywords.length, 1);
    
    if (overlapPercentage >= 0.6) {
      // High subject overlap. Let's inspect contrasting polarity (contradiction check)
      const negatives = ["dont", "don't", "not", "dislike", "hate", "no", "never", "refuse"];
      const newHasNeg = negatives.some(n => contentLower.includes(n));
      const oldHasNeg = negatives.some(n => existingLower.includes(n));
      
      // If polarities differ, or if it is an absolute assignment setting a different value 
      // (e.g. "preferred name is Alfred" vs "preferred name is Tony")
      const isPolarityClash = newHasNeg !== oldHasNeg;
      const isDifferentValueAssignment = 
        (contentLower.includes("preferred name") && existingLower.includes("preferred name")) ||
        (contentLower.includes("communication") && existingLower.includes("communication") && !common.includes("communication"));

      if (isPolarityClash || isDifferentValueAssignment) {
        return { isDuplicate: false, isContradiction: true, conflictingMemory: m };
      }
      
      // If we have very high keyword similarity, treat as candidates for updates instead of duplicates
      return { isDuplicate: true, isContradiction: false, matchingMemory: m };
    }
  }

  return { isDuplicate: false, isContradiction: false };
}

// --- Centralized Context Engine Assembly ---

export interface ContextInspectionPayload {
  timestamp: string;
  categoriesUsed: string[];
  memoriesCount: number;
  activeProject?: string;
  activeTask?: string;
  toolsInvolved: string[];
}

// Memory cache for Context Inspector
let lastContextInspection: ContextInspectionPayload | null = null;

export function getLastContextInspection(): ContextInspectionPayload | null {
  return lastContextInspection;
}

/**
 * Conversation continuity entity tracker.
 * Analyzes conversation messages to see what project or task was recently discussed
 */
export function traceReferencedEntities(messages: any[], projects: ProjectItem[], tasks: TaskItem[]) {
  if (messages.length === 0) return { activeProject: undefined, activeTask: undefined };

  let activeProject: ProjectItem | undefined;
  let activeTask: TaskItem | undefined;

  // Search backwards to locate explicit mentions of projects or tasks
  for (let i = messages.length - 1; i >= 0; i--) {
    const text = (messages[i].text || "").toLowerCase();
    
    // Check task mentions first
    if (!activeTask) {
      for (const t of tasks) {
        if (text.includes(t.title.toLowerCase()) || text.includes(t.id.toLowerCase())) {
          activeTask = t;
          break;
        }
      }
    }
    
    // Check project mentions
    if (!activeProject) {
      for (const p of projects) {
        if (text.includes(p.name.toLowerCase()) || text.includes(p.id.toLowerCase())) {
          activeProject = p;
          break;
        }
      }
    }

    if (activeProject && activeTask) break;
  }

  // If we found a task linked to a project, let that task resolve the active project too
  if (activeTask && activeTask.projectId && !activeProject) {
    activeProject = projects.find(p => p.id === activeTask!.projectId);
  }

  return { activeProject, activeTask };
}

/**
 * Master Context Assembler
 * Selects, ranks, and structures relevant items without bloating the prompt.
 */
export function assembleIntelligenceContext(
  latestMessage: string,
  messages: any[],
  privacy: PrivacyContextConfig
): { contextPrompt: string; inspector: ContextInspectionPayload } {
  
  const categoriesUsed: string[] = ["general_environment"];
  const toolsInvolved: string[] = [];
  
  const projects = loadProjects();
  const tasks = loadTasks();
  const memories = loadMemories();
  const calendar = loadCalendar();
  const reminders = loadReminders();
  const now = new Date();
  
  // 1. Establish Environment Context (always included)
  const environmentStr = `[CONTEXT: ENVIRONMENT]
Current Local Time: ${now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
Status: Nominal (Stage 7 Neural Matrix Core active)`;

  // 2. Resolve referential entity matching (Conversation Continuity)
  const { activeProject, activeTask } = traceReferencedEntities(messages, projects, tasks);
  
  let entityContinuityStr = "";
  if (activeProject || activeTask) {
    entityContinuityStr = `\n\n[CONTEXT: CONVERSATION CONTINUITY & ENTITY TRACKING]
The user might use pronouns like "it", "that", "this project", or "the task". Refer to these resolved active entities:`;
    if (activeProject) {
      entityContinuityStr += `\n- Active Referenced Project: "${activeProject.name}" (ID: ${activeProject.id}, Status: ${activeProject.status}, Deadline: ${activeProject.deadline})`;
    }
    if (activeTask) {
      entityContinuityStr += `\n- Active Referenced Task: "${activeTask.title}" (ID: ${activeTask.id}, Priority: ${activeTask.priority}, Status: ${activeTask.status})`;
    }
  }

  // 3. Selective Memory Context (Improved Relevance Scoring)
  let memoriesStr = "";
  let retrievedMemCount = 0;
  if (privacy.useMemories) {
    // Perform relevance keyword scoring
    const searchTerms = latestMessage.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(term => term.length > 2);
    
    if (searchTerms.length > 0) {
      const scoredMemories = memories.map(m => {
        let score = 0;
        const contentLower = m.content.toLowerCase();
        
        // Matches search terms
        for (const term of searchTerms) {
          if (contentLower.includes(term)) {
            score += 3;
            if (new RegExp(`\\b${term}\\b`, 'i').test(contentLower)) {
              score += 2; // Word boundaries bonus
            }
          }
        }
        
        // Recency bonus: slightly prioritize newer memories
        const ageInMs = now.getTime() - new Date(m.updatedAt || m.createdAt).getTime();
        const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
        if (ageInDays < 1) score += 1.5;
        else if (ageInDays < 7) score += 0.8;
        
        return { m, score };
      });
      
      const matched = scoredMemories
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.m)
        .slice(0, 4); // Limit to top 4 matches to prevent bloating prompt
      
      retrievedMemCount = matched.length;
      if (matched.length > 0) {
        categoriesUsed.push("memories");
        memoriesStr = `\n\n[CONTEXT: PERSONAL LONG-TERM MEMORY (Keyword-Relevant)]\n` + 
          matched.map(m => `- [Category: ${m.category}] ${m.content}`).join("\n");
      }
    }
  }

  // 4. Selective Project Intelligence
  let projectsStr = "";
  if (privacy.useProjects && projects.length > 0) {
    // Determine relevance based on keyword match
    const containsProjectKeyword = ["project", "working", "status", "deadline", "overdue", "todo", "finish", "it", "task", "progress"].some(kw => latestMessage.toLowerCase().includes(kw));
    
    if (containsProjectKeyword || activeProject) {
      categoriesUsed.push("projects");
      
      // Select projects that are active or explicitly referenced
      const targetProjects = activeProject 
        ? projects.filter(p => p.id === activeProject.id || p.status === "active" || p.status === "overdue")
        : projects.filter(p => p.status === "active" || p.status === "overdue");

      projectsStr = `\n\n[CONTEXT: ACTIVE PROJECTS]\n` +
        targetProjects.slice(0, 3).map(p => {
          const projTasks = tasks.filter(t => t.projectId === p.id);
          const pendingTasks = projTasks.filter(t => t.status === "pending");
          return `- "${p.name}" (${p.clientOrOrg}) [Status: ${p.status}, Deadline: ${new Date(p.deadline).toLocaleDateString()}]
  * Notes: ${p.notes}
  * Tasks (${pendingTasks.length} pending): ${pendingTasks.map(t => t.title).slice(0, 2).join(", ") || "None"}
  * Files involved: ${p.relatedFiles.join(", ") || "None"}`;
        }).join("\n");
    }
  }

  // 5. Selective Task and Agenda Intelligence
  let tasksStr = "";
  if (privacy.useTasks && tasks.length > 0) {
    const containsTaskKeyword = ["task", "todo", "agenda", "work", "schedule", "today", "tomorrow", "remind", "reminder", "finish", " Pepper"].some(kw => latestMessage.toLowerCase().includes(kw));
    
    if (containsTaskKeyword || activeTask) {
      categoriesUsed.push("tasks");
      const activeTasks = tasks.filter(t => t.status === "pending" || t.id === activeTask?.id);
      
      // Sort: High priority first, then closest due date
      const sortedTasks = activeTasks.sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      });

      tasksStr = `\n\n[CONTEXT: PENDING TASKS & AGENDA]\n` +
        sortedTasks.slice(0, 5).map(t => {
          const dueStr = t.dueDate ? `Due: ${new Date(t.dueDate).toLocaleDateString()}` : "No deadline";
          const proj = projects.find(p => p.id === t.projectId);
          return `- [${t.priority.toUpperCase()} PRIORITY] "${t.title}" ${proj ? `(Project: ${proj.name})` : ""} [${dueStr}]`;
        }).join("\n");
    }
  }

  // 6. Agenda & Overlapping Calendar Event Engine (Conflict checks)
  let agendaStr = "";
  if (privacy.useCalendar && calendar.length > 0) {
    const containsCalendarKeyword = ["meeting", "event", "calendar", "schedule", "today", "tomorrow", "busy", "free", "afternoon", "morning", "conflict"].some(kw => latestMessage.toLowerCase().includes(kw));
    
    if (containsCalendarKeyword) {
      categoriesUsed.push("calendar");
      
      // Find events occurring today or tomorrow
      const calendarEvents = calendar.filter(evt => {
        const start = new Date(evt.startTime);
        const dayDiff = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return dayDiff >= -0.5 && dayDiff <= 1.5; // From 12 hours ago to 36 hours from now
      });

      // Detect Conflicts / Overlapping Events
      const conflicts: string[] = [];
      for (let i = 0; i < calendarEvents.length; i++) {
        for (let j = i + 1; j < calendarEvents.length; j++) {
          const e1 = calendarEvents[i];
          const e2 = calendarEvents[j];
          
          const s1 = new Date(e1.startTime).getTime();
          const e1End = new Date(e1.endTime).getTime();
          const s2 = new Date(e2.startTime).getTime();
          const e2End = new Date(e2.endTime).getTime();
          
          const overlaps = (s1 < e2End && s2 < e1End);
          if (overlaps) {
            conflicts.push(`CRITICAL CONFLICT DETECTED: "${e1.title}" overlaps with "${e2.title}" between ${new Date(Math.max(s1, s2)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} and ${new Date(Math.min(e1End, e2End)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
          }
        }
      }

      agendaStr = `\n\n[CONTEXT: UPCOMING CALENDAR AGENDA]\n` +
        calendarEvents.map(evt => {
          const start = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const end = new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const date = new Date(evt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
          return `- "${evt.title}" at ${evt.location || "unspecified"} [${date} @ ${start} - ${end}] ${evt.description ? `(${evt.description})` : ""}`;
        }).join("\n");
      
      if (conflicts.length > 0) {
        agendaStr += `\n\n[CONFLICT ALERTS]\n` + conflicts.join("\n");
      }
    }
  }

  // 7. Recent Approved Activity Logs
  let activityStr = "";
  if (privacy.useActivityLogs) {
    const logsData = loadIntegrationsData();
    if (logsData?.logs?.length > 0) {
      // Fetch last 3 approved activities for immediate task status checks
      const recentApproved = logsData.logs
        .filter((l: any) => l.actionType === "Execute" || l.actionType === "Approve")
        .slice(-3);
      
      if (recentApproved.length > 0) {
        categoriesUsed.push("recent_activity");
        activityStr = `\n\n[CONTEXT: RECENT APPROVED ACTIONS]\n` +
          recentApproved.map((l: any) => `- Action: ${l.toolName} ${l.parameters ? `with parameters ${JSON.stringify(l.parameters)}` : ""}`).join("\n");
      }
    }
  }

  // Compile master prompt block safely
  const contextPrompt = `
==================================================
CONTEXT ENGINE INJECTED METADATA (DO NOT ECHO DIRECTLY)
==================================================
${environmentStr}
${entityContinuityStr}
${memoriesStr}
${projectsStr}
${tasksStr}
${agendaStr}
${activityStr}
==================================================
`.trim();

  // Populate inspection object for safe Context Inspector view
  const inspector: ContextInspectionPayload = {
    timestamp: now.toISOString(),
    categoriesUsed,
    memoriesCount: retrievedMemCount,
    activeProject: activeProject?.name,
    activeTask: activeTask?.title,
    toolsInvolved
  };

  lastContextInspection = inspector;

  return { contextPrompt, inspector };
}

// --- Dynamic Daily Briefing Generator ---

export interface DailyBriefingPayload {
  date: string;
  hasWeather: boolean;
  weatherLocation?: string;
  weatherTemp?: string;
  weatherCondition?: string;
  tasksCount: number;
  remindersCount: number;
  calendarCount: number;
  overdueProjectsCount: number;
  conflictsCount: number;
  briefingText: string;
}

/**
 * Generates an extremely polished, real-world custom Daily Briefing
 */
export function generateDailyBriefing(weatherData?: any): DailyBriefingPayload {
  const now = new Date();
  const dateStr = now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  
  const projects = loadProjects();
  const tasks = loadTasks();
  const calendar = loadCalendar();
  const reminders = loadReminders();
  
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + (24 * 60 * 60 * 1000);

  // 1. Gather calendar events for today
  const todaysEvents = calendar.filter(evt => {
    const start = new Date(evt.startTime).getTime();
    return start >= todayStart && start < todayEnd;
  });

  // 2. Gather active tasks due today or overdue
  const todaysTasks = tasks.filter(t => {
    if (t.status !== "pending") return false;
    if (!t.dueDate) return false;
    const dueTime = new Date(t.dueDate).getTime();
    return dueTime <= todayEnd; // Due today or earlier (overdue)
  });

  // 3. Active reminders
  const activeReminders = reminders.filter(r => r.status === "active");

  // 4. Overdue projects
  const overdueProjects = projects.filter(p => {
    if (p.status === "completed") return false;
    const deadlineTime = new Date(p.deadline).getTime();
    return deadlineTime < now.getTime();
  });

  // 5. Calendar conflict count
  let conflictCount = 0;
  for (let i = 0; i < todaysEvents.length; i++) {
    for (let j = i + 1; j < todaysEvents.length; j++) {
      const e1 = todaysEvents[i];
      const e2 = todaysEvents[j];
      const s1 = new Date(e1.startTime).getTime();
      const e1End = new Date(e1.endTime).getTime();
      const s2 = new Date(e2.startTime).getTime();
      const e2End = new Date(e2.endTime).getTime();
      if (s1 < e2End && s2 < e1End) {
        conflictCount++;
      }
    }
  }

  const privacyData = loadPrivacy();
  const userName = (privacyData as any).preferredName || "Tony";

  // Build the briefing text naturally
  let text = `Good morning, ${userName}. Here is your briefing for ${dateStr}.

`;

  if (weatherData) {
    text += `The weather in ${weatherData.location || "Malibu"} is currently ${weatherData.tempF || weatherData.tempC || "72"}°F and ${weatherData.condition || "Clear"}.\n\n`;
  }

  text += `**Agenda Outlook:**\n`;
  if (todaysEvents.length > 0) {
    text += todaysEvents.map(evt => {
      const start = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `- ${start}: ${evt.title} (${evt.location || "Workshop"})`;
    }).join("\n") + "\n";
  } else {
    text += `- Your calendar is clear of structured events today.\n`;
  }

  text += `\n**Task Vectors:**\n`;
  if (todaysTasks.length > 0) {
    text += todaysTasks.map(t => `- [${t.priority.toUpperCase()}] ${t.title}`).join("\n") + "\n";
  } else {
    text += `- No pressing tasks due today.\n`;
  }

  if (activeReminders.length > 0) {
    text += `\n**Pending Alerts:**\n` + activeReminders.map(r => `- ${r.title}`).join("\n") + "\n";
  }

  if (overdueProjects.length > 0) {
    text += `\n**Operational Notices:**\n`;
    text += `- You have ${overdueProjects.length} active project exceeding planned deadlines: ${overdueProjects.map(p => `"${p.name}"`).join(", ")}.\n`;
  }

  if (conflictCount > 0) {
    text += `\n**Notice:** I have detected ${conflictCount} schedule conflict on your agenda today. Let me know if you would like me to assist in rescheduling coordinates.`;
  }

  return {
    date: dateStr,
    hasWeather: !!weatherData,
    weatherLocation: weatherData?.location,
    weatherTemp: weatherData ? `${weatherData.tempF || weatherData.tempC}°F` : undefined,
    weatherCondition: weatherData?.condition,
    tasksCount: todaysTasks.length,
    remindersCount: activeReminders.length,
    calendarCount: todaysEvents.length,
    overdueProjectsCount: overdueProjects.length,
    conflictsCount: conflictCount,
    briefingText: text
  };
}

// --- Stage 9 Workflows and Automation History ---

const WORKFLOWS_FILE = path.join(process.cwd(), "data", "workflows.json");
const HISTORY_FILE = path.join(process.cwd(), "data", "automation_history.json");

export function loadWorkflows(): any[] {
  ensureDirExists(WORKFLOWS_FILE);
  if (!fs.existsSync(WORKFLOWS_FILE)) {
    const seed = [
      {
        id: "wf-1",
        name: "Create New Video Project Structure",
        description: "Creates folder architecture and registers creative project record with default checklists.",
        steps: [
          { id: "step-1", toolName: "manage_projects", args: { action: "create", name: "Dynamic Promo", type: "Promotional video" }, description: "Register new creative project" },
          { id: "step-2", toolName: "open_website", args: { url: "https://youtube.com" }, description: "Open reference platform" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "wf-2",
        name: "Rapid Social Media Workflow",
        description: "Initializes social media content draft with standard vertical templates.",
        steps: [
          { id: "step-1", toolName: "manage_projects", args: { action: "create", name: "Vertical Reel", type: "Social media content" }, description: "Create vertical format project" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(WORKFLOWS_FILE, "utf8"));
  } catch (err) {
    return [];
  }
}

export function saveWorkflows(workflows: any[]) {
  ensureDirExists(WORKFLOWS_FILE);
  fs.writeFileSync(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), "utf8");
}

export function loadAutomationHistory(): any[] {
  ensureDirExists(HISTORY_FILE);
  if (!fs.existsSync(HISTORY_FILE)) {
    const seed = [
      {
        id: "run-1",
        workflowId: "wf-1",
        workflowName: "Create New Video Project Structure",
        startTime: new Date(Date.now() - 3600000).toISOString(),
        endTime: new Date(Date.now() - 3590000).toISOString(),
        actionsPerformed: [
          { toolName: "manage_projects", params: { action: "create", name: "Dynamic Promo", type: "Promotional video" }, status: "success", result: "Project created with ID proj-123" },
          { toolName: "open_website", params: { url: "https://youtube.com" }, status: "success", result: "Browser opened" }
        ],
        permissionsRequested: ["manage_projects", "open_website"],
        status: "completed"
      }
    ];
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (err) {
    return [];
  }
}

export function saveAutomationHistory(history: any[]) {
  ensureDirExists(HISTORY_FILE);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

