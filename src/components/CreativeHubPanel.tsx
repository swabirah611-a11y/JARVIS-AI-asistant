import React, { useState, useEffect } from 'react';
import { 
  Film, Tv, Calendar, MapPin, Users, CheckSquare, Square, Plus, 
  Folder, FolderOpen, SlidersHorizontal, Sparkles, RefreshCw, 
  Check, Trash2, Camera, Compass, Play, Loader2
} from 'lucide-react';
import { CreativeProject, CreativeProjectStage, CreativeProjectType, MediaFile } from '../types';

export function CreativeHubPanel() {
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<CreativeProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [scanning, setScanning] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [organizeMessage, setOrganizeMessage] = useState('');
  
  // Filtering states for media files
  const [resFilter, setResFilter] = useState('all');
  const [aspectFilter, setAspectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Project creator states
  const [showCreator, setShowCreator] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjType, setNewProjType] = useState<CreativeProjectType>('General');
  const [newProjStage, setNewProjStage] = useState<CreativeProjectStage>('IDEA');
  const [newProjShootDate, setNewProjShootDate] = useState('');
  const [newProjDeadline, setNewProjDeadline] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjAspectRatios, setNewProjAspectRatios] = useState<string[]>(['16:9']);
  const [newProjPlatforms, setNewProjPlatforms] = useState<string[]>(['YouTube']);
  const [newProjNotes, setNewProjNotes] = useState('');
  const [newProjFolder, setNewProjFolder] = useState('');

  // New checklist item input
  const [newItemText, setNewItemText] = useState('');
  const [newChecklistCat, setNewChecklistCat] = useState<'Shot List' | 'Production' | 'Editing' | 'Delivery' | 'General'>('General');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
        scanMedia(data[0].approvedFolder || 'projects/aau_nightlife');
      } else if (selectedProject) {
        const updated = data.find((p: any) => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoading(false);
    }
  };

  const scanMedia = async (folderPath: string) => {
    setScanning(true);
    try {
      const res = await fetch(`/api/media/scan?folder=${encodeURIComponent(folderPath)}`);
      const data = await res.json();
      setMediaFiles(data.files || []);
    } catch (err) {
      console.error('Media scanning failed', err);
    } finally {
      setScanning(false);
    }
  };

  const handleOrganizeMedia = async () => {
    if (!selectedProject) return;
    setOrganizing(true);
    setOrganizeMessage('');
    try {
      const res = await fetch('/api/media/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: selectedProject.approvedFolder || 'projects/aau_nightlife',
          filesToOrganize: filteredMedia.map(f => f.filePath)
        })
      });
      const data = await res.json();
      if (data.success) {
        setOrganizeMessage(data.message);
        // Rescan to reflect status
        setTimeout(() => {
          scanMedia(selectedProject.approvedFolder || 'projects/aau_nightlife');
        }, 1500);
      }
    } catch (err) {
      console.error('Media organization failed', err);
    } finally {
      setOrganizing(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    try {
      const folderName = newProjFolder.trim() || `projects/${newProjName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const payload = {
        name: newProjName,
        clientOrOrg: newProjClient || 'Internal',
        type: newProjType,
        currentStage: newProjStage,
        status: newProjStage === 'DELIVERED' || newProjStage === 'ARCHIVED' ? 'completed' : 'active',
        shootDate: newProjShootDate,
        deadline: newProjDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: newProjLocation,
        aspectRatios: newProjAspectRatios,
        platforms: newProjPlatforms,
        notes: newProjNotes,
        approvedFolder: folderName,
        checklists: [
          {
            category: 'Shot List',
            items: [
              { id: `shot-${Date.now()}-1`, text: 'Establish wide shot (4K cinematic master)', done: false },
              { id: `shot-${Date.now()}-2`, text: 'Close up tracking shot', done: false }
            ]
          },
          {
            category: 'Production',
            items: [
              { id: `prod-${Date.now()}-1`, text: 'Organize equipment gear list', done: false },
              { id: `prod-${Date.now()}-2`, text: 'Verify site access coordinates', done: false }
            ]
          }
        ]
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newProj = await res.json();
      
      // Update UI
      fetchProjects();
      setSelectedProject(newProj);
      setShowCreator(false);
      resetCreatorForm();
    } catch (err) {
      console.error('Failed to create creative project', err);
    }
  };

  const resetCreatorForm = () => {
    setNewProjName('');
    setNewProjClient('');
    setNewProjType('General');
    setNewProjStage('IDEA');
    setNewProjShootDate('');
    setNewProjDeadline('');
    setNewProjLocation('');
    setNewProjAspectRatios(['16:9']);
    setNewProjPlatforms(['YouTube']);
    setNewProjNotes('');
    setNewProjFolder('');
  };

  const handleUpdateStage = async (stage: CreativeProjectStage) => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentStage: stage,
          recentActivity: `Project stage transitioned to ${stage}.`
        })
      });
      const updated = await res.json();
      setSelectedProject(updated);
      fetchProjects();
    } catch (err) {
      console.error('Failed to update project stage', err);
    }
  };

  const handleToggleChecklist = async (catIndex: number, itemIndex: number) => {
    if (!selectedProject || !selectedProject.checklists) return;
    
    const updatedChecklists = [...selectedProject.checklists];
    const item = updatedChecklists[catIndex].items[itemIndex];
    item.done = !item.done;

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklists: updatedChecklists })
      });
      const updated = await res.json();
      setSelectedProject(updated);
      fetchProjects();
    } catch (err) {
      console.error('Failed to save checklist state', err);
    }
  };

  const handleAddChecklistItem = async () => {
    if (!selectedProject || !newItemText.trim()) return;

    const checklists = selectedProject.checklists ? [...selectedProject.checklists] : [];
    let categoryBlock = checklists.find(c => c.category === newChecklistCat);
    
    if (!categoryBlock) {
      categoryBlock = { category: newChecklistCat, items: [] };
      checklists.push(categoryBlock);
    }

    categoryBlock.items.push({
      id: `item-${Date.now()}`,
      text: newItemText,
      done: false
    });

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklists })
      });
      const updated = await res.json();
      setSelectedProject(updated);
      setNewItemText('');
      fetchProjects();
    } catch (err) {
      console.error('Failed to add checklist item', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const filteredMedia = mediaFiles.filter(file => {
    if (resFilter !== 'all') {
      if (resFilter === '4k' && file.resolution !== '3840x2160') return false;
      if (resFilter === '1080p' && file.resolution !== '1920x1080' && file.resolution !== '1080x1920') return false;
    }
    if (aspectFilter !== 'all') {
      if (file.aspectRatio !== aspectFilter) return false;
    }
    if (typeFilter !== 'all') {
      if (file.fileType !== typeFilter) return false;
    }
    return true;
  });

  const STAGES: CreativeProjectStage[] = [
    'IDEA', 'PRE-PRODUCTION', 'PRODUCTION', 'POST-PRODUCTION', 'REVIEW', 'DELIVERED', 'ARCHIVED'
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-1 w-full" id="creative_hub_container">
      {/* LEFT: Project List Sidebar */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm text-white font-bold uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-jarvis-cyan animate-spin-slow" />
                Creative Projects
              </h3>
              <button
                type="button"
                onClick={() => setShowCreator(!showCreator)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-jarvis-cyan/15 text-jarvis-cyan hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 transition-all cursor-pointer"
              >
                + NEW PROJECT
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-gray-500 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-jarvis-cyan mr-2" />
                Retrieving active coordinates...
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {projects.map((proj) => {
                  const isSelected = selectedProject?.id === proj.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedProject(proj);
                        scanMedia(proj.approvedFolder || 'projects/aau_nightlife');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                        isSelected 
                          ? 'bg-white/[0.04] border-white/20 text-white' 
                          : 'border-transparent hover:bg-white/[0.02] hover:border-white/5 text-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-display font-bold text-xs group-hover:text-white transition-colors">
                            {proj.name}
                          </div>
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5">
                            {proj.clientOrOrg} • {proj.type}
                          </div>
                        </div>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          proj.currentStage === 'DELIVERED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          proj.currentStage === 'POST-PRODUCTION' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          proj.currentStage === 'PRODUCTION' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          'bg-white/5 text-gray-400 border border-white/10'
                        }`}>
                          {proj.currentStage}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-gray-500">
                        <span>Due: {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'None'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-jarvis-red hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[9px] font-mono text-gray-500 uppercase mt-4">
            <div>Engine Status: Ready</div>
            <div>Stage 9 Creative Workspace Active</div>
          </div>
        </div>
      </div>

      {/* RIGHT: Detailed Intelligence Workspace */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        {showCreator ? (
          /* PROJECT CREATOR SCREEN */
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 text-gray-300">
            <h3 className="font-display text-sm text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-jarvis-cyan" />
              Initialize Creative Campaign Matrix
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                    placeholder="e.g. AAU Nightlife Promotional Reel"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Client or Organization</label>
                  <input
                    type="text"
                    value={newProjClient}
                    onChange={(e) => setNewProjClient(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                    placeholder="e.g. AAU Club Group"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Project Type</label>
                  <select
                    value={newProjType}
                    onChange={(e) => setNewProjType(e.target.value as CreativeProjectType)}
                    className="w-full bg-black/90 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  >
                    <option value="Event coverage">Event coverage</option>
                    <option value="Music video">Music video</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Social media content">Social media content</option>
                    <option value="Promotional video">Promotional video</option>
                    <option value="Podcast">Podcast</option>
                    <option value="Graphic design">Graphic design</option>
                    <option value="Photography">Photography</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Current Phase</label>
                  <select
                    value={newProjStage}
                    onChange={(e) => setNewProjStage(e.target.value as CreativeProjectStage)}
                    className="w-full bg-black/90 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  >
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Location</label>
                  <input
                    type="text"
                    value={newProjLocation}
                    onChange={(e) => setNewProjLocation(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                    placeholder="e.g. Malibu Studio B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Shoot Date</label>
                  <input
                    type="date"
                    value={newProjShootDate}
                    onChange={(e) => setNewProjShootDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-gray-500 block">Final Delivery Deadline</label>
                  <input
                    type="date"
                    value={newProjDeadline}
                    onChange={(e) => setNewProjDeadline(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-gray-500 block">Approved Folder Path (Storage)</label>
                <input
                  type="text"
                  value={newProjFolder}
                  onChange={(e) => setNewProjFolder(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white font-mono focus:outline-none focus:border-jarvis-cyan transition-all"
                  placeholder="e.g. projects/aau_nightlife"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-gray-500 block">Strategic Project Notes</label>
                <textarea
                  value={newProjNotes}
                  onChange={(e) => setNewProjNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all resize-none"
                  placeholder="Specify shot parameters, soundtrack cues, visual tone, or color grading aesthetics..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreator(false);
                    resetCreatorForm();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-jarvis-cyan text-black font-display font-bold text-xs hover:bg-[#00d8e6] transition-all cursor-pointer"
                >
                  INITIALIZE CAMPAIGN
                </button>
              </div>
            </form>
          </div>
        ) : selectedProject ? (
          /* ACTIVE CAMPAIGN WORKSPACE */
          <div className="space-y-6">
            
            {/* Project Banner Info */}
            <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-jarvis-cyan/15 text-jarvis-cyan px-2 py-0.5 rounded border border-jarvis-cyan/25">
                      {selectedProject.type}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      ID: {selectedProject.id}
                    </span>
                  </div>
                  <h2 className="font-display text-lg text-white font-bold uppercase tracking-wide mt-1">
                    {selectedProject.name}
                  </h2>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    Client: <span className="text-white">{selectedProject.clientOrOrg}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProject.aspectRatios?.map(aspect => (
                    <span key={aspect} className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-gray-300">
                      Aspect: {aspect}
                    </span>
                  ))}
                  {selectedProject.platforms?.map(plat => (
                    <span key={plat} className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-gray-300">
                      Target: {plat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Progress Stage Tracker Slider */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-wider">
                  Project Phase Synchronization Indicator
                </span>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 w-full">
                    {STAGES.map((stg, index) => {
                      const isCurrent = selectedProject.currentStage === stg;
                      const isPassed = STAGES.indexOf(selectedProject.currentStage) >= index;
                      return (
                        <button
                          key={stg}
                          type="button"
                          onClick={() => handleUpdateStage(stg)}
                          className={`text-[9px] font-mono px-2 py-1.5 rounded transition-all flex items-center gap-1 border cursor-pointer ${
                            isCurrent ? 'bg-jarvis-cyan text-black font-bold border-jarvis-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]' :
                            isPassed ? 'bg-jarvis-cyan/10 border-jarvis-cyan/20 text-jarvis-cyan' :
                            'bg-white/5 border-white/5 text-gray-600 hover:text-gray-400'
                          }`}
                        >
                          {isPassed && !isCurrent && <Check className="w-2.5 h-2.5" />}
                          {stg}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Advanced Metadata Rows */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4 text-xs font-mono text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-jarvis-cyan shrink-0" />
                  <div>
                    <span className="text-[9px] text-gray-500 block">SHOOT DATE</span>
                    <span className="text-gray-200">{selectedProject.shootDate || 'Not Scheduled'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-jarvis-cyan shrink-0" />
                  <div>
                    <span className="text-[9px] text-gray-500 block">LOCATION</span>
                    <span className="text-gray-200">{selectedProject.location || 'Malibu Headquarters'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-jarvis-cyan shrink-0" />
                  <div>
                    <span className="text-[9px] text-gray-500 block">TEAM DIRECTORY</span>
                    <span className="text-gray-200">{selectedProject.teamMembers?.join(', ') || 'Tony Stark'}</span>
                  </div>
                </div>
              </div>

              {selectedProject.notes && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs text-gray-300 italic font-sans">
                  "{selectedProject.notes}"
                </div>
              )}
            </div>

            {/* TAB SECTION: CHECKLISTS & MEDIA METADATA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* CHECKLIST ENGINE (LHS of Details) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 h-full flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-xs text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-jarvis-cyan" />
                      Dynamic Production Checklists
                    </h3>

                    {/* Active Checklist Category Loop */}
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {selectedProject.checklists?.map((cat, catIdx) => (
                        <div key={cat.category} className="space-y-1.5">
                          <span className="text-[9px] font-mono text-jarvis-cyan/80 uppercase block tracking-wider font-bold">
                            // {cat.category}
                          </span>
                          <div className="space-y-1 bg-white/[0.01] rounded-xl p-2 border border-white/5">
                            {cat.items.map((item, itemIdx) => (
                              <div
                                key={item.id}
                                onClick={() => handleToggleChecklist(catIdx, itemIdx)}
                                className="flex items-start gap-2.5 p-1.5 rounded hover:bg-white/[0.02] cursor-pointer transition-colors"
                              >
                                {item.done ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-jarvis-cyan shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                                )}
                                <span className={`text-[11px] font-sans transition-all ${
                                  item.done ? 'line-through text-gray-500' : 'text-gray-300'
                                }`}>
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add checklist item */}
                  <div className="border-t border-white/5 pt-3 mt-4 flex gap-2">
                    <select
                      value={newChecklistCat}
                      onChange={(e: any) => setNewChecklistCat(e.target.value)}
                      className="bg-black border border-white/10 rounded-lg text-[10px] text-gray-300 p-1 font-mono focus:outline-none focus:border-jarvis-cyan"
                    >
                      <option value="General">General</option>
                      <option value="Shot List">Shot List</option>
                      <option value="Production">Production</option>
                      <option value="Editing">Editing</option>
                      <option value="Delivery">Delivery</option>
                    </select>
                    <input
                      type="text"
                      value={newItemText}
                      onChange={(e) => setNewItemText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddChecklistItem();
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-jarvis-cyan font-sans"
                      placeholder="Add customized checklist element..."
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan p-1.5 rounded-lg text-xs hover:bg-jarvis-cyan/30 transition-all cursor-pointer"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>

              {/* MEDIA FILE INTELLIGENCE PANEL (RHS of Details) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display text-xs text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-jarvis-cyan animate-pulse" />
                        Media Assets Directory
                      </h3>
                      <button
                        type="button"
                        onClick={() => scanMedia(selectedProject.approvedFolder || 'projects/aau_nightlife')}
                        className="p-1 text-gray-500 hover:text-jarvis-cyan hover:bg-white/5 rounded transition-all cursor-pointer"
                        title="Scan directory"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin text-jarvis-cyan' : ''}`} />
                      </button>
                    </div>

                    {/* Filter Bars */}
                    <div className="grid grid-cols-3 gap-1.5 mb-3 text-[9px] font-mono">
                      <div>
                        <span className="text-gray-500 block mb-0.5">RESOLUTION</span>
                        <select
                          value={resFilter}
                          onChange={(e) => setResFilter(e.target.value)}
                          className="w-full bg-black border border-white/5 rounded p-1 text-gray-300 focus:outline-none focus:border-jarvis-cyan"
                        >
                          <option value="all">ALL</option>
                          <option value="4k">4K (UHD)</option>
                          <option value="1080p">1080P</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">ASPECT</span>
                        <select
                          value={aspectFilter}
                          onChange={(e) => setAspectFilter(e.target.value)}
                          className="w-full bg-black border border-white/5 rounded p-1 text-gray-300 focus:outline-none focus:border-jarvis-cyan"
                        >
                          <option value="all">ALL</option>
                          <option value="16:9">WIDESCREEN 16:9</option>
                          <option value="9:16">VERTICAL 9:16</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">TYPE</span>
                        <select
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                          className="w-full bg-black border border-white/5 rounded p-1 text-gray-300 focus:outline-none focus:border-jarvis-cyan"
                        >
                          <option value="all">ALL</option>
                          <option value="video">VIDEO</option>
                          <option value="audio">AUDIO</option>
                          <option value="image">IMAGE</option>
                        </select>
                      </div>
                    </div>

                    {/* Scanned files list */}
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {scanning ? (
                        <div className="text-center p-8 text-gray-500 font-mono text-[10px]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-jarvis-cyan mx-auto mb-2" />
                          Indexing local storage nodes...
                        </div>
                      ) : filteredMedia.length === 0 ? (
                        <div className="text-center p-8 text-gray-600 font-mono text-[10px]">
                          No assets matching criteria.
                        </div>
                      ) : (
                        filteredMedia.map(file => (
                          <div 
                            key={file.filename}
                            className="p-2 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between text-[10px] font-mono group"
                          >
                            <div className="overflow-hidden mr-2">
                              <span className="text-white block truncate">{file.filename}</span>
                              <span className="text-[8px] text-gray-500 block truncate">{file.filePath}</span>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                {file.resolution && (
                                  <span className="bg-white/5 px-1 py-0.5 rounded text-[8px] text-gray-400 mr-1">
                                    {file.resolution}
                                  </span>
                                )}
                                {file.duration && (
                                  <span className="text-gray-400">{file.duration}</span>
                                )}
                                <span className="text-gray-500 block text-[8px]">{file.fileSize}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* MEDIA WORKFLOW ASSISTANCE ACTUATOR */}
                  <div className="border-t border-white/5 pt-3 mt-4 space-y-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase block tracking-wider">
                      Media Workflow Automation Module
                    </span>
                    <button
                      type="button"
                      disabled={organizing || filteredMedia.length === 0}
                      onClick={handleOrganizeMedia}
                      className="w-full p-2.5 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/15 border border-jarvis-cyan/20 text-jarvis-cyan text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      {organizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          REORGANIZING FILES...
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          STRUCTURE & SORT MEDIA ({filteredMedia.length})
                        </>
                      )}
                    </button>
                    {organizeMessage && (
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-[9px] font-mono text-green-400">
                        {organizeMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* EMPTY CONTAINER SCREEN */
          <div className="glass-panel rounded-2xl p-12 border border-white/5 bg-black/40 text-center text-gray-500 flex flex-col items-center justify-center h-full">
            <Film className="w-12 h-12 text-gray-700 animate-pulse-subtle mb-4" />
            <h3 className="font-display font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">
              Creative Hub Offline
            </h3>
            <p className="text-xs font-mono text-gray-500 max-w-sm mb-4">
              Select or initialize an active creative campaign coordinate from the directory panel to synchronize workflows.
            </p>
            <button
              type="button"
              onClick={() => setShowCreator(true)}
              className="px-4 py-2 rounded-xl bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 border border-jarvis-cyan/30 text-jarvis-cyan font-mono text-xs cursor-pointer"
            >
              + INITIALIZE CAMPAIGN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
