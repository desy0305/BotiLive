
import {useAtom} from 'jotai';
import React, {useState} from 'react';
import {
  RobotAddressAtom,
  IsAiActiveAtom,
  IsLiveActiveAtom,
  LogsAtom,
  TuningParamsAtom,
  SystemPromptAtom,
  SelectedModelAtom,
  OrderStorageAtom,
  MissionStateAtom,
  HasApiKeySelectedAtom
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
  const [, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const [activeTab, setActiveTab] = useState<'tuning' | 'kernel' | 'memory'>('tuning');

  const updateTuning = (key: keyof typeof tuning, val: number) => {
    setTuning(prev => ({ ...prev, [key]: val }));
  };

  const executeRobotCommand = async (endpoint: string) => {
    let clean = address.trim().replace(/^https?:\/\//, '');
    const proto = window.location.protocol === 'https:' ? 'https://' : 'http://';
    const baseUrl = `${proto}${clean}`.replace(/\/$/, '');
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

  const models = [
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
    { id: 'gemini-robotics-er-1.5-preview', label: 'Robotics ER 1.5' }
  ];

  return (
    <div className="flex flex-col bg-zinc-950/80 rounded-xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* 1. Global AI Config */}
      <div className="p-3 border-b border-white/10 bg-zinc-900/40 space-y-3 shrink-0">
        <div className="flex gap-2 text-left">
           <div className="flex-1 flex flex-col gap-1">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest px-1">Neural Core Model</span>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="w-full text-[10px] bg-black border-zinc-800 text-cyan-400 py-1.5 px-2 rounded font-mono focus:border-cyan-500 outline-none appearance-none"
              >
                {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
           </div>
           <div className="flex-1 flex flex-col gap-1">
              <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest px-1">Bridge Address</span>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="w-full text-[10px] py-1.5 px-2 bg-black border-zinc-800 text-cyan-400 font-mono rounded focus:border-cyan-500 outline-none"
              />
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIsAiActive(!isAiActive)} className={`py-2.5 rounded font-black uppercase text-[9px] border transition-all ${isAiActive ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse' : 'bg-cyan-600 border-transparent text-black hover:bg-cyan-500'}`}>
            {isAiActive ? 'Vision Pilot Active' : 'Start Vision Pilot'}
          </button>
          <button onClick={() => setIsLiveActive(!isLiveActive)} className={`py-2.5 rounded font-black uppercase text-[9px] border transition-all ${isLiveActive ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'}`}>
            {isLiveActive ? 'Live Brain Linked' : 'Link Live Brain'}
          </button>
        </div>
      </div>

      {/* 2. Mission Protocol Grid */}
      <div className="p-3 border-b border-white/5 bg-black/20 shrink-0 text-left">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1 text-left">Operational Missions</span>
        <div className="grid grid-cols-3 gap-1.5">
          {protocols.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setMission(p.id);
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] [CORE] PROTOCOL -> ${p.id.toUpperCase()}`, ...prev].slice(0, 100));
              }}
              className={`py-2.5 rounded-lg flex flex-col items-center justify-center border transition-all duration-300 ${mission === p.id ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300' : 'bg-zinc-900/30 border-white/5 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'}`}
            >
              <span className="text-sm mb-1">{p.icon}</span>
              <span className="text-[7px] font-black uppercase tracking-tight text-center px-1 leading-none">{p.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Manual Tactical Drive */}
      <div className="p-4 bg-zinc-950/60 shrink-0 border-b border-white/5 flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
          <div />
          <button 
            onMouseDown={() => executeRobotCommand(`/move?dir=fwd&speed=${tuning.speed}`)} 
            onMouseUp={() => executeRobotCommand('/move?dir=stop')} 
            className="h-12 bg-zinc-800 border border-zinc-600 rounded-lg active:bg-zinc-700 flex items-center justify-center text-xs font-black shadow-lg"
          >FWD</button>
          <div />
          
          <button 
            onMouseDown={() => executeRobotCommand(`/move?dir=left&speed=${tuning.turnSpeed}`)} 
            onMouseUp={() => executeRobotCommand('/move?dir=stop')} 
            className="h-12 bg-zinc-900 border border-white/5 text-zinc-400 rounded-lg active:bg-zinc-800 flex items-center justify-center text-xs font-black"
          >L</button>
          <button 
            onMouseDown={() => executeRobotCommand(`/move?dir=bwd&speed=${tuning.speed}`)} 
            onMouseUp={() => executeRobotCommand('/move?dir=stop')} 
            className="h-12 bg-zinc-800 border border-zinc-600 rounded-lg active:bg-zinc-700 flex items-center justify-center text-xs font-black"
          >BWD</button>
          <button 
            onMouseDown={() => executeRobotCommand(`/move?dir=right&speed=${tuning.turnSpeed}`)} 
            onMouseUp={() => executeRobotCommand('/move?dir=stop')} 
            className="h-12 bg-zinc-900 border border-white/5 text-zinc-400 rounded-lg active:bg-zinc-800 flex items-center justify-center text-xs font-black"
          >R</button>
          
          <button onClick={() => executeRobotCommand('/move?dir=stop')} className="col-span-3 mt-3 h-11 bg-red-600 border border-red-400 text-white text-[10px] font-black uppercase rounded-lg shadow-xl active:scale-95 transition-all">STOP ENGINE</button>
        </div>
      </div>

      {/* 4. Configuration Tabs */}
      <div className="flex flex-col shrink-0 border-b border-white/10">
        <div className="flex bg-zinc-900/80 shrink-0">
          <button onClick={() => setActiveTab('tuning')} className={`flex-1 py-3 text-[9px] uppercase font-black tracking-widest transition-all ${activeTab === 'tuning' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-zinc-600 hover:text-zinc-400'}`}>Tuning</button>
          <button onClick={() => setActiveTab('kernel')} className={`flex-1 py-3 text-[9px] uppercase font-black tracking-widest transition-all ${activeTab === 'kernel' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-zinc-600 hover:text-zinc-400'}`}>Kernel</button>
          <button onClick={() => setActiveTab('memory')} className={`flex-1 py-3 text-[9px] uppercase font-black tracking-widest transition-all ${activeTab === 'memory' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-zinc-600 hover:text-zinc-400'}`}>Memory</button>
        </div>

        <div className="h-64 overflow-y-auto custom-scrollbar p-4 bg-zinc-950/20 text-left">
          {activeTab === 'tuning' && (
            <div className="space-y-5">
              {[
                { label: 'DRIVE VELOCITY', key: 'speed', min: 0, max: 255 },
                { label: 'TURN VELOCITY', key: 'turnSpeed', min: 0, max: 255 },
                { label: 'SYNC FREQUENCY (MS)', key: 'cycle', min: 500, max: 10000 },
                { label: 'SAFE DISTANCE (CM)', key: 'safeDist', min: 10, max: 100 },
                { label: 'THINKING BUDGET', key: 'thinkingBudget', min: 0, max: 24576 }
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{s.label}</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-black px-1.5 py-0.5 rounded">{tuning[s.key as keyof typeof tuning]}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={tuning[s.key as keyof typeof tuning]} onChange={(e) => updateTuning(s.key as keyof typeof tuning, Number(e.target.value))} className="w-full h-1.5 accent-cyan-500 bg-zinc-800 rounded-full appearance-none cursor-pointer" />
                </div>
              ))}
              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={async () => {
                    await window.aistudio.openSelectKey();
                    setHasKey(true);
                  }}
                  className="w-full py-2 text-[8px] uppercase font-black border border-cyan-900/30 text-cyan-700 hover:text-cyan-400 transition-colors"
                >
                  Switch API Project
                </button>
              </div>
            </div>
          )}
          {activeTab === 'kernel' && (
             <div className="flex flex-col gap-2 h-full">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Neural Instruction Kernel</span>
                <textarea 
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  className="w-full h-full text-[10px] bg-black/60 border border-zinc-800 p-3 font-mono text-zinc-400 leading-relaxed resize-none focus:text-cyan-100 transition-colors rounded-xl outline-none" 
                />
             </div>
          )}
          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-900/30 border border-white/5 rounded-xl">
                 <span className="text-[8px] text-zinc-600 font-black block mb-2 uppercase tracking-widest">LTM Persistence Buffer</span>
                 {Object.keys(orders).length === 0 ? <div className="text-zinc-800 italic text-[9px] py-4 text-center">Neural buffer empty.</div> : 
                   Object.entries(orders).map(([k, v]) => (
                     <div key={k} className="text-[10px] text-zinc-300 flex justify-between items-center border-b border-white/5 py-2.5 last:border-0">
                       <span className="text-zinc-500 font-bold uppercase text-[7px] tracking-widest">LOC_{k}</span>
                       <span className="text-cyan-500 font-mono font-bold">{v}</span>
                     </div>
                   ))
                 }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Telemetry Feed */}
      <div className="bg-black flex flex-col min-h-[250px] max-h-[400px]">
         <div className="px-3 py-2 bg-zinc-900/60 flex justify-between items-center border-b border-white/5">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.4em]">Telemetry_Log</span>
            <button onClick={() => setLogs([])} className="text-[8px] text-zinc-600 hover:text-white uppercase font-bold">Flush</button>
         </div>
         <div className="grow p-3 font-mono text-[9px] leading-[1.6] overflow-y-auto custom-scrollbar flex flex-col-reverse text-left">
            {logs.map((l, i) => (
               <div key={i} className={`mb-1 pl-2 border-l-2 transition-all ${l.includes('[PILOT]') ? 'text-emerald-500 border-emerald-900/40' : l.includes('[ERR]') ? 'text-red-500 border-red-900/40' : l.includes('[CORE]') ? 'text-cyan-400 border-cyan-900/40' : 'text-zinc-600 border-zinc-800'}`}>
                  {l}
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
