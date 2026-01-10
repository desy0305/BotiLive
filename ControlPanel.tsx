
import {useAtom} from 'jotai';
import React, {useState} from 'react';
import {
  RobotAddressAtom,
  IsAiActiveAtom,
  IsLiveActiveAtom,
  LogsAtom,
  TuningParamsAtom,
  SystemPromptAtom,
  AiThoughtAtom,
  SelectedModelAtom,
  OrderStorageAtom,
  MissionStateAtom
} from './atoms';

export function ControlPanel() {
  const [address, setAddress] = useAtom(RobotAddressAtom);
  const [isAiActive, setIsAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive, setIsLiveActive] = useAtom(IsLiveActiveAtom);
  const [logs, setLogs] = useAtom(LogsAtom);
  const [tuning, setTuning] = useAtom(TuningParamsAtom);
  const [prompt, setPrompt] = useAtom(SystemPromptAtom);
  const [model, setModel] = useAtom(SelectedModelAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [mission, setMission] = useAtom(MissionStateAtom);

  const [activeTab, setActiveTab] = useState<'tuning' | 'kernel' | 'memory'>('tuning');

  const updateTuning = (key: keyof typeof tuning, val: number) => {
    setTuning(prev => ({ ...prev, [key]: val }));
  };

  const getRobotBase = () => {
    let clean = address.trim().replace(/^https?:\/\//, '');
    const proto = window.location.protocol === 'https:' ? 'https://' : 'http://';
    return `${proto}${clean}`.replace(/\/$/, '');
  };

  const executeRobotCommand = async (endpoint: string) => {
    const baseUrl = getRobotBase();
    try {
      await fetch(`${baseUrl}${endpoint}`, { mode: 'no-cors', cache: 'no-store' });
    } catch (e: any) {}
  };

  const protocols = [
    { id: 'Standby', icon: '⏸️' },
    { id: 'Autopilot', icon: '🚀' },
    { id: 'Patrol', icon: '🛡️' },
    { id: 'Security Bot', icon: '👁️' },
    { id: 'Vision Guided', icon: '🎯' },
    { id: 'AI Live Control', icon: '🎙️' }
  ];

  return (
    <div className="flex flex-col h-full bg-black/40 rounded border border-white/5 overflow-hidden">
      {/* 1. Header/Address */}
      <div className="p-2 border-b border-white/5 bg-zinc-900/30 flex gap-2 shrink-0">
        <input 
          type="text" 
          value={address} 
          onChange={(e) => setAddress(e.target.value)} 
          className="flex-grow text-[10px] py-1 px-2 bg-black/40 border-zinc-800 text-cyan-400 font-mono focus:border-cyan-500 outline-none"
        />
        <button onClick={() => setLogs([])} className="text-[9px] px-2 bg-zinc-800 text-zinc-500 uppercase font-bold hover:text-white">Flush</button>
      </div>

      {/* 2. Tactical Protocol Selector */}
      <div className="p-2 border-b border-white/5 shrink-0">
        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mb-1.5 block px-1">Active Protocols</span>
        <div className="grid grid-cols-3 gap-1">
          {protocols.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setMission(p.id);
                setLogs(prev => [`[CORE] PROTOCOL SET: ${p.id.toUpperCase()}`, ...prev].slice(0, 100));
              }}
              className={`py-2 rounded flex flex-col items-center justify-center border transition-all ${mission === p.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.2)]' : 'bg-zinc-900/50 border-white/5 text-zinc-600 hover:border-zinc-700'}`}
            >
              <span className="text-xs mb-0.5">{p.icon}</span>
              <span className="text-[7px] font-bold uppercase tracking-tighter truncate w-full px-1 text-center">{p.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Manual Tactical Drive */}
      <div className="p-3 bg-zinc-950/40 shrink-0 border-b border-white/5">
        <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
          <div />
          <button onMouseDown={() => executeRobotCommand(`/move?dir=fwd&speed=${tuning.speed}`)} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-zinc-800 border border-zinc-600 text-white rounded hover:bg-zinc-700 flex items-center justify-center text-xs font-bold">FWD</button>
          <div />
          
          <button onMouseDown={() => executeRobotCommand(`/move?dir=left&speed=${tuning.turnSpeed}`)} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-zinc-900 border border-white/5 text-zinc-400 rounded hover:bg-zinc-800 flex items-center justify-center text-xs font-bold">L</button>
          <button onMouseDown={() => executeRobotCommand(`/move?dir=bwd&speed=${tuning.speed}`)} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-zinc-800 border border-zinc-600 text-white rounded hover:bg-zinc-700 flex items-center justify-center text-xs font-bold">BWD</button>
          <button onMouseDown={() => executeRobotCommand(`/move?dir=right&speed=${tuning.turnSpeed}`)} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-zinc-900 border border-white/5 text-zinc-400 rounded hover:bg-zinc-800 flex items-center justify-center text-xs font-bold">R</button>
          
          <button onClick={() => executeRobotCommand('/move?dir=stop')} className="col-span-3 mt-1 h-9 bg-red-900/40 border border-red-500 text-red-200 text-[10px] font-bold uppercase rounded hover:bg-red-900/60 transition-colors">Emergency Stop</button>
        </div>
      </div>

      {/* 4. AI Link Toggles */}
      <div className="p-2 grid grid-cols-2 gap-2 shrink-0 bg-zinc-900/10">
        <button onClick={() => setIsAiActive(!isAiActive)} className={`py-3 rounded font-bold uppercase text-[9px] border transition-all ${isAiActive ? 'bg-orange-600/20 border-orange-500 text-orange-200 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-cyan-600 border-transparent text-black hover:bg-cyan-500'}`}>
          {isAiActive ? 'Vision Pulse Active' : 'Enable Vision Pilot'}
        </button>
        <button onClick={() => setIsLiveActive(!isLiveActive)} className={`py-3 rounded font-bold uppercase text-[9px] border transition-all ${isLiveActive ? 'bg-fuchsia-900/20 border-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)] animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'}`}>
          {isLiveActive ? 'Core Brain Detach' : 'Link Neural Brain'}
        </button>
      </div>

      {/* 5. Extended Config Tabs */}
      <div className="flex flex-col min-h-0 grow">
        <div className="flex bg-zinc-900/50 shrink-0 border-b border-white/5">
          {['tuning', 'kernel', 'memory'].map((tab: any) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-[9px] uppercase font-bold tracking-widest transition-all ${activeTab === tab ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-cyan-500' : 'text-zinc-600 hover:text-zinc-400'}`}>{tab}</button>
          ))}
        </div>

        <div className="grow overflow-y-auto custom-scrollbar p-3">
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              {[
                { label: 'MOTOR VELOCITY', key: 'speed', min: 0, max: 255 },
                { label: 'TURN VELOCITY', key: 'turnSpeed', min: 0, max: 255 },
                { label: 'AI FREQUENCY (MS)', key: 'cycle', min: 500, max: 10000 },
                { label: 'SAFETY LIMIT (CM)', key: 'safeDist', min: 10, max: 100 }
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1 group">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight group-hover:text-cyan-600 transition-colors">{s.label}</span>
                    <span className="text-[10px] font-mono text-cyan-500 font-bold">{tuning[s.key as keyof typeof tuning]}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={tuning[s.key as keyof typeof tuning]} onChange={(e) => updateTuning(s.key as keyof typeof tuning, Number(e.target.value))} className="w-full h-1 accent-cyan-500 bg-zinc-800" />
                </div>
              ))}
            </div>
          )}
          {activeTab === 'kernel' && (
             <div className="flex flex-col h-full gap-3">
                <div className="flex flex-col gap-1.5">
                   <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Vision Pilot Model</span>
                   <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full text-[10px] bg-black/40 border-zinc-800 text-cyan-200 py-1.5 px-2 font-mono">
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Fastest)</option>
                      <option value="gemini-3-pro-preview">Gemini 3 Pro (Expert)</option>
                      <option value="gemini-robotics-er-1.5-preview">Robotics ER 1.5</option>
                   </select>
                </div>
                <div className="flex flex-col grow gap-1.5 mt-2">
                   <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Prompt Kernel</span>
                   <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="grow text-[10px] bg-black/40 border-zinc-900 p-2 font-mono text-zinc-400 leading-tight resize-none focus:text-cyan-100 transition-colors border rounded" />
                </div>
             </div>
          )}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded">
                 <span className="text-[8px] text-cyan-600 font-bold block mb-1 uppercase tracking-widest">Active Protocol Domain</span>
                 <div className="text-[11px] text-cyan-100 font-mono font-bold tracking-widest">{mission.toUpperCase()}</div>
              </div>
              <div className="p-2.5 bg-zinc-900/30 border border-white/5 rounded">
                 <span className="text-[8px] text-zinc-600 font-bold block mb-2 uppercase tracking-widest">LTM Buffer (Persistent Memory)</span>
                 {Object.keys(orders).length === 0 ? <div className="text-zinc-800 italic text-[9px] py-1 px-1">Buffer empty. No persistence events logged.</div> : 
                   Object.entries(orders).map(([k, v]) => (
                     <div key={k} className="text-[10px] text-zinc-400 flex justify-between items-center border-b border-white/5 py-1.5 px-1 last:border-0">
                       <span className="text-zinc-500 font-bold">LOC_{k}:</span>
                       <span className="text-cyan-500 font-mono">{v}</span>
                     </div>
                   ))
                 }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Telemetry Monitoring Buffer */}
      <div className="bg-[#0a0a0c] border-t border-white/10 h-72 flex flex-col shrink-0">
         <div className="px-3 py-1.5 bg-zinc-900/60 flex justify-between items-center border-b border-white/5">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Telemetry Stream</span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
         </div>
         <div className="grow p-3 font-mono text-[9px] leading-[1.5] overflow-y-auto custom-scrollbar flex flex-col-reverse gap-1.5">
            {logs.map((l, i) => (
               <div key={i} className={`border-l-2 pl-2 transition-all duration-300 hover:bg-white/5 py-0.5 ${l.includes('[PILOT]') ? 'text-emerald-500 border-emerald-900/50' : l.includes('[ERR]') ? 'text-red-500 border-red-900/50' : l.includes('[EVA]') ? 'text-fuchsia-400 border-fuchsia-900/50' : 'text-zinc-600 border-zinc-800'}`}>
                  {l}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
