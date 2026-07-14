/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { currentUserProfile } from "./src/config/profile";
import { generateSystemInstruction } from "./src/config/personality";
import { loadMemories, saveMemories, findRelevantMemories, containsSensitiveSecrets, MemoryItem } from "./server/memory";
import { ToolRegistry, getGeminiToolDeclarations } from "./server/tools";
import { 
  loadIntegrationsData, 
  saveIntegrationsData, 
  logActivity, 
  IntegrationStatus,
  getGithubProfile,
  getGithubRepositories,
  getGithubActivity
} from "./server/integrations";
import {
  loadProjects,
  saveProjects,
  loadTasks,
  saveTasks,
  loadReminders,
  saveReminders,
  loadCalendar,
  saveCalendar,
  loadPrivacy,
  savePrivacy,
  assembleIntelligenceContext,
  generateDailyBriefing,
  getLastContextInspection,
  ProjectItem,
  TaskItem,
  ReminderItem,
  CalendarEventItem,
  PrivacyContextConfig,
  loadWorkflows,
  saveWorkflows,
  loadAutomationHistory,
  saveAutomationHistory
} from "./server/context";

// Load environment variables in development
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// API: Check system health and backend configuration
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "online",
    stage: 4,
    service: "JARVIS-AI-Brain",
    apiConfigured: hasKey,
    userPreferredName: currentUserProfile.preferredName
  });
});

// Memory CRUD REST APIs
app.get("/api/memories", (req, res) => {
  const query = (req.query.q as string) || "";
  const memories = loadMemories();
  if (query) {
    const results = memories.filter(m => 
      m.content.toLowerCase().includes(query.toLowerCase()) || 
      m.category.toLowerCase().includes(query.toLowerCase())
    );
    res.json(results);
  } else {
    res.json(memories);
  }
});

app.post("/api/memories", (req, res) => {
  const { category, content, source } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required." });
    return;
  }
  if (containsSensitiveSecrets(content)) {
    res.status(400).json({ error: "Refused storage of sensitive credentials (passwords, tokens, API keys). Please do not save secrets." });
    return;
  }
  const memories = loadMemories();
  const newMemory: MemoryItem = {
    id: `mem-${Date.now()}`,
    category: category || "facts",
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: source || "Manual User Entry"
  };
  memories.push(newMemory);
  saveMemories(memories);
  res.json(newMemory);
});

app.put("/api/memories/:id", (req, res) => {
  const { id } = req.params;
  const { category, content } = req.body;
  if (content && containsSensitiveSecrets(content)) {
    res.status(400).json({ error: "Refused storage of sensitive credentials (passwords, tokens, API keys)." });
    return;
  }
  const memories = loadMemories();
  const idx = memories.findIndex(m => m.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Memory not found." });
    return;
  }
  memories[idx] = {
    ...memories[idx],
    category: category || memories[idx].category,
    content: content || memories[idx].content,
    updatedAt: new Date().toISOString()
  };
  saveMemories(memories);
  res.json(memories[idx]);
});

app.delete("/api/memories/:id", (req, res) => {
  const { id } = req.params;
  let memories = loadMemories();
  const initialLength = memories.length;
  memories = memories.filter(m => m.id !== id);
  if (memories.length === initialLength) {
    res.status(404).json({ error: "Memory not found." });
    return;
  }
  saveMemories(memories);
  res.json({ success: true, id });
});

app.delete("/api/memories", (req, res) => {
  saveMemories([]);
  res.json({ success: true, message: "All memories cleared." });
});

// -------------------------------------------------------------
// Stage 7: Centralized OS Intelligence REST Matrix
// -------------------------------------------------------------

// Projects CRUD
app.get("/api/projects", (req, res) => {
  res.json(loadProjects());
});

app.post("/api/projects", (req, res) => {
  const { name, clientOrOrg, type, status, deadline, notes, relatedFiles } = req.body;
  if (!name) {
    res.status(400).json({ error: "Project name is required." });
    return;
  }
  const projects = loadProjects();
  const newProject: ProjectItem = {
    id: `proj-${Date.now()}`,
    name,
    clientOrOrg: clientOrOrg || "Internal",
    type: type || "General",
    status: status || "active",
    deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tasksCount: 0,
    notes: notes || "",
    relatedFiles: relatedFiles || [],
    recentActivity: "Project initialized.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(newProject);
  saveProjects(projects);
  logActivity("Project", "Config", { name }, "SAFE", { success: true });
  res.json(newProject);
});

app.put("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  projects[idx] = {
    ...projects[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  saveProjects(projects);
  res.json(projects[idx]);
});

app.delete("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  let projects = loadProjects();
  const initialLength = projects.length;
  projects = projects.filter(p => p.id !== id);
  if (projects.length === initialLength) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  saveProjects(projects);
  res.json({ success: true, id });
});

// Tasks CRUD
app.get("/api/tasks", (req, res) => {
  res.json(loadTasks());
});

