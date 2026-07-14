/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionDeclaration, Type } from "@google/genai";
import { loadMemories, saveMemories, containsSensitiveSecrets, MemoryItem } from "./memory";
import { 
  performWebSearch, 
  performWeatherSearch, 
  getSpotifyPlayback, 
  executeSpotifySearch, 
  executeSpotifyControl, 
  logActivity,
  getGithubProfile,
  getGithubRepositories,
  getGithubActivity
} from "./integrations";
import {
  loadProjects,
  saveProjects,
  loadTasks,
  saveTasks,
  loadReminders,
  saveReminders,
  loadCalendar,
  saveCalendar,
  generateDailyBriefing,
  ProjectItem,
  TaskItem,
  ReminderItem,
  CalendarEventItem
} from "./context";

export type PermissionLevel = 'SAFE' | 'CONFIRMATION_REQUIRED' | 'RESTRICTED';

export interface ToolDefinition {
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  declaration: FunctionDeclaration;
  execute: (args: any) => Promise<any>;
}

export const ToolRegistry: Record<string, ToolDefinition> = {
  // -------------------------------------------------------------
  // Stage 4 Original Core Tools
  // -------------------------------------------------------------
  get_application_status: {
    name: "get_application_status",
    description: "Retrieve real-time operational diagnostics and subsystem statuses for JARVIS.",
    permissionLevel: "SAFE",
    declaration: {
      name: "get_application_status",
      description: "Get current system status, memory statistics, and uptime metrics.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    execute: async () => {
      const memories = loadMemories();
      const result = {
        status: "nominal",
        uptime: `${Math.round(process.uptime())}s`,
        subsystems: {
          vocal_synthesis: "online",
          wake_activation: "listening",
          cognitive_memory: {
            status: "synchronized",
            recordCount: memories.length,
          },
          tool_registry: "active",
        },
        hostEnvironment: "Cloud Container Instance",
        platformPort: 3000,
      };
      logActivity("get_application_status", "Execute", {}, "SAFE", result);
      return result;
    },
  },

  get_application_settings: {
    name: "get_application_settings",
    description: "Fetch current settings, including active AI model, voice pitch/rate, and memory parameters.",
    permissionLevel: "SAFE",
    declaration: {
      name: "get_application_settings",
      description: "Get the application settings configuration matrix.",
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    execute: async () => {
      const result = {
        ai: {
          model: "gemini-3.5-flash",
          temperature: 0.7,
        },
        voice: {
          rate: 1.1,
          pitch: 1.0,
          wakeWordEnabled: true,
          followUpEnabled: true,
        },
        memory: {
          longTermEnabled: true,
          shortTermLimit: 12,
        },
      };
      logActivity("get_application_settings", "Execute", {}, "SAFE", result);
      return result;
    },
  },

  search_stored_memories: {
    name: "search_stored_memories",
    description: "Search long-term persistent memories by query string.",
    permissionLevel: "SAFE",
    declaration: {
      name: "search_stored_memories",
      description: "Search user's saved facts, preferences, and personal profile memories.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The term or phrase to search within memories.",
          },
        },
        required: ["query"],
      },
    },
    execute: async ({ query }) => {
      const memories = loadMemories();
      const lowerQuery = query.toLowerCase();
      const results = memories.filter(mem => 
        mem.content.toLowerCase().includes(lowerQuery) || 
        mem.category.toLowerCase().includes(lowerQuery)
      );
      const result = {
        query,
        matchCount: results.length,
        memories: results,
      };
      logActivity("search_stored_memories", "Execute", { query }, "SAFE", result);
      return result;
    },
  },

  manage_memory: {
    name: "manage_memory",
    description: "Add, update, or remove facts in long-term persistent memory.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "manage_memory",
      description: "Create, update, or delete memory records.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The memory action: 'create', 'update', or 'delete'.",
          },
          category: {
            type: Type.STRING,
            description: "Category of memory: 'user_preferences', 'personal_profile', 'projects', 'people_orgs', 'working_preferences', 'instructions', 'facts'.",
          },
          content: {
            type: Type.STRING,
            description: "The factual statement or context to store or update.",
          },
          memoryId: {
            type: Type.STRING,
            description: "The unique memory ID (required for update/delete actions).",
          },
        },
        required: ["action"],
      },
    },
    execute: async ({ action, category, content, memoryId }) => {
      let memories = loadMemories();

      if (action === "create") {
        if (!content) {
          throw new Error("Memory content is required for creation.");
        }
        if (containsSensitiveSecrets(content)) {
          const warnResult = {
            success: false,
            warning: "Refused storage of sensitive credentials (passwords, tokens, API keys). Please do not save secrets.",
          };
          logActivity("manage_memory", "Execute", { action, category, content }, "CONFIRMATION_REQUIRED", warnResult);
          return warnResult;
        }
        const newMemory: MemoryItem = {
          id: `mem-${Date.now()}`,
          category: category || "facts",
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "Dynamic AI creation",
        };
        memories.push(newMemory);
        saveMemories(memories);
        const successResult = { success: true, action, memory: newMemory };
        logActivity("manage_memory", "Execute", { action, category, content }, "CONFIRMATION_REQUIRED", successResult);
        return successResult;
      }

      if (action === "update") {
        if (!memoryId) throw new Error("memoryId is required for update.");
        if (content && containsSensitiveSecrets(content)) {
          const warnResult = {
            success: false,
            warning: "Refused storage of sensitive credentials (passwords, tokens, API keys) in memory update.",
          };
          logActivity("manage_memory", "Execute", { action, category, content, memoryId }, "CONFIRMATION_REQUIRED", warnResult);
          return warnResult;
        }
        const idx = memories.findIndex(m => m.id === memoryId);
        if (idx === -1) throw new Error(`Memory with ID ${memoryId} not found.`);
        
        memories[idx] = {
          ...memories[idx],
          category: category || memories[idx].category,
          content: content || memories[idx].content,
          updatedAt: new Date().toISOString(),
        };
        saveMemories(memories);
        const successResult = { success: true, action, memory: memories[idx] };
        logActivity("manage_memory", "Execute", { action, category, content, memoryId }, "CONFIRMATION_REQUIRED", successResult);
        return successResult;
      }

      if (action === "delete") {
        if (!memoryId) throw new Error("memoryId is required for deletion.");
        const initialLength = memories.length;
        memories = memories.filter(m => m.id !== memoryId);
        if (memories.length === initialLength) {
          throw new Error(`Memory with ID ${memoryId} not found.`);
        }
        saveMemories(memories);
        const successResult = { success: true, action, memoryId };
        logActivity("manage_memory", "Execute", { action, memoryId }, "CONFIRMATION_REQUIRED", successResult);
        return successResult;
      }

      throw new Error(`Unknown memory action: ${action}`);
    },
  },

  execute_restricted_command: {
    name: "execute_restricted_command",
    description: "Perform dangerous terminal operations or direct shell scripting.",
    permissionLevel: "RESTRICTED",
    declaration: {
      name: "execute_restricted_command",
      description: "Runs commands directly on the host operating system.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: {
            type: Type.STRING,
            description: "The shell command to execute.",
          },
        },
        required: ["command"],
      },
    },
    execute: async ({ command }) => {
      const result = {
        success: false,
        error: "Access Denied. Execute restricted command is on the RESTRICTED tier and cannot be authorized dynamically by the AI model.",
      };
      logActivity("execute_restricted_command", "Execute", { command }, "RESTRICTED", result);
      return result;
    },
  },

  // -------------------------------------------------------------
  // Stage 5 Real-World Integration Tools
  // -------------------------------------------------------------
  web_search: {
    name: "web_search",
    description: "Perform a web search for current events, news, and live information from legitimate online sources.",
    permissionLevel: "SAFE",
    declaration: {
      name: "web_search",
      description: "Query current search indices to fetch real-time webpages, news, and text articles.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The descriptive search query.",
          }
        },
        required: ["query"]
      }
    },
    execute: async ({ query }) => {
      console.log(`[JARVIS Backend] Executing web search for: ${query}`);
      const searchResults = await performWebSearch(query);
      const result = {
        query,
        count: searchResults.length,
        results: searchResults
      };
      logActivity("web_search", "Execute", { query }, "SAFE", result);
      return result;
    }
  },

  get_live_info: {
    name: "get_live_info",
    description: "Retrieve live environment information such as current weather, local time, date, or regional details.",
    permissionLevel: "SAFE",
    declaration: {
      name: "get_live_info",
      description: "Retrieve active weather metrics, sunrise, sunset, or regional calendar date/time parameters.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          info_type: {
            type: Type.STRING,
            description: "Type of data: 'weather' (for metrics), 'time_date' (current formatted time/date), 'location' (details).",
            enum: ["weather", "time_date", "location"]
          },
          location: {
            type: Type.STRING,
            description: "City or region name (required for weather and location)."
          }
        },
        required: ["info_type"]
      }
    },
    execute: async ({ info_type, location }) => {
      if (info_type === "time_date") {
        const timeResult = {
          info_type,
          currentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          currentDate: new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          utcString: new Date().toUTCString()
        };
        logActivity("get_live_info", "Execute", { info_type }, "SAFE", timeResult);
        return timeResult;
      }

      const loc = location || "New York";
      console.log(`[JARVIS Backend] Fetching weather info for: ${loc}`);
      const weatherData = await performWeatherSearch(loc);
      const result = {
        info_type,
        location: loc,
        weather: weatherData
      };
      logActivity("get_live_info", "Execute", { info_type, location: loc }, "SAFE", result);
      return result;
    }
  },

  spotify_search: {
    name: "spotify_search",
    description: "Search the Spotify library for songs, artists, albums, or playlists.",
    permissionLevel: "SAFE",
    declaration: {
      name: "spotify_search",
      description: "Search for music tracks, playlists, or albums matching a specific string.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The search query (e.g. track name or artist name)."
          },
          type: {
            type: Type.STRING,
            description: "Item category.",
            enum: ["track", "artist", "album", "playlist"]
          }
        },
        required: ["query", "type"]
      }
    },
    execute: async ({ query, type }) => {
      console.log(`[JARVIS Backend] Searching Spotify: ${query} (type: ${type})`);
      const searchResults = await executeSpotifySearch(query, type);
      const result = {
        query,
        type,
        count: searchResults.length,
        items: searchResults
      };
      logActivity("spotify_search", "Execute", { query, type }, "SAFE", result);
      return result;
    }
  },

  spotify_control: {
    name: "spotify_control",
    description: "Remote control active Spotify music player playback.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "spotify_control",
      description: "Play, pause, skip, go previous, or set volume percentages for Spotify.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "Media command to perform.",
            enum: ["play", "pause", "resume", "skip", "previous", "volume"]
          },
          value: {
            type: Type.STRING,
            description: "Volume percentage (0-100) or track/album Spotify URI link."
          }
        },
        required: ["action"]
      }
    },
    execute: async ({ action, value }) => {
      console.log(`[JARVIS Backend] Remote control Spotify: ${action} (value: ${value})`);
      const controlResult = await executeSpotifyControl(action, value);
      logActivity("spotify_control", "Execute", { action, value }, "CONFIRMATION_REQUIRED", controlResult);
      return controlResult;
    }
  },

  spotify_get_currently_playing: {
    name: "spotify_get_currently_playing",
    description: "Retrieve metadata for the track currently spinning on Spotify.",
    permissionLevel: "SAFE",
    declaration: {
      name: "spotify_get_currently_playing",
      description: "Fetch track name, artist, album art, duration and play status.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    execute: async () => {
      const state = getSpotifyPlayback();
      logActivity("spotify_get_currently_playing", "Execute", {}, "SAFE", state);
      return state;
    }
  },

  youtube_search: {
    name: "youtube_search",
    description: "Search YouTube for videos, playlists, or creator channels.",
    permissionLevel: "SAFE",
    declaration: {
      name: "youtube_search",
      description: "Fetch YouTube video entries matching a query query.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "The search query (e.g. topic name or song title)."
          }
        },
        required: ["query"]
      }
    },
    execute: async ({ query }) => {
      console.log(`[JARVIS Backend] Searching YouTube for: ${query}`);
      // Search with site:youtube.com to extract precise video URLs
      const searchResults = await performWebSearch(`site:youtube.com ${query}`);
      
      const mappedResults = searchResults.map(item => {
        let videoId = "";
        if (item.url.includes("v=")) {
          videoId = item.url.split("v=")[1]?.split("&")[0] || "";
        }
        return {
          title: item.title.replace(" - YouTube", ""),
          url: item.url,
          snippet: item.snippet,
          thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop",
          videoId
        };
      });

      const result = {
        query,
        count: mappedResults.length,
        items: mappedResults
      };
      logActivity("youtube_search", "Execute", { query }, "SAFE", result);
      return result;
    }
  },

  launch_application: {
    name: "launch_application",
    description: "Open an approved software application on Tony's workstation system.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "launch_application",
      description: "Launches an application by ID if pre-approved.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          applicationId: {
            type: Type.STRING,
            description: "ID of the approved software application to open.",
            enum: ["browser", "vscode", "spotify", "calculator", "explorer", "capcut"]
          }
        },
        required: ["applicationId"]
      }
    },
    execute: async ({ applicationId }) => {
      console.log(`[JARVIS Backend] Launching application request: ${applicationId}`);
      const appNames: Record<string, string> = {
        browser: "Google Chrome",
        vscode: "Visual Studio Code",
        spotify: "Spotify Client",
        calculator: "System Calculator",
        explorer: "File Explorer",
        capcut: "CapCut Editor"
      };
      const name = appNames[applicationId] || applicationId;
      const result = {
        success: true,
        applicationId,
        applicationName: name,
        environment: "simulated_workstation",
        launchedAt: new Date().toISOString(),
        message: `Command issued. Launched local application: **${name}** (Simulation Mode active in Cloud Container).`
      };
      logActivity("launch_application", "Execute", { applicationId }, "CONFIRMATION_REQUIRED", result);
      return result;
    }
  },

  open_website: {
    name: "open_website",
    description: "Launch a website or safe HTTPS link inside the system browser.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "open_website",
      description: "Opens a safe, validated URL link.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: {
            type: Type.STRING,
            description: "The complete HTTP/HTTPS URL path to launch."
          }
        },
        required: ["url"]
      }
    },
    execute: async ({ url }) => {
      console.log(`[JARVIS Backend] Launching website URL link: ${url}`);
      const isSafe = url.startsWith("https://") || url.startsWith("http://");
      if (!isSafe) {
        throw new Error("Rejected unsafe protocol. Only standard HTTP or HTTPS links can be opened.");
      }
      
      const result = {
        success: true,
        url,
        action: "BROWSER_REDIRECT_PREPARED",
        message: `URL verification passed. Command issued. Launching website: ${url}`
      };
      logActivity("open_website", "Execute", { url }, "CONFIRMATION_REQUIRED", result);
      return result;
    }
  },

  manage_projects: {
    name: "manage_projects",
    description: "Create, view, list, or update Tony's creative projects.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "manage_projects",
      description: "Manage projects in JARVIS's project database.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The action to take: 'create', 'list', 'update', or 'delete'.",
            enum: ["create", "list", "update", "delete"]
          },
          projectId: {
            type: Type.STRING,
            description: "The unique project ID (required for update/delete)."
          },
          name: {
            type: Type.STRING,
            description: "The name of the project (required for create)."
          },
          clientOrOrg: {
            type: Type.STRING,
            description: "Client or organization associated with the project."
          },
          notes: {
            type: Type.STRING,
            description: "Description or notes about the project."
          },
          status: {
            type: Type.STRING,
            description: "Project status: 'active', 'completed', 'on_hold', 'overdue'."
          },
          deadline: {
            type: Type.STRING,
            description: "ISO deadline timestamp (e.g. '2026-07-20T23:59:59.000Z')."
          }
        },
        required: ["action"]
      }
    },
    execute: async ({ action, projectId, name, clientOrOrg, notes, status, deadline }) => {
      let projects = loadProjects();
      if (action === "list") {
        return { success: true, count: projects.length, projects };
      }
      if (action === "create") {
        if (!name) throw new Error("Project name is required for creation.");
        const newProj: ProjectItem = {
          id: `proj-${Date.now()}`,
          name,
          clientOrOrg: clientOrOrg || "Internal",
          type: "Creative",
          status: "active",
          deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tasksCount: 0,
          notes: notes || "",
          relatedFiles: [],
          recentActivity: "Project initialized.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        projects.push(newProj);
        saveProjects(projects);
        return { success: true, message: `Project "${name}" created successfully.`, project: newProj };
      }
      if (action === "update") {
        if (!projectId) throw new Error("projectId is required for update.");
        const idx = projects.findIndex(p => p.id === projectId);
        if (idx === -1) throw new Error("Project not found.");
        projects[idx] = {
          ...projects[idx],
          name: name || projects[idx].name,
          clientOrOrg: clientOrOrg || projects[idx].clientOrOrg,
          notes: notes !== undefined ? notes : projects[idx].notes,
          status: (status as any) || projects[idx].status,
          deadline: deadline || projects[idx].deadline,
          updatedAt: new Date().toISOString()
        };
        saveProjects(projects);
        return { success: true, message: `Project "${projects[idx].name}" updated successfully.`, project: projects[idx] };
      }
      if (action === "delete") {
        if (!projectId) throw new Error("projectId is required for deletion.");
        projects = projects.filter(p => p.id !== projectId);
        saveProjects(projects);
        return { success: true, message: `Project ${projectId} deleted.` };
      }
      throw new Error(`Unknown project action: ${action}`);
    }
  },

  manage_tasks: {
    name: "manage_tasks",
    description: "Create, list, update, complete, or delete personal or project-linked tasks.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "manage_tasks",
      description: "Manage tasks inside JARVIS's database.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The task action: 'create', 'list', 'update', or 'delete'.",
            enum: ["create", "list", "update", "delete"]
          },
          taskId: {
            type: Type.STRING,
            description: "The unique task ID (required for update/delete)."
          },
          projectId: {
            type: Type.STRING,
            description: "Link this task to an existing project ID."
          },
          title: {
            type: Type.STRING,
            description: "The title of the task (required for create)."
          },
          priority: {
            type: Type.STRING,
            description: "Task urgency: 'low', 'medium', or 'high'."
          },
          status: {
            type: Type.STRING,
            description: "Task progress: 'pending', 'completed', 'overdue'."
          },
          dueDate: {
            type: Type.STRING,
            description: "ISO deadline timestamp."
          }
        },
        required: ["action"]
      }
    },
    execute: async ({ action, taskId, projectId, title, priority, status, dueDate }) => {
      let tasks = loadTasks();
      if (action === "list") {
        return { success: true, count: tasks.length, tasks };
      }
      if (action === "create") {
        if (!title) throw new Error("Task title is required.");
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
        return { success: true, message: `Task "${title}" created successfully.`, task: newTask };
      }
      if (action === "update") {
        if (!taskId) throw new Error("taskId is required for updates.");
        const idx = tasks.findIndex(t => t.id === taskId);
        if (idx === -1) throw new Error("Task not found.");
        tasks[idx] = {
          ...tasks[idx],
          title: title || tasks[idx].title,
          projectId: projectId !== undefined ? projectId : tasks[idx].projectId,
          priority: (priority as any) || tasks[idx].priority,
          status: (status as any) || tasks[idx].status,
          dueDate: dueDate || tasks[idx].dueDate,
          updatedAt: new Date().toISOString()
        };
        saveTasks(tasks);
        return { success: true, message: `Task "${tasks[idx].title}" updated.`, task: tasks[idx] };
      }
      if (action === "delete") {
        if (!taskId) throw new Error("taskId is required for deletion.");
        const taskToDelete = tasks.find(t => t.id === taskId);
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks(tasks);

        if (taskToDelete && taskToDelete.projectId) {
          const projects = loadProjects();
          const pIdx = projects.findIndex(p => p.id === taskToDelete.projectId);
          if (pIdx !== -1) {
            projects[pIdx].tasksCount = Math.max(0, (projects[pIdx].tasksCount || 1) - 1);
            projects[pIdx].updatedAt = new Date().toISOString();
            saveProjects(projects);
          }
        }
        return { success: true, message: `Task ${taskId} removed.` };
      }
      throw new Error(`Unknown task action: ${action}`);
    }
  },

  manage_reminders: {
    name: "manage_reminders",
    description: "Create, view, dismiss, or list temporary alarms and notifications.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "manage_reminders",
      description: "Manage system notifications and reminders.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "The reminder action: 'create', 'list', 'dismiss', or 'delete'.",
            enum: ["create", "list", "dismiss", "delete"]
          },
          reminderId: {
            type: Type.STRING,
            description: "Unique reminder ID."
          },
          title: {
            type: Type.STRING,
            description: "Title or content of the reminder (required for create)."
          },
          time: {
            type: Type.STRING,
            description: "ISO date timestamp for when the alarm fires."
          }
        },
        required: ["action"]
      }
    },
    execute: async ({ action, reminderId, title, time }) => {
      let reminders = loadReminders();
      if (action === "list") {
        return { success: true, count: reminders.length, reminders };
      }
      if (action === "create") {
        if (!title) throw new Error("Reminder title is required.");
        const newRem: ReminderItem = {
          id: `rem-${Date.now()}`,
          title,
          time: time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          status: "active"
        };
        reminders.push(newRem);
        saveReminders(reminders);
        return { success: true, message: `Reminder created: "${title}".`, reminder: newRem };
      }
      if (action === "dismiss") {
        if (!reminderId) throw new Error("reminderId is required.");
        const idx = reminders.findIndex(r => r.id === reminderId);
        if (idx === -1) throw new Error("Reminder not found.");
        reminders[idx].status = "dismissed";
        saveReminders(reminders);
        return { success: true, message: `Reminder "${reminders[idx].title}" dismissed.`, reminder: reminders[idx] };
      }
      if (action === "delete") {
        if (!reminderId) throw new Error("reminderId is required.");
        reminders = reminders.filter(r => r.id !== reminderId);
        saveReminders(reminders);
        return { success: true, message: `Reminder ${reminderId} deleted.` };
      }
      throw new Error(`Unknown reminder action: ${action}`);
    }
  },

  manage_calendar: {
    name: "manage_calendar",
    description: "Manage scheduled calendar meetings and overlapping conflicts.",
    permissionLevel: "CONFIRMATION_REQUIRED",
    declaration: {
      name: "manage_calendar",
      description: "Read, view, create, or update agenda meetings.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "Calendar action: 'create', 'list', 'update', or 'delete'.",
            enum: ["create", "list", "update", "delete"]
          },
          eventId: {
            type: Type.STRING,
            description: "Unique event ID."
          },
          title: {
            type: Type.STRING,
            description: "Title of the calendar meeting (required for create)."
          },
          startTime: {
            type: Type.STRING,
            description: "ISO start timestamp (required for create)."
          },
          endTime: {
            type: Type.STRING,
            description: "ISO end timestamp (required for create)."
          },
          location: {
            type: Type.STRING,
            description: "Meeting location or coordinate."
          },
          description: {
            type: Type.STRING,
            description: "Detailed descriptions."
          }
        },
        required: ["action"]
      }
    },
    execute: async ({ action, eventId, title, startTime, endTime, location, description }) => {
      let events = loadCalendar();
      if (action === "list") {
        return { success: true, count: events.length, events };
      }
      if (action === "create") {
        if (!title || !startTime || !endTime) throw new Error("Title, startTime, and endTime are required.");
        const newEvt: CalendarEventItem = {
          id: `cal-${Date.now()}`,
          title,
          startTime,
          endTime,
          location: location || "",
          description: description || ""
        };
        events.push(newEvt);
        saveCalendar(events);
        return { success: true, message: `Calendar meeting "${title}" booked successfully.`, event: newEvt };
      }
      if (action === "update") {
        if (!eventId) throw new Error("eventId is required.");
        const idx = events.findIndex(e => e.id === eventId);
        if (idx === -1) throw new Error("Event not found.");
        events[idx] = {
          ...events[idx],
          title: title || events[idx].title,
          startTime: startTime || events[idx].startTime,
          endTime: endTime || events[idx].endTime,
          location: location !== undefined ? location : events[idx].location,
          description: description !== undefined ? description : events[idx].description
        };
        saveCalendar(events);
        return { success: true, message: `Meeting "${events[idx].title}" updated.`, event: events[idx] };
      }
      if (action === "delete") {
        if (!eventId) throw new Error("eventId is required.");
        events = events.filter(e => e.id !== eventId);
        saveCalendar(events);
        return { success: true, message: `Meeting ${eventId} removed.` };
      }
      throw new Error(`Unknown calendar action: ${action}`);
    }
  },

  get_daily_briefing: {
    name: "get_daily_briefing",
    description: "Produce a high-fidelity daily briefing containing weather, calendar conflicts, reminders, and tasks.",
    permissionLevel: "SAFE",
    declaration: {
      name: "get_daily_briefing",
      description: "Generates the comprehensive daily agenda overview.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    execute: async () => {
      let weatherData: any = null;
      try {
        weatherData = await performWeatherSearch("Malibu");
      } catch (err) {
        console.warn("Failed wttr.in query inside get_daily_briefing tool:", err);
      }
      const briefing = generateDailyBriefing(weatherData);
      logActivity("get_daily_briefing", "Execute", {}, "SAFE", briefing);
      return briefing;
    }
  },

  github_get_profile: {
    name: "github_get_profile",
    description: "Retrieve Tony Stark's or the authenticated user's GitHub developer profile details.",
    permissionLevel: "SAFE",
    declaration: {
      name: "github_get_profile",
      description: "Get GitHub profile information including username, avatar, biography, followers, and public repository counts.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    execute: async () => {
      const profile = await getGithubProfile();
      logActivity("github_get_profile", "Execute", {}, "SAFE", profile);
      return profile;
    }
  },

  github_list_repositories: {
    name: "github_list_repositories",
    description: "Fetch the active repositories associated with the connected developer account.",
    permissionLevel: "SAFE",
    declaration: {
      name: "github_list_repositories",
      description: "Get lists of repositories, stars, forks, languages, and direct URLs.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    execute: async () => {
      const repos = await getGithubRepositories();
      logActivity("github_list_repositories", "Execute", {}, "SAFE", { count: repos.length, items: repos });
      return repos;
    }
  },

  github_get_activity: {
    name: "github_get_activity",
    description: "Retrieve recent commit activity, star events, forks, and development logs from GitHub.",
    permissionLevel: "SAFE",
    declaration: {
      name: "github_get_activity",
      description: "Get a list of the latest events and pushes to connected code repositories.",
      parameters: {
        type: Type.OBJECT,
        properties: {}
      }
    },
    execute: async () => {
      const activity = await getGithubActivity();
      logActivity("github_get_activity", "Execute", {}, "SAFE", activity);
      return activity;
    }
  }
};

/**
 * Returns declarations of tools for Gemini client.
 */
export function getGeminiToolDeclarations() {
  return Object.values(ToolRegistry).map(t => t.declaration);
}
