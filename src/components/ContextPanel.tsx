/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shield, Eye, Calendar, Bell, Briefcase, ListTodo, 
  Plus, Check, Trash2, Clock, Volume2, RefreshCw, AlertTriangle, EyeOff, Lock
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  clientOrOrg: string;
  type: string;
  status: "active" | "completed" | "on_hold" | "overdue";
  deadline: string;
  tasksCount: number;
  notes: string;
  relatedFiles: string[];
}

interface TaskItem {
  id: string;
  projectId?: string;
  title: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "overdue";
  dueDate?: string;
}

interface ReminderItem {
  id: string;
  title: string;
  time: string;
  status: "active" | "dismissed";
}

interface CalendarEventItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
}

interface PrivacyConfig {
  projectAwareness: boolean;
  taskIndexing: boolean;
  calendarSync: boolean;
  reminderTriggers: boolean;
  longTermMemory: boolean;
}

interface ContextInspection {
  timestamp: string;
  categoriesUsed: string[];
  memoriesCount: number;
  toolsInvolved: string[];
  activeVariables?: {
    continuityProject?: string;
    continuityTask?: string;
    hasOverlappingMeetings?: boolean;
    weatherLocation?: string;
  };
}

export function ContextPanel() {
  // State variables
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyConfig>({
    projectAwareness: true,
    taskIndexing: true,
    calendarSync: true,
    reminderTriggers: true,
    longTermMemory: true
  });
  const [inspection, setInspection] = useState<ContextInspection>({
    timestamp: new Date().toISOString(),
    categoriesUsed: [],
    memoriesCount: 0,
    toolsInvolved: []
  });
  
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectNotes, setNewProjectNotes] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">('medium');
  const [newTaskProjId, setNewTaskProjId] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const [newRemTitle, setNewRemTitle] = useState('');
  const [newRemTime, setNewRemTime] = useState('');
  const [showAddRem, setShowAddRem] = useState(false);

  const [newCalTitle, setNewCalTitle] = useState('');
  const [newCalStart, setNewCalStart] = useState('');
  const [newCalEnd, setNewCalEnd] = useState('');
  const [newCalLoc, setNewCalLoc] = useState('');
  const [showAddCal, setShowAddCal] = useState(false);

  // Fetch all intelligence data
  const loadAllData = async () => {
    try {
      setLoadingData(true);
      const [resProj, resTasks, resRem, resCal, resPriv, resInspect] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/reminders').then(r => r.json()),
        fetch('/api/calendar').then(r => r.json()),
        fetch('/api/context/privacy').then(r => r.json()),
        fetch('/api/context/inspect').then(r => r.json())
      ]);

      setProjects(resProj);
      setTasks(resTasks);
      setReminders(resRem);
      setCalendarEvents(resCal);
      setPrivacy(resPriv);
      setInspection(resInspect);
    } catch (err) {
      console.error("Failed to load intelligence matrices:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Actions creators
  const handleTogglePrivacy = async (key: keyof PrivacyConfig) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    try {
      await fetch('/api/context/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      // Refresh inspection context
      const resInspect = await fetch('/api/context/inspect').then(r => r.json());
      setInspection(resInspect);
    } catch (err) {
      console.error("Failed to update privacy controls:", err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          clientOrOrg: newProjectClient,
          notes: newProjectNotes,
          deadline: newProjectDeadline || undefined
        })
      });
      const newProj = await res.json();
      setProjects(prev => [...prev, newProj]);
      setNewProjectName('');
      setNewProjectNotes('');
      setNewProjectClient('');
      setNewProjectDeadline('');
      setShowAddProject(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: newTaskPriority,
          projectId: newTaskProjId || undefined
        })
      });
      const newTask = await res.json();
      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle('');
      setNewTaskProjId('');
      setShowAddTask(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim()) return;
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRemTitle,
          time: newRemTime || undefined
        })
      });
      const newRem = await res.json();
      setReminders(prev => [...prev, newRem]);
      setNewRemTitle('');
      setNewRemTime('');
      setShowAddRem(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' })
      });
      const updated = await res.json();
      setReminders(prev => prev.map(r => r.id === id ? updated : r));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      setReminders(prev => prev.filter(r => r.id !== id));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalTitle.trim() || !newCalStart || !newCalEnd) return;
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCalTitle,
          startTime: new Date(newCalStart).toISOString(),
          endTime: new Date(newCalEnd).toISOString(),
          location: newCalLoc
        })
      });
      const newEvt = await res.json();
      setCalendarEvents(prev => [...prev, newEvt]);
      setNewCalTitle('');
      setNewCalStart('');
      setNewCalEnd('');
      setNewCalLoc('');
      setShowAddCal(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCalendar = async (id: string) => {
    try {
      await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchBriefing = async () => {
    try {
      setLoadingBriefing(true);
      const res = await fetch('/api/context/briefing');
      const data = await res.json();
      setBriefing(data.briefingText || data);
    } catch (err) {
      console.error("Failed to generate Live Briefing:", err);
      setBriefing("Error establishing link to weather API wttr.in or calendar databases.");
    } finally {
      setLoadingBriefing(false);
    }
  };

  const activeReminders = reminders.filter(r => r.status === 'active');
  const finishedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="space-y-6 w-full text-white pb-10" id="context-matrix-board">
      
      {/* Top Banner Control & Daily Briefing Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dynamic Daily Briefing Generator */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-jarvis-cyan/10 border border-jarvis-cyan/20 flex items-center justify-center text-jarvis-cyan">
                <Sparkles className="w-5 h-5 animate-pulse-subtle" />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold tracking-wider uppercase">Tony's Daily Intelligence Briefing</h2>
                <p className="text-[10px] font-mono text-gray-500">REAL-TIME WEATHER & SCHEDULE CORRELATOR</p>
              </div>
            </div>
            <button
              onClick={handleFetchBriefing}
              disabled={loadingBriefing}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono tracking-wider transition-all flex items-center gap-2 text-jarvis-cyan cursor-pointer disabled:opacity-50"
            >
              {loadingBriefing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
              {loadingBriefing ? "CORRELATING..." : "GENERATE BRIEFING"}
            </button>
          </div>

          <div className="bg-black/30 border border-white/5 rounded-xl p-4 min-h-[140px] flex flex-col justify-center text-sm font-sans text-gray-300 leading-relaxed relative overflow-hidden">
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-20 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan animate-ping" />
              <span className="text-[8px] font-mono">SECURE MATRIX</span>
            </div>
            
            {briefing ? (
              <div className="whitespace-pre-line text-xs font-sans text-gray-300" id="briefing-terminal-out">
                {briefing}
              </div>
            ) : (
              <div className="text-center space-y-2 py-4">
                <p className="text-xs font-mono text-gray-500 uppercase">Awaiting instruction to assemble briefing matrix...</p>
                <p className="text-[10px] text-gray-600">JARVIS will fetch live weather coordinates for Malibu and aggregate today's overlapping agenda items.</p>
              </div>
            )}
          </div>
        </div>

        {/* Global Privacy & Context Injection Toggles */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-jarvis-purple/10 border border-jarvis-purple/20 flex items-center justify-center text-jarvis-purple">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-wider uppercase">Privacy & Controls</h2>
              <p className="text-[10px] font-mono text-gray-500">CONTEXT ACCESS PROTOCOLS</p>
            </div>
          </div>

          <div className="space-y-2 font-mono text-[11px]" id="privacy-switches-group">
            {[
              { key: 'projectAwareness', label: 'Project Awareness', desc: 'Allows tracing current files and milestones' },
              { key: 'taskIndexing', label: 'Task Indexing', desc: 'Injects pending todo items in prompt' },
              { key: 'calendarSync', label: 'Calendar Sync', desc: 'Allows matching agenda overlapping conflicts' },
              { key: 'reminderTriggers', label: 'Alarms & Reminders', desc: 'Aggregates notification alarms on startup' },
              { key: 'longTermMemory', label: 'Memory Bank Sync', desc: 'Permits retrieving semantically relevant logs' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                <div className="flex flex-col">
                  <span className="text-gray-300 font-bold">{item.label}</span>
                  <span className="text-[8px] text-gray-500 mt-0.5">{item.desc}</span>
                </div>
                <button
                  onClick={() => handleTogglePrivacy(item.key as keyof PrivacyConfig)}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                    privacy[item.key as keyof PrivacyConfig] ? 'bg-jarvis-cyan' : 'bg-gray-800'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full bg-black transition-transform ${
                    privacy[item.key as keyof PrivacyConfig] ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Left Column (Projects & Tasks), Right Column (Calendar & Reminders) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Projects & Tasks Section */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Active Projects Bento */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-jarvis-cyan" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider">Active Strategic Projects</h3>
              </div>
              <button
                onClick={() => setShowAddProject(!showAddProject)}
                className="p-1 rounded bg-white/5 border border-white/10 text-jarvis-cyan hover:bg-white/10 text-[10px] font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {showAddProject ? "Cancel" : "Add Project"}
              </button>
            </div>

            {/* Add Project Form Drawer */}
            <AnimatePresence>
              {showAddProject && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateProject}
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Organization (e.g., Stark)"
                      value={newProjectClient}
                      onChange={e => setNewProjectClient(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Short summary/notes"
                    value={newProjectNotes}
                    onChange={e => setNewProjectNotes(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <span>Deadline:</span>
                      <input
                        type="date"
                        value={newProjectDeadline}
                        onChange={e => setNewProjectDeadline(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:border-jarvis-cyan outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-jarvis-cyan text-black font-mono text-[10px] font-bold hover:bg-jarvis-cyan/80 transition-all cursor-pointer"
                    >
                      COMMIT PROJECT
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {projects.length === 0 ? (
                <p className="text-center text-xs font-mono text-gray-600 py-6">NO ACTIVE INITIATIVES CURRENTLY REGISTERED</p>
              ) : (
                projects.map((proj) => (
                  <div key={proj.id} className="p-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl flex items-center justify-between group transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-xs font-bold text-white group-hover:text-jarvis-cyan transition-colors">{proj.name}</span>
                        <span className="text-[8px] font-mono px-1.5 py-0.2 bg-white/5 text-gray-400 rounded uppercase tracking-wider">{proj.clientOrOrg}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-sans line-clamp-1">{proj.notes || "No milestones specified."}</p>
                      <div className="flex items-center gap-3 text-[8px] font-mono text-gray-600">
                        <span>TASKS: {proj.tasksCount || 0}</span>
                        <span>DEADLINE: {new Date(proj.deadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase text-jarvis-cyan bg-jarvis-cyan/10 px-2 py-0.5 rounded border border-jarvis-cyan/20">
                      {proj.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Tasks Bento */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-jarvis-cyan" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider">Dynamic Tasks Grid</h3>
              </div>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                className="p-1 rounded bg-white/5 border border-white/10 text-jarvis-cyan hover:bg-white/10 text-[10px] font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {showAddTask ? "Cancel" : "Add Task"}
              </button>
            </div>

            {/* Add Task Form Drawer */}
            <AnimatePresence>
              {showAddTask && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateTask}
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Task Title (e.g. Charge Mark 85 capacitor)"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Priority</label>
                      <select
                        value={newTaskPriority}
                        onChange={e => setNewTaskPriority(e.target.value as any)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-[10px] font-mono text-white outline-none focus:border-jarvis-cyan"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Project Link</label>
                      <select
                        value={newTaskProjId}
                        onChange={e => setNewTaskProjId(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-[10px] font-mono text-white outline-none focus:border-jarvis-cyan"
                      >
                        <option value="">(None)</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-jarvis-cyan text-black font-mono text-[10px] font-bold hover:bg-jarvis-cyan/80 transition-all cursor-pointer"
                    >
                      COMMIT TASK
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-center text-xs font-mono text-gray-600 py-6">NO MILESTONES OR PENDING TASKS CURRENTLY</p>
              ) : (
                tasks.map((task) => {
                  const proj = projects.find(p => p.id === task.projectId);
                  return (
                    <div
                      key={task.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                        task.status === 'completed'
                          ? 'bg-black/20 border-white/5 opacity-55'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${
                            task.status === 'completed'
                              ? 'bg-jarvis-cyan/20 border-jarvis-cyan text-jarvis-cyan'
                              : 'border-white/20 hover:border-jarvis-cyan bg-transparent'
                          }`}
                        >
                          {task.status === 'completed' && <Check className="w-3 h-3" />}
                        </button>
                        <div>
                          <p className={`text-xs font-mono ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[7px] font-mono px-1 py-0.1 rounded font-bold uppercase ${
                              task.priority === 'high' ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
                              task.priority === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20' :
                              'text-blue-400 bg-blue-400/10 border border-blue-400/20'
                            }`}>
                              {task.priority}
                            </span>
                            {proj && (
                              <span className="text-[7px] font-mono text-gray-500 uppercase">
                                PROJ: {proj.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-gray-600 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Calendar Events & Reminders */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Calendar & Overlapping Conflicts Panel */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-jarvis-cyan" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider">Secure Calendar Feed</h3>
              </div>
              <button
                onClick={() => setShowAddCal(!showAddCal)}
                className="p-1 rounded bg-white/5 border border-white/10 text-jarvis-cyan hover:bg-white/10 text-[10px] font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {showAddCal ? "Cancel" : "Add Meeting"}
              </button>
            </div>

            {/* Overlap Warning Indicator */}
            {calendarEvents.length >= 2 && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2.5 text-xs text-yellow-400 font-sans leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-[9px] font-mono mb-0.5">Overlap conflict alert</span>
                  Conflict analyzer found 2 or more meetings scheduled with overlapping hours. JARVIS system prompt has registered these conflicts.
                </div>
              </div>
            )}

            {/* Add Calendar Meeting Drawer */}
            <AnimatePresence>
              {showAddCal && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateCalendar}
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Meeting Title (e.g. Board review)"
                    value={newCalTitle}
                    onChange={e => setNewCalTitle(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">Start Date/Time</label>
                      <input
                        type="datetime-local"
                        value={newCalStart}
                        onChange={e => setNewCalStart(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-[10px] font-mono text-white outline-none focus:border-jarvis-cyan"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono text-gray-500 uppercase mb-1">End Date/Time</label>
                      <input
                        type="datetime-local"
                        value={newCalEnd}
                        onChange={e => setNewCalEnd(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-1.5 text-[10px] font-mono text-white outline-none focus:border-jarvis-cyan"
                        required
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Location (e.g. Malibu Laboratory / Zoom)"
                    value={newCalLoc}
                    onChange={e => setNewCalLoc(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-jarvis-cyan text-black font-mono text-[10px] font-bold hover:bg-jarvis-cyan/80 transition-all cursor-pointer"
                    >
                      COMMIT SCHEDULE
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {calendarEvents.length === 0 ? (
                <p className="text-center text-xs font-mono text-gray-600 py-6">NO SCHEDULED EVENTS RECORDED</p>
              ) : (
                calendarEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] flex items-center justify-between group transition-all">
                    <div className="space-y-1">
                      <p className="text-xs font-display font-bold text-white group-hover:text-jarvis-cyan transition-colors">{evt.title}</p>
                      <div className="flex items-center gap-2 text-[8px] font-mono text-gray-500 uppercase">
                        <Clock className="w-3 h-3 text-gray-600" />
                        <span>{new Date(evt.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(evt.endTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                        {evt.location && <span className="border-l border-white/10 pl-2 text-gray-400">LOC: {evt.location}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCalendar(evt.id)}
                      className="text-gray-600 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reminders / Alarms Bento */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-jarvis-cyan" />
                <h3 className="font-display text-xs font-bold uppercase tracking-wider">Reminders & Alarms</h3>
              </div>
              <button
                onClick={() => setShowAddRem(!showAddRem)}
                className="p-1 rounded bg-white/5 border border-white/10 text-jarvis-cyan hover:bg-white/10 text-[10px] font-mono uppercase transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> {showAddRem ? "Cancel" : "Add Alarm"}
              </button>
            </div>

            {/* Add Reminder Form Drawer */}
            <AnimatePresence>
              {showAddRem && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleCreateReminder}
                  className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 overflow-hidden"
                >
                  <input
                    type="text"
                    placeholder="Reminder title (e.g. Call Pepper)"
                    value={newRemTitle}
                    onChange={e => setNewRemTitle(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs font-mono text-white placeholder-gray-600 focus:border-jarvis-cyan outline-none"
                    required
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <span>Notify at:</span>
                      <input
                        type="time"
                        value={newRemTime}
                        onChange={e => setNewRemTime(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:border-jarvis-cyan outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-jarvis-cyan text-black font-mono text-[10px] font-bold hover:bg-jarvis-cyan/80 transition-all cursor-pointer"
                    >
                      COMMIT REMINDER
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {reminders.length === 0 ? (
                <p className="text-center text-xs font-mono text-gray-600 py-6">NO SYSTEM REMINDERS SCHEDULED TODAY</p>
              ) : (
                reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      rem.status === 'dismissed'
                        ? 'bg-black/20 border-white/5 opacity-55'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-jarvis-cyan shrink-0 animate-pulse" />
                      <div>
                        <p className={`text-xs font-mono ${rem.status === 'dismissed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                          {rem.title}
                        </p>
                        <p className="text-[8px] font-mono text-gray-500 uppercase mt-0.5">
                          ALARM: {new Date(rem.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rem.status === 'active' && (
                        <button
                          onClick={() => handleDismissReminder(rem.id)}
                          className="px-2 py-0.5 text-[8px] bg-jarvis-cyan/15 text-jarvis-cyan hover:bg-jarvis-cyan/35 rounded border border-jarvis-cyan/20 transition-all cursor-pointer"
                        >
                          DISMISS
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-gray-600 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Dynamic Context Inspector Telemetry Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-jarvis-cyan/10 border border-jarvis-cyan/20 flex items-center justify-center text-jarvis-cyan">
            <Eye className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold tracking-wider uppercase">Unified Cognitive Context Inspector</h3>
            <p className="text-[10px] font-mono text-gray-500">LIVE SYSTEM-INSTRUCTION INJECTION METRICS</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-[10px] text-gray-400">
          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
            <span className="text-gray-500 block uppercase">LAST CORRELATION</span>
            <span className="text-white text-xs">{new Date(inspection.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
            <span className="text-gray-500 block uppercase">CATEGORIES RETRIEVED</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {inspection.categoriesUsed.length === 0 ? (
                <span className="text-gray-600">NONE</span>
              ) : (
                inspection.categoriesUsed.map(c => (
                  <span key={c} className="bg-white/5 text-gray-300 px-1.5 py-0.2 rounded text-[8px] uppercase">{c}</span>
                ))
              )}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
            <span className="text-gray-500 block uppercase">SEMANTIC MEMORIES LOADED</span>
            <span className="text-white text-xs">{inspection.memoriesCount} ITEMS</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
            <span className="text-gray-500 block uppercase">ACTIVE CONTINUITY TRACKER</span>
            <span className="text-white text-xs">
              {inspection.activeVariables?.continuityProject ? `it: "${inspection.activeVariables.continuityProject}"` : "IDLE"}
            </span>
          </div>
        </div>

        <div className="p-3 bg-black/60 rounded-xl border border-white/5 text-[9px] font-mono text-gray-500 leading-normal max-h-[150px] overflow-y-auto">
          <p className="text-gray-400 font-bold uppercase mb-1">Raw Context Assembly Log Payload:</p>
          <pre className="text-jarvis-cyan whitespace-pre-wrap">{JSON.stringify(inspection, null, 2)}</pre>
        </div>
      </div>

    </div>
  );
}