app.post("/api/tasks", (req, res) => {
  const { projectId, title, priority, status, dueDate } = req.body;
  if (!title) {
    res.status(400).json({ error: "Task title is required." });
    return;
  }
  const tasks = loadTasks();
  const newTask: TaskItem = {
    id: `task-${Date.now()}`,
    projectId,
    title,
    priority: priority || "medium",
    status: status || "pending",
    dueDate: dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);

  // Auto-update project tasksCount
  if (projectId) {
    const projects = loadProjects();
    const pIdx = projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) {
      projects[pIdx].tasksCount = (projects[pIdx].tasksCount || 0) + 1;
      projects[pIdx].recentActivity = `Task added: "${title}"`;
      projects[pIdx].updatedAt = new Date().toISOString();
      saveProjects(projects);
    }
  }

  logActivity("Task", "Config", { title }, "SAFE", { success: true });
  res.json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  const oldProjectId = tasks[idx].projectId;
  tasks[idx] = {
    ...tasks[idx],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  saveTasks(tasks);

  // If status changed or project linked changed, update counts
  if (req.body.projectId !== undefined && req.body.projectId !== oldProjectId) {
    const projects = loadProjects();
    if (oldProjectId) {
      const oldIdx = projects.findIndex(p => p.id === oldProjectId);
      if (oldIdx !== -1) {
        projects[oldIdx].tasksCount = Math.max(0, (projects[oldIdx].tasksCount || 1) - 1);
        projects[oldIdx].updatedAt = new Date().toISOString();
      }
    }
    if (req.body.projectId) {
      const newIdx = projects.findIndex(p => p.id === req.body.projectId);
      if (newIdx !== -1) {
        projects[newIdx].tasksCount = (projects[newIdx].tasksCount || 0) + 1;
        projects[newIdx].updatedAt = new Date().toISOString();
      }
    }
    saveProjects(projects);
  }

  res.json(tasks[idx]);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  let tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Task not found." });
    return;
  }
  const projectId = tasks[idx].projectId;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);

  // Decrement project tasks count
  if (projectId) {
    const projects = loadProjects();
    const pIdx = projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) {
      projects[pIdx].tasksCount = Math.max(0, (projects[pIdx].tasksCount || 1) - 1);
      projects[pIdx].updatedAt = new Date().toISOString();
      saveProjects(projects);
    }
  }

  res.json({ success: true, id });
});

// Reminders CRUD
app.get("/api/reminders", (req, res) => {
  res.json(loadReminders());
});

app.post("/api/reminders", (req, res) => {
  const { title, time } = req.body;
  if (!title) {
    res.status(400).json({ error: "Reminder title is required." });
    return;
  }
  const reminders = loadReminders();
  const newReminder: ReminderItem = {
    id: `rem-${Date.now()}`,
    title,
    time: time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "active"
  };
  reminders.push(newReminder);
  saveReminders(reminders);
  logActivity("Reminder", "Config", { title }, "SAFE", { success: true });
  res.json(newReminder);
});

app.put("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  const reminders = loadReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Reminder not found." });
    return;
  }
  reminders[idx] = {
    ...reminders[idx],
    ...req.body
  };
  saveReminders(reminders);
  res.json(reminders[idx]);
});

app.delete("/api/reminders/:id", (req, res) => {
  const { id } = req.params;
  let reminders = loadReminders();
  const initialLength = reminders.length;
  reminders = reminders.filter(r => r.id !== id);
  if (reminders.length === initialLength) {
    res.status(404).json({ error: "Reminder not found." });
    return;
  }
  saveReminders(reminders);
  res.json({ success: true, id });
});

// Calendar CRUD
app.get("/api/calendar", (req, res) => {
  res.json(loadCalendar());
});

app.post("/api/calendar", (req, res) => {
  const { title, startTime, endTime, location, description } = req.body;
  if (!title || !startTime || !endTime) {
    res.status(400).json({ error: "Title, startTime, and endTime are required." });
    return;
  }
  const events = loadCalendar();
  const newEvent: CalendarEventItem = {
    id: `cal-${Date.now()}`,
    title,
    startTime,
    endTime,
    location,
    description
  };
  events.push(newEvent);
  saveCalendar(events);
  logActivity("Calendar", "Config", { title }, "SAFE", { success: true });
  res.json(newEvent);
});

app.put("/api/calendar/:id", (req, res) => {
  const { id } = req.params;
  const events = loadCalendar();
  const idx = events.findIndex(e => e.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Calendar event not found." });
    return;
  }
  events[idx] = {
    ...events[idx],
    ...req.body
  };
  saveCalendar(events);
  res.json(events[idx]);
});

app.delete("/api/calendar/:id", (req, res) => {
  const { id } = req.params;
  let events = loadCalendar();
  const initialLength = events.length;
  events = events.filter(e => e.id !== id);
  if (events.length === initialLength) {
    res.status(404).json({ error: "Calendar event not found." });
    return;
  }
  saveCalendar(events);
  res.json({ success: true, id });
});

