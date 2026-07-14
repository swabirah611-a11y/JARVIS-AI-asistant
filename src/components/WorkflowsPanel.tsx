import React, { useState, useEffect } from 'react';
import { 
  Workflow, Play, CheckCircle, AlertCircle, Trash2, Plus, 
  Clock, ShieldCheck, Layers, Loader2, ArrowRight, Check, HelpCircle
} from 'lucide-react';
import { Workflow as WorkflowType, WorkflowStep, AutomationHistoryItem } from '../types';

export function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [history, setHistory] = useState<AutomationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  
  // Custom creator state
  const [showCreator, setShowCreator] = useState(false);
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([]);
  
  // Active step builder
  const [stepTool, setStepTool] = useState('manage_projects');
  const [stepDesc, setStepDesc] = useState('');
  const [stepArgJson, setStepArgJson] = useState('{\n  "action": "create",\n  "name": "New Video Project",\n  "type": "Promotional video"\n}');

  useEffect(() => {
    fetchWorkflows();
    fetchHistory();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      setWorkflows(data);
    } catch (err) {
      console.error('Failed to load workflows', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/automation/history');
      const data = await res.json();
      setHistory(data.reverse()); // latest first
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const handleRunWorkflow = async (workflow: WorkflowType) => {
    setRunningWorkflow(workflow.id);
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: workflow.id,
          workflowName: workflow.name,
          steps: workflow.steps
        })
      });
      await res.json();
      fetchHistory();
    } catch (err) {
      console.error('Failed to execute workflow', err);
    } finally {
      setRunningWorkflow(null);
    }
  };

  const handleAddStepToCreator = () => {
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(stepArgJson);
    } catch (err) {
      alert('Error: Invalid JSON parameter formatting.');
      return;
    }

    const newStep: Partial<WorkflowStep> = {
      id: `step-${Date.now()}-${steps.length}`,
      toolName: stepTool,
      args: parsedArgs,
      description: stepDesc || `Execute ${stepTool} action`
    };

    setSteps([...steps, newStep]);
    setStepDesc('');
    // reset arguments templates based on next tool
    if (stepTool === 'open_website') {
      setStepArgJson('{\n  "url": "https://vimeo.com"\n}');
    } else if (stepTool === 'launch_application') {
      setStepArgJson('{\n  "applicationId": "premiere_pro"\n}');
    } else {
      setStepArgJson('{\n  "action": "create",\n  "name": "New Campaign Project",\n  "type": "Music video"\n}');
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim() || steps.length === 0) return;

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wfName,
          description: wfDesc,
          steps: steps
        })
      });
      if (res.ok) {
        setShowCreator(false);
        setWfName('');
        setWfDesc('');
        setSteps([]);
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Failed to register workflow', err);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this workflow template?')) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWorkflows();
      }
    } catch (err) {
      console.error('Failed to delete workflow', err);
    }
  };

  const handleToolSelectionChange = (tool: string) => {
    setStepTool(tool);
    if (tool === 'open_website') {
      setStepArgJson('{\n  "url": "https://youtube.com"\n}');
    } else if (tool === 'launch_application') {
      setStepArgJson('{\n  "applicationId": "premiere_pro"\n}');
    } else if (tool === 'manage_projects') {
      setStepArgJson('{\n  "action": "create",\n  "name": "Dynamic Promo Project",\n  "type": "Promotional video"\n}');
    } else if (tool === 'manage_tasks') {
      setStepArgJson('{\n  "action": "create",\n  "title": "Review footage edits",\n  "priority": "high"\n}');
    } else {
      setStepArgJson('{}');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-1 w-full" id="workflows_container">
      
      {/* LHS: Workflow Templates */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        
        {showCreator ? (
          /* WORKFLOW TEMPLATE CREATOR */
          <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-black/40 text-gray-300">
            <h3 className="font-display text-sm text-white font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-jarvis-cyan animate-pulse" />
              Configure Custom Automation Sequence
            </h3>
            
            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-gray-500 block">Workflow Title *</label>
                <input
                  type="text"
                  required
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  placeholder="e.g. Initialize Daily Shoot Routine"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-gray-500 block">Description</label>
                <input
                  type="text"
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-jarvis-cyan transition-all"
                  placeholder="e.g. Chains video project structures, opens folders, and launches tools."
                />
              </div>

              {/* CURRENT STEPS CHIPS */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase block tracking-wider">
                  Chained Automation Actions ({steps.length})
                </span>
                {steps.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] text-center text-xs text-gray-500 font-mono">
                    No steps added to chain yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {steps.map((st, i) => (
                      <div key={st.id} className="p-2 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-jarvis-cyan bg-jarvis-cyan/10 px-1.5 rounded">{i + 1}</span>
                          <div>
                            <span className="text-white font-bold block">{st.toolName}</span>
                            <span className="text-gray-500 text-[10px]">{st.description}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSteps(steps.filter(s => s.id !== st.id))}
                          className="text-jarvis-red p-1 rounded hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION BUILDER INNER BOARD */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-3.5 h-3.5 text-jarvis-cyan" />
                  <span className="text-[10px] font-mono uppercase text-gray-300 font-bold">Action Constructor</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="text-[8px] text-gray-500 block mb-0.5">TARGET TOOL</label>
                    <select
                      value={stepTool}
                      onChange={(e) => handleToolSelectionChange(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded p-1.5 text-white focus:outline-none focus:border-jarvis-cyan"
                    >
                      <option value="manage_projects">manage_projects</option>
                      <option value="open_website">open_website</option>
                      <option value="launch_application">launch_application</option>
                      <option value="manage_tasks">manage_tasks</option>
                      <option value="get_daily_briefing">get_daily_briefing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-gray-500 block mb-0.5">STEP BRIEF DESCRIPTION</label>
                    <input
                      type="text"
                      value={stepDesc}
                      onChange={(e) => setStepDesc(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded p-1.5 text-white focus:outline-none focus:border-jarvis-cyan"
                      placeholder="e.g. Register creative project"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[8px] text-gray-500 block mb-0.5 font-mono">ARGUMENTS OBJECT (JSON SCHEMA)</label>
                  <textarea
                    rows={4}
                    value={stepArgJson}
                    onChange={(e) => setStepArgJson(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded p-2 text-xs text-jarvis-cyan font-mono focus:outline-none focus:border-jarvis-cyan resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddStepToCreator}
                  className="w-full py-1.5 rounded-lg bg-jarvis-cyan/10 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan font-mono text-[10px] uppercase font-bold cursor-pointer"
                >
                  + CHAIN STEP
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreator(false)}
                  className="px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={steps.length === 0 || !wfName}
                  className="px-4 py-2 rounded-xl bg-jarvis-cyan text-black font-display font-bold text-xs hover:bg-[#00d8e6] transition-all cursor-pointer disabled:opacity-40"
                >
                  SAVE WORKFLOW
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ACTIVE LIST OF WORKFLOWS */
          <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xs text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Workflow className="w-4 h-4 text-jarvis-cyan animate-pulse-subtle" />
                  Reusable Automation Workflows
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreator(true)}
                  className="text-[9px] font-mono px-2 py-1.5 rounded bg-jarvis-cyan/15 hover:bg-jarvis-cyan/25 border border-jarvis-cyan/30 text-jarvis-cyan transition-all cursor-pointer"
                >
                  + CONFIGURE SEQUENCE
                </button>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {workflows.map(wf => {
                  const isRunning = runningWorkflow === wf.id;
                  return (
                    <div 
                      key={wf.id}
                      className="p-3.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 space-y-3 group transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-display font-bold text-xs text-white uppercase tracking-wide">
                            {wf.name}
                          </h4>
                          <p className="text-[10px] font-sans text-gray-400 mt-0.5">
                            {wf.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRunWorkflow(wf)}
                            disabled={!!runningWorkflow}
                            className="p-1.5 rounded-lg bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 text-jarvis-cyan hover:text-white border border-jarvis-cyan/25 transition-all disabled:opacity-40 cursor-pointer"
                            title="Execute automated run"
                          >
                            {isRunning ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkflow(wf.id)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-jarvis-red hover:bg-jarvis-red/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete workflow template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Display steps list */}
                      <div className="space-y-1 border-t border-white/5 pt-2.5 text-[9px] font-mono text-gray-500">
                        {wf.steps?.map((step, idx) => (
                          <div key={step.id || idx} className="flex items-center gap-2">
                            <span className="text-gray-600">{idx + 1}.</span>
                            <span className="text-gray-300 font-bold">{step.toolName}</span>
                            <span className="text-gray-600 font-sans">({step.description})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[9px] font-mono text-gray-500 uppercase mt-4">
              <div>Secure Sandbox Controlled Execution Node</div>
              <div>Authority Level: SAFE & CONFIRMED</div>
            </div>
          </div>
        )}

      </div>

      {/* RHS: Automation run History Transparency log */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-black/40 flex-1 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xs text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-jarvis-cyan animate-pulse-subtle" />
                Automation Run History Logs
              </h3>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-[9px] font-mono px-2 py-1 rounded bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-colors"
              >
                REFRESH LOGS
              </button>
            </div>

            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {history.map(item => {
                const isFailed = item.status === 'failed' || item.status === 'partial';
                return (
                  <div 
                    key={item.id}
                    className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-2.5 text-xs font-mono text-gray-400"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isFailed ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
                          <span className="text-white font-bold">{item.workflowName}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 block mt-0.5">Run ID: {item.id} • Started: {new Date(item.startTime).toLocaleString()}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                        item.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        item.status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {/* Step log breakdown */}
                    <div className="space-y-1.5 border-t border-white/5 pt-2">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                        Executions Trace logs:
                      </span>
                      {item.actionsPerformed?.map((act, i) => (
                        <div 
                          key={i} 
                          className="bg-black/40 rounded-lg p-2 border border-white/[0.02] space-y-1 text-[11px]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{act.toolName}</span>
                            <span className={`text-[8px] font-bold px-1.5 rounded uppercase ${
                              act.status === 'success' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                            }`}>
                              {act.status}
                            </span>
                          </div>
                          {act.params && (
                            <div className="text-[9px] text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap leading-tight">
                              Params: {JSON.stringify(act.params)}
                            </div>
                          )}
                          {act.result && (
                            <div className="text-[10px] text-jarvis-cyan mt-1 leading-normal">
                              Result: {act.result}
                            </div>
                          )}
                          {act.error && (
                            <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1 leading-normal font-sans">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Error: {act.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-white/5 pt-2 text-[9px] text-gray-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-jarvis-cyan" />
                      <span>Authorized permissions used: <span className="text-white">{item.permissionsRequested?.join(', ')}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[9px] font-mono text-gray-500 uppercase mt-4">
            <div>Audit Integrity: Signed E2EE</div>
            <div>Transparency logging protocol active</div>
          </div>
        </div>
      </div>

    </div>
  );
}