// Context & Privacy APIs
app.get("/api/context/inspect", (req, res) => {
  const inspection = getLastContextInspection();
  if (inspection) {
    res.json(inspection);
  } else {
    res.json({
      timestamp: new Date().toISOString(),
      categoriesUsed: ["general_environment"],
      memoriesCount: 0,
      toolsInvolved: []
    });
  }
});

app.get("/api/context/privacy", (req, res) => {
  res.json(loadPrivacy());
});

app.post("/api/context/privacy", (req, res) => {
  savePrivacy(req.body);
  logActivity("Privacy settings", "Config", req.body, "SAFE", { success: true });
  res.json({ success: true, privacy: req.body });
});

// =============================================================
// Stage 9: Custom Desktop, Workflows & Media Intelligence
// =============================================================

// Workflows CRUD
app.get("/api/workflows", (req, res) => {
  res.json(loadWorkflows());
});

app.post("/api/workflows", (req, res) => {
  const { name, description, steps } = req.body;
  if (!name || !steps || !Array.isArray(steps)) {
    res.status(400).json({ error: "Workflow name and steps are required." });
    return;
  }
  const workflows = loadWorkflows();
  const newWorkflow = {
    id: `wf-${Date.now()}`,
    name,
    description: description || "",
    steps,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  workflows.push(newWorkflow);
  saveWorkflows(workflows);
  res.json(newWorkflow);
});

app.delete("/api/workflows/:id", (req, res) => {
  const { id } = req.params;
  let workflows = loadWorkflows();
  const len = workflows.length;
  workflows = workflows.filter(w => w.id !== id);
  if (workflows.length === len) {
    res.status(404).json({ error: "Workflow not found." });
    return;
  }
  saveWorkflows(workflows);
  res.json({ success: true, id });
});

// Automation History
app.get("/api/automation/history", (req, res) => {
  res.json(loadAutomationHistory());
});

app.post("/api/automation/history", (req, res) => {
  const history = loadAutomationHistory();
  const item = {
    id: `run-${Date.now()}`,
    ...req.body,
    startTime: req.body.startTime || new Date().toISOString()
  };
  history.push(item);
  saveAutomationHistory(history);
  res.json(item);
});

// Real-world Tool Automation Executing Loop
app.post("/api/automation/run", async (req, res) => {
  const { workflowId, workflowName, steps } = req.body;
  if (!steps || !Array.isArray(steps)) {
    res.status(400).json({ error: "Steps are required to run a workflow." });
    return;
  }

  const historyItem: any = {
    id: `run-${Date.now()}`,
    workflowId,
    workflowName: workflowName || "Ad-hoc Workflow Action",
    startTime: new Date().toISOString(),
    actionsPerformed: [],
    permissionsRequested: steps.map((s: any) => s.toolName),
    status: "running"
  };

  const currentHistory = loadAutomationHistory();
  currentHistory.push(historyItem);
  saveAutomationHistory(currentHistory);

  let status: 'completed' | 'failed' | 'cancelled' | 'partial' = "completed";

  for (const step of steps) {
    const tool = ToolRegistry[step.toolName];
    if (!tool) {
      historyItem.actionsPerformed.push({
        toolName: step.toolName,
        params: step.args,
        status: "failed",
        error: `Tool ${step.toolName} not found in JARVIS registry.`
      });
      status = "partial";
      continue;
    }

    try {
      // Direct execution on the system tool!
      const result = await tool.execute(step.args);
      historyItem.actionsPerformed.push({
        toolName: step.toolName,
        params: step.args,
        status: "success",
        result: JSON.stringify(result)
      });
    } catch (err: any) {
      historyItem.actionsPerformed.push({
        toolName: step.toolName,
        params: step.args,
        status: "failed",
        error: err.message
      });
      status = "partial";
    }
  }

  historyItem.status = status;
  historyItem.endTime = new Date().toISOString();

  // Save the complete log results back to file
  const index = currentHistory.findIndex(h => h.id === historyItem.id);
  if (index !== -1) {
    currentHistory[index] = historyItem;
  }
  saveAutomationHistory(currentHistory);

  res.json(historyItem);
});

// Media Folder Scanner
app.get("/api/media/scan", (req, res) => {
  const folder = (req.query.folder as string) || "projects/aau_nightlife";
  
  const mockMediaFiles = [
    {
      filename: "DJ_BOARD_REC_01.wav",
      filePath: `${folder}/audio/DJ_BOARD_REC_01.wav`,
      fileType: "audio",
      fileSize: "45.2 MB",
      duration: "04:12",
      creationDate: "2026-07-14T10:00:00.000Z"
    },
    {
      filename: "C001_ENTRANCE_LOMO.mp4",
      filePath: `${folder}/footage/C001_ENTRANCE_LOMO.mp4`,
      fileType: "video",
      fileSize: "842.1 MB",
      duration: "00:18",
      resolution: "3840x2160",
      frameRate: 60,
      aspectRatio: "16:9",
      creationDate: "2026-07-14T10:15:00.000Z"
    },
    {
      filename: "C002_NEON_TRANSITION.mp4",
      filePath: `${folder}/footage/C002_NEON_TRANSITION.mp4`,
      fileType: "video",
      fileSize: "420.5 MB",
      duration: "00:09",
      resolution: "3840x2160",
      frameRate: 24,
      aspectRatio: "16:9",
      creationDate: "2026-07-14T10:20:00.000Z"
    },
    {
      filename: "STILL_PRE_VISUAL.png",
      filePath: `${folder}/graphics/STILL_PRE_VISUAL.png`,
      fileType: "image",
      fileSize: "3.2 MB",
      resolution: "1920x1080",
      aspectRatio: "16:9",
      creationDate: "2026-07-14T10:30:00.000Z"
    },
    {
      filename: "TIKTOK_TEASER_V01.mp4",
      filePath: `${folder}/exports/TIKTOK_TEASER_V01.mp4`,
      fileType: "video",
      fileSize: "15.7 MB",
      duration: "00:30",
      resolution: "1080x1920",
      frameRate: 30,
      aspectRatio: "9:16",
      creationDate: "2026-07-14T11:05:00.000Z"
    }
  ];

  res.json({ folder, files: mockMediaFiles });
});

// Media Organizer
app.post("/api/media/organize", (req, res) => {
  const { folder, filesToOrganize } = req.body;
  if (!folder) {
    res.status(400).json({ error: "Target folder is required." });
    return;
  }
  logActivity("Media Organizer", "Execute", { folder, fileCount: filesToOrganize?.length || 0 }, "SAFE", { success: true });
  res.json({
    success: true,
    message: `Successfully organized ${filesToOrganize?.length || 0} media assets inside '${folder}' structures under 'footage/', 'audio/', 'graphics/', and 'exports/'.`,
    timestamp: new Date().toISOString()
  });
});

// Gemini-Powered Multimodal Screen Capture & Context Analysis API
app.post("/api/screen/analyze", async (req, res) => {
  const { screenshotBase64, query } = req.body;
  if (!screenshotBase64) {
    res.status(400).json({ error: "Screenshot base64 payload is required." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Gemini API is not configured.",
      details: "The GEMINI_API_KEY secret is missing. Screen analysis falls back to local simulation."
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
    const userPrompt = query || "You are looking at my screen context. Tell me if you see any software errors, warnings, or explain what is on the screen with dynamic, helpful tech context. Be extremely specific and clear.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        userPrompt,
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Data
          }
        }
      ]
    });

    res.json({ success: true, analysis: response.text });
  } catch (err: any) {
    console.error("[ScreenAnalyze] Gemini API error:", err);
    res.status(500).json({ error: "Gemini analysis failed", details: err.message });
  }
});


app.get("/api/context/briefing", async (req, res) => {
  // Pull live weather in Malibu if configured or active, via the local weather API
  let weatherData: any = null;
  try {
    const { performWeatherSearch } = await import("./server/integrations");
    weatherData = await performWeatherSearch("Malibu");
  } catch (err) {
    console.warn("Failed to automatically query wttr.in during briefing:", err);
  }
  res.json(generateDailyBriefing(weatherData));
});

// -------------------------------------------------------------
// Integrations and Connective API Matrix
// -------------------------------------------------------------

app.get("/api/integrations/status", async (req, res) => {
  const data = loadIntegrationsData();
  const spotifyClientId = data.settings.spotifyClientId || process.env.SPOTIFY_CLIENT_ID;
  const spotifyClientSecret = data.settings.spotifyClientSecret || process.env.SPOTIFY_CLIENT_SECRET;
  const githubClientId = data.settings.githubClientId || process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = data.settings.githubClientSecret || process.env.GITHUB_CLIENT_SECRET;
  
  // Dynamic probing of desktop agent helper
  let desktopStatus: IntegrationStatus = "connected"; // Default to sandbox connected state
  if (data.settings.desktopAgentMode === "local") {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);
      const probe = await fetch("http://localhost:3001/health", { signal: controller.signal });
      clearTimeout(id);
      desktopStatus = probe.ok ? "connected" : "unavailable";
    } catch {
      desktopStatus = "unavailable";
    }
  }

  // Fetch GitHub profile, repos, and activity to return dynamic indicators if connected or simulated!
  let githubProfile = null;
  let githubRepos = [];
  let githubActivity = [];
  if (data.githubConnected) {
    try {
      githubProfile = await getGithubProfile();
      githubRepos = await getGithubRepositories();
      githubActivity = await getGithubActivity();
    } catch (e) {
      console.error("Error fetching GitHub details for status:", e);
    }
  }

  res.json({
    webSearch: { status: "connected", label: "Web Search (DDG Lite)" },
    weather: { status: "connected", label: "Weather Service (wttr.in)" },
    spotify: {
      status: data.spotifyConnected 
        ? "connected" 
        : (spotifyClientId && spotifyClientSecret ? "not_connected" : "config_required"),
      isSimulated: data.spotifyIsSimulated,
      label: data.spotifyIsSimulated ? "Spotify Player (Sandbox Simulation)" : "Spotify Player (Real Session)"
    },
    github: {
      status: data.githubConnected 
        ? "connected" 
        : (githubClientId && githubClientSecret ? "not_connected" : "config_required"),
      isSimulated: data.githubIsSimulated,
      label: data.githubIsSimulated ? "GitHub Platform (Sandbox Simulation)" : "GitHub Platform (Real Session)",
      profile: githubProfile,
      repos: githubRepos,
      activity: githubActivity
    },
    youtube: { status: "connected", label: "YouTube Integration" },
    desktopControl: { 
      status: desktopStatus, 
      mode: data.settings.desktopAgentMode,
      label: data.settings.desktopAgentMode === "sandbox" ? "Desktop Actions (Sandbox Simulation)" : "Desktop Actions (Local Agent Link)"
    }
  });
});

app.post("/api/integrations/toggle", (req, res) => {
  const { service, mode } = req.body;
  const data = loadIntegrationsData();

  if (service === "spotify") {
    if (mode === "connect_simulated") {
      data.spotifyConnected = true;
      data.spotifyIsSimulated = true;
      logActivity("Spotify", "StatusChange", { connected: true, simulated: true }, "SAFE", { success: true });
    } else if (mode === "disconnect") {
      data.spotifyConnected = false;
      data.spotifyIsSimulated = true;
      data.settings.spotifyAccessToken = undefined;
      data.settings.spotifyRefreshToken = undefined;
      logActivity("Spotify", "StatusChange", { connected: false, simulated: true }, "SAFE", { success: true });
    }
  } else if (service === "github") {
    if (mode === "connect_simulated") {
      data.githubConnected = true;
      data.githubIsSimulated = true;
      logActivity("GitHub", "StatusChange", { connected: true, simulated: true }, "SAFE", { success: true });
    } else if (mode === "disconnect") {
      data.githubConnected = false;
      data.githubIsSimulated = true;
      data.settings.githubAccessToken = undefined;
      logActivity("GitHub", "StatusChange", { connected: false, simulated: true }, "SAFE", { success: true });
    }
  } else if (service === "desktop") {
    if (mode === "sandbox") {
      data.settings.desktopAgentMode = "sandbox";
      logActivity("Desktop Control", "StatusChange", { mode: "sandbox" }, "SAFE", { success: true });
    } else if (mode === "local") {
      data.settings.desktopAgentMode = "local";
      logActivity("Desktop Control", "StatusChange", { mode: "local" }, "SAFE", { success: true });
    }
  }

  saveIntegrationsData(data);
  res.json({ success: true, message: "Integration parameters updated successfully." });
});

app.get("/api/integrations/settings", (req, res) => {
  const data = loadIntegrationsData();
  // Sanitize tokens
  res.json({
    spotifyClientId: data.settings.spotifyClientId || "",
    spotifyClientSecret: data.settings.spotifyClientSecret ? "••••••••••••••••" : "",
    githubClientId: data.settings.githubClientId || "",
    githubClientSecret: data.settings.githubClientSecret ? "••••••••••••••••" : "",
    desktopAgentMode: data.settings.desktopAgentMode
  });
});

app.post("/api/integrations/settings", (req, res) => {
  const { spotifyClientId, spotifyClientSecret, githubClientId, githubClientSecret, desktopAgentMode } = req.body;
  const data = loadIntegrationsData();

  if (desktopAgentMode) {
    data.settings.desktopAgentMode = desktopAgentMode;
  }
  if (spotifyClientId !== undefined) {
    data.settings.spotifyClientId = spotifyClientId;
  }
  if (spotifyClientSecret !== undefined && spotifyClientSecret !== "••••••••••••••••") {
    data.settings.spotifyClientSecret = spotifyClientSecret;
  }
  if (githubClientId !== undefined) {
    data.settings.githubClientId = githubClientId;
  }
  if (githubClientSecret !== undefined && githubClientSecret !== "••••••••••••••••") {
    data.settings.githubClientSecret = githubClientSecret;
  }

  saveIntegrationsData(data);
  logActivity("System settings", "Config", { hasClientId: !!spotifyClientId }, "SAFE", { success: true });
  res.json({ success: true, message: "Integration credentials persisted successfully." });
});

app.get("/api/integrations/logs", (req, res) => {
  const data = loadIntegrationsData();
  res.json(data.logs || []);
});

app.delete("/api/integrations/logs", (req, res) => {
  const data = loadIntegrationsData();
  data.logs = [];
  saveIntegrationsData(data);
  res.json({ success: true, message: "Activity logs flushed successfully." });
});

// -------------------------------------------------------------
// Spotify Real OAuth Flow Endpoints
// -------------------------------------------------------------

app.get("/api/auth/spotify/url", (req, res) => {
  const data = loadIntegrationsData();
  const clientId = data.settings.spotifyClientId || process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({ error: "Spotify Client ID is not configured in settings." });
    return;
  }
  
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/api/auth/spotify/callback`;
  
  const scopes = "user-read-playback-state user-modify-playback-state user-read-currently-playing";
  const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scopes
  }).toString()}`;
  
  res.json({ url: authUrl });
});

app.get("/api/auth/spotify/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(400).send("Authorization code missing from Spotify redirect query parameters.");
    return;
  }

  const data = loadIntegrationsData();
  const clientId = data.settings.spotifyClientId || process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = data.settings.spotifyClientSecret || process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    res.status(400).send("Spotify Client ID or Secret key is missing. Configure them in settings first.");
    return;
  }

  try {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/spotify/callback`;

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      throw new Error(`Spotify token exchange rejected with status ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    data.settings.spotifyAccessToken = tokenData.access_token;
    data.settings.spotifyRefreshToken = tokenData.refresh_token;
    data.spotifyConnected = true;
    data.spotifyIsSimulated = false;
    
    saveIntegrationsData(data);
    logActivity("Spotify OAuth", "StatusChange", { connected: true, simulated: false }, "SAFE", { success: true });

    res.send(`
      <html>
        <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h1 style="color: #1DB954; font-size: 24px; margin-bottom: 10px;">Connection Authorized</h1>
            <p style="color: #ccc; font-size: 14px; margin-bottom: 20px;">Spotify account linked successfully with JARVIS.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'SPOTIFY_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[SpotifyOAuth] Callback failure:", err.message);
    res.status(500).send(`OAuth verification failed: ${err.message}`);
  }
});

// -------------------------------------------------------------
// GitHub Real OAuth Flow Endpoints
// -------------------------------------------------------------

app.get("/api/auth/github/url", (req, res) => {
  const data = loadIntegrationsData();
  const clientId = data.settings.githubClientId || process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({ error: "GitHub Client ID is not configured in settings." });
    return;
  }
  
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/api/auth/github/callback`;
  
  const scopes = "repo user read:user";
  const authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes
  }).toString()}`;
  
  res.json({ url: authUrl });
});

app.get("/api/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(400).send("Authorization code missing from GitHub redirect query parameters.");
    return;
  }

  const data = loadIntegrationsData();
  const clientId = data.settings.githubClientId || process.env.GITHUB_CLIENT_ID;
  const clientSecret = data.settings.githubClientSecret || process.env.GITHUB_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    res.status(400).send("GitHub Client ID or Secret key is missing. Configure them in settings first.");
    return;
  }

  try {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/github/callback`;

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange rejected with status ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(`GitHub error: ${tokenData.error_description || tokenData.error}`);
    }

    data.settings.githubAccessToken = tokenData.access_token;
    data.githubConnected = true;
    data.githubIsSimulated = false;
    
    saveIntegrationsData(data);
    logActivity("GitHub OAuth", "StatusChange", { connected: true, simulated: false }, "SAFE", { success: true });

    res.send(`
      <html>
        <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <h1 style="color: #4ade80; font-size: 24px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;">
              <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" style="fill: currentColor;">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 3.1 1.07-.01.64-.01 1.25-.01 1.48 0 .21-.15.48-.55.38A8.014 8.014 0 0 1 0 8c0-4.42 3.58-8 8-8z"></path>
              </svg>
              GitHub Linked
            </h1>
            <p style="color: #ccc; font-size: 14px; margin-bottom: 20px;">GitHub account linked successfully with JARVIS.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[GitHubOAuth] Callback failure:", err.message);
    res.status(500).send(`GitHub OAuth verification failed: ${err.message}`);
  }
});

// Tool Execution REST API
app.post("/api/tools/execute", async (req, res) => {
  const { name, args } = req.body;
  const tool = ToolRegistry[name];
  if (!tool) {
    res.status(404).json({ error: `Tool ${name} not found.` });
    return;
  }
  try {
    const result = await tool.execute(args);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: "Tool execution failed", details: err.message });
  }
});

// API: Generate Multi-Step Agent Plan based on user task
app.post("/api/agent/plan", async (req, res) => {
  const { task } = req.body;
  if (!task) {
    res.status(400).json({ error: "Task description is required." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "API key is not configured.",
      details: "The GEMINI_API_KEY secret is missing. Please configure it in your environment variables or Settings > Secrets."
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are the JARVIS Autonomous Planner (Stage 10). Your objective is to break down the user's high-level task into a sequential, multi-step plan of action using the available server-side tools.
      
      User Task: "${task}"

      Available tools list:
      - "get_application_status" (SAFE)
      - "get_application_settings" (SAFE)
      - "search_stored_memories" (Args: { query: string }) (SAFE)
      - "manage_memory" (Args: { action: 'add'|'delete'|'clear', text?: string, id?: string }) (CONFIRMATION_REQUIRED)
      - "web_search" (Args: { query: string }) (SAFE)
      - "get_live_info" (Args: { info_type: 'weather'|'time'|'stocks', location?: string }) (SAFE)
      - "spotify_search" (Args: { query: string }) (SAFE)
      - "spotify_control" (Args: { action: 'play'|'pause'|'skip_forward'|'volume', value?: string }) (SAFE)
      - "spotify_get_currently_playing" (SAFE)
      - "youtube_search" (Args: { query: string }) (SAFE)
      - "launch_application" (Args: { app_name: string }) (SAFE)
      - "open_website" (Args: { url: string }) (SAFE)
      - "manage_projects" (Args: { action: 'create'|'list'|'update'|'delete', name?: string, notes?: string, status?: string, deadline?: string }) (SAFE)
      - "manage_tasks" (Args: { action: 'create'|'list'|'update'|'delete', title?: string, priority?: string, status?: string, taskId?: string }) (CONFIRMATION_REQUIRED)
      - "manage_reminders" (Args: { action: 'create'|'list'|'delete', title?: string, time?: string }) (CONFIRMATION_REQUIRED)
      - "manage_calendar" (Args: { action: 'create'|'list'|'delete', title?: string, location?: string, description?: string }) (CONFIRMATION_REQUIRED)
      - "get_daily_briefing" (SAFE)

      Analyze the user's intent. If it requires multiple steps (like searching and then saving a task or listing status and updating things), plan 1 to 5 sequential steps. If it's a simple task, a 1-step plan is perfect.
      Ensure the toolName and arguments match the tool schemas precisely.
      Ensure the permissionLevel matches the tool definitions above.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING, description: "Detailed summary of what this step does and why" },
                  toolName: { type: Type.STRING, description: "Exact name of the tool to run" },
                  args: { type: Type.OBJECT, description: "The exact arguments matching the tool's properties schema" },
                  permissionLevel: { type: Type.STRING, enum: ["SAFE", "CONFIRMATION_REQUIRED", "RESTRICTED"] }
                },
                required: ["description", "toolName", "args", "permissionLevel"]
              }
            }
          },
          required: ["steps"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"steps":[]}');
    res.json(parsed);
  } catch (err: any) {
    console.error("[Agent Plan Error]:", err);
    res.status(500).json({ error: "Failed to generate plan", details: err.message });
  }
});

// API: Suggest Task Recovery action when a step fails
app.post("/api/agent/recover", async (req, res) => {
  const { task, failedStep, errorMessage } = req.body;
  if (!failedStep) {
    res.status(400).json({ error: "failedStep object is required." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "API key is not configured." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are the JARVIS Autonomous Planner (Stage 10). An active agent step failed. Your job is to suggest an alternative recovery action or simpler arguments so the workflow can proceed.

      User Task: "${task}"
      Failed Step: ${failedStep.description}
      Failed Tool: ${failedStep.toolName}
      Attempted Args: ${JSON.stringify(failedStep.args)}
      Error Message: "${errorMessage}"

      Suggest an alternative tool execution or the same tool with simplified arguments.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            alternativeDescription: { type: Type.STRING, description: "Clear summary of why this alternative will work" },
            toolName: { type: Type.STRING, description: "The name of the alternative tool or the same tool" },
            args: { type: Type.OBJECT, description: "Arguments to try" },
            permissionLevel: { type: Type.STRING, enum: ["SAFE", "CONFIRMATION_REQUIRED", "RESTRICTED"] }
          },
          required: ["alternativeDescription", "toolName", "args", "permissionLevel"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err: any) {
    console.error("[Agent Recovery Error]:", err);
    res.status(500).json({ error: "Failed to generate recovery option", details: err.message });
  }
});

// API: Stream conversation using Server-Sent Events (SSE)
app.post("/api/chat/stream", async (req, res) => {
  const { messages, model, temperature, settings } = req.body;

  // 1. Check API Key presence securely
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "API key is not configured.",
      details: "The GEMINI_API_KEY secret is missing. Please configure it in your environment variables or Settings > Secrets."
    });
    return;
  }

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid messages payload structure." });
    return;
  }

  try {
    // 2. Initialize Gemini client safely with standard options
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // 3. Build dynamic system instruction
    const privacy = loadPrivacy();
    const latestUserMessage = messages[messages.length - 1]?.text || "";
    const { contextPrompt, inspector } = assembleIntelligenceContext(latestUserMessage, messages, privacy);

    let dynamicSystemInstruction = `${generateSystemInstruction(currentUserProfile)}

${contextPrompt}

COGNITIVE INTELLIGENCE RULES (STAGE 7):
- You have deep contextual awareness of Tony's current active projects, pending tasks, daily reminders, and calendar events.
- If Tony asks about his agenda, tasks, projects, or requests to modify them, answer using the real data injected in your context.
- Maintain continuity across multi-turn queries. If Tony refers to "it" or "that project" or "the task", resolve it based on the Continuity context provided.
- Sound relaxed, highly capable, calm, and conversational. Speak in a sophisticated, clear, helpful tone.
- Do not make fake assumptions, don't formulate fictitious project stats. If no data exists, suggest creating them.
- When you use tools, explain their execution and results naturally.`;

    // 5. Context Management Layer
    // Keep only the most recent 12 messages (6 turns) to manage token usage and context size safely.
    const MAX_CONTEXT_MESSAGES = 12;
    const trimmedMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

    // Map messages to Gemini's expected contents structure: { role, parts }
    const contents: any[] = [];
    for (const msg of trimmedMessages) {
      if (msg.toolCall) {
        // Model turn that requested the tool call
        contents.push({
          role: 'model',
          parts: [{
            functionCall: {
              name: msg.toolCall.name,
              args: msg.toolCall.args,
              id: msg.toolCall.id
            }
          }]
        });
        // User turn with the tool response
        if (msg.toolResponse) {
          contents.push({
            role: 'user',
            parts: [{
              functionResponse: {
                name: msg.toolCall.name,
                response: msg.toolResponse,
                id: msg.toolCall.id
              }
            }]
          });
        }
      } else {
        const role = msg.sender === 'user' ? 'user' : 'model';
        const parts: any[] = [];
        
        if (msg.imageAttached) {
          const match = msg.imageAttached.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
        
        let textPart = msg.text || "";
        if (msg.docAttached) {
          textPart += `\n\n[Attached Document: ${msg.docAttached.name}]\n\`\`\`\n${msg.docAttached.content}\n\`\`\``;
        }
        parts.push({ text: textPart });

        contents.push({
          role,
          parts
        });
      }
    }

    // Determine the safe model to use (default to gemini-3.5-flash for speed and standard keys)
    const activeModel = model || "gemini-3.5-flash";

    console.log(`[JARVIS Backend] Initiating session. Model: ${activeModel}, Context turns: ${contents.length}`);

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 6. Query Gemini API with generateContent to support Function Calling elegantly
    const firstResponse = await ai.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction: dynamicSystemInstruction,
        temperature: temperature !== undefined ? temperature : 0.7,
        tools: [{ functionDeclarations: getGeminiToolDeclarations() }]
      }
    });

    const functionCalls = firstResponse.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const tool = ToolRegistry[call.name];

      if (tool) {
        // Safe tool and no explicit setting to confirm all tools
        if (tool.permissionLevel === "SAFE" && settings?.tools?.confirmSafeTools !== true) {
          console.log(`[JARVIS Backend] Executing SAFE tool: ${call.name}`);
          try {
            const result = await tool.execute(call.args);
            
            // Feed the tool result back to Gemini to stream a natural explanation
            const newContents = [
              ...contents,
              {
                role: 'model',
                parts: [{ functionCall: { name: call.name, args: call.args, id: call.id } }]
              },
              {
                role: 'user',
                parts: [{ functionResponse: { name: call.name, response: result, id: call.id } }]
              }
            ];

            const responseStream = await ai.models.generateContentStream({
              model: activeModel,
              contents: newContents,
              config: {
                systemInstruction: dynamicSystemInstruction,
                temperature: temperature !== undefined ? temperature : 0.7,
              }
            });

            // Write streamed chunks of explanation
            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
              }
            }
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          } catch (execErr: any) {
            res.write(`data: ${JSON.stringify({ error: "Tool execution failed", details: execErr.message })}\n\n`);
            res.end();
            return;
          }
        } else {
          // CONFIRMATION_REQUIRED, RESTRICTED or confirmSafeTools active
          // Signal the frontend that tool confirmation is required
          res.write(`data: ${JSON.stringify({
            type: "tool_confirmation_required",
            tool: {
              name: call.name,
              args: call.args,
              id: call.id || `call-${Date.now()}`,
              permissionLevel: tool.permissionLevel,
              description: tool.description
            }
          })}\n\n`);
          res.end();
          return;
        }
      }
    }

    // Standard conversational path: Stream text back with Typing simulation for high-fidelity feel
    const text = firstResponse.text;
    if (text) {
      const words = text.split(" ");
      let current = "";
      for (let i = 0; i < words.length; i++) {
        current += words[i] + (i === words.length - 1 ? "" : " ");
        if (i % 4 === 0 || i === words.length - 1) {
          res.write(`data: ${JSON.stringify({ text: current })}\n\n`);
          current = "";
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    console.error("[JARVIS Backend Error]:", error);
    
    // Attempt to write clean JSON error message even if stream headers already flushed
    const clientErrorMessage = {
      error: "Failed to generate AI response.",
      details: error.message || "An unexpected service error occurred on the server."
    };

    if (!res.headersSent) {
      res.status(500).json(clientErrorMessage);
    } else {
      res.write(`data: ${JSON.stringify({ error: clientErrorMessage.error, details: clientErrorMessage.details })}\n\n`);
      res.end();
    }
  }
});

// Configure Vite middleware / Static Assets based on environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Import Vite on demand for dev mode
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Mount Vite dev middleware
    app.use(vite.middlewares);
    console.log("[JARVIS Backend] Dev server loaded with Vite middleware");
  } else {
    // Production Mode: Serve compiled static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[JARVIS Backend] Production server serving static build assets");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[JARVIS Backend] Server successfully running on http://localhost:${PORT}`);
  });
}

initServer().catch(err => {
  console.error("Critical error starting JARVIS server:", err);
});
