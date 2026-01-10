
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
  MissionStateAtom,
  HasApiKeySelectedAtom
} from './atoms';

export function ControlPanel() {
  const [address, setAddress] = useAtom(RobotAddressAtom);
  const [isAiActive, setIsAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive, setIsLiveActive] = useAtom(IsLiveActiveAtom);
  const [logs, setLogs] = useAtom(LogsAtom);
  const [tuning, setTuning] = useAtom(TuningParamsAtom);
  const [thought] = useAtom(AiThoughtAtom);
  const [prompt, setPrompt] = useAtom(SystemPromptAtom);
  const [model, setModel] = useAtom(SelectedModelAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [hasKey, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const [activeTab, setActiveTab] = useState<'tuning' | 'prompt' | 'diag'>('tuning');

  const updateTuning = (key: keyof typeof tuning, val: number) => {
    setTuning(prev => ({ ...prev, [key]: val }));
  };

  const executeRobotCommand = async (endpoint: string) => {
    const fullUrl = address.startsWith('http') ? `${address}${endpoint}` : `http://${address}${endpoint}`;
    setLogs(prev => [`[MANUAL] Sending: ${endpoint} to ${fullUrl}`, ...prev].slice(0, 50));
    try {
      await fetch(fullUrl, { mode: 'no-cors' }).catch((e) => {
        setLogs(prev => [`[ERR] Link Failed: ${e.message}`, ...prev].slice(0, 50));
      });
    } catch (e) {}
  };

  const handleKeySelection = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setLogs(prev => [`[SYS] Using internal ENV key (Standalone Mode)`, ...prev].slice(0, 50));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/20 rounded-lg border border-white/5">
      
      {/* 1. Address & Config Header */}
      <div className="p-3 bg-zinc-900/60 border-b border-white/5 grid grid-cols-2 gap-3 shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Robot Target</label>
          <input 
            type="text" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="e.g. agv.e-scm.org"
            className="text-[11px] py-1.5 px-2 bg-black border-zinc-800 text-cyan-400 font-mono focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Project Auth</label>
          <button 
            onClick={handleKeySelection} 
            className={`text-[10px] py-1.5 border font-bold transition-all uppercase ${!hasKey ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400'}`}
          >
            {hasKey ? 'Synced ✓' : 'Connect Key'}
          </button>
        </div>
      </div>

      {/* 2. Tactical D-Pad */}
      <div className="p-3 bg-zinc-950/40 grid grid-cols-3 gap-1 shrink-0">
        <button onMouseDown={() => executeRobotCommand('/move?dir=left')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-900/80 border-white/5 text-zinc-400 uppercase font-bold hover:bg-zinc-800">Turn L</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=fwd')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-800 border-zinc-500 text-white uppercase font-bold hover:border-cyan-500">↑ Forward</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=right')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-900/80 border-white/5 text-zinc-400 uppercase font-bold hover:bg-zinc-800">Turn R</button>
        <button onClick={() => executeRobotCommand('/move?dir=left&speed=150')} className="h-8 text-[8px] text-zinc-600 uppercase border-dashed">Spin L</button>
        <button onClick={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-red-600/20 border-red-600/50 text-red-500 font-bold text-[10px] uppercase shadow-[0_0_15px_rgba(220,38,38,0.1)]">EMG STOP</button>
        <button onClick={() => executeRobotCommand('/move?dir=right&speed=150')} className="h-8 text-[8px] text-zinc-600 uppercase border-dashed">Spin R</button>
        <button onClick={() => executeRobotCommand('/mode?val=hold')} className="h-8 text-[8px] text-blue-500/60 uppercase">Hold</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=bwd')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-8 text-[9px] bg-zinc-900/80 text-zinc-400 uppercase">↓ Reverse</button>
        <button onClick={() => executeRobotCommand('/status')} className="h-8 text-[8px] text-zinc-600 uppercase">Status</button>
      </div>

      {/* 3. Operational Toggles */}
      <div className="p-3 grid grid-cols-2 gap-2 bg-black/40 shrink-0">
        <button 
          onClick={() => setIsAiActive(!isAiActive)} 
          className={`py-3.5 font-bold uppercase text-[11px] tracking-[0.2em] border shadow-2xl transition-all ${isAiActive ? 'bg-orange-600/20 border-orange-500 text-orange-200 shadow-orange-950/20 animate-pulse' : 'bg-cyan-600 border-transparent text-black'}`}
        >
          {isAiActive ? 'Terminate Vision' : 'Engage Vision Pilot'}
        </button>
        <button 
          onClick={() => setIsLiveActive(!isLiveActive)} 
          className={`py-3.5 font-bold uppercase text-[11px] tracking-[0.2em] border transition-all ${isLiveActive ? 'bg-magenta-900/30 border-magenta-500 text-white shadow-magenta-950/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
        >
          {isLiveActive ? 'Kill Brain Sync' : 'Link Live Brain'}
        </button>
      </div>

      {/* 4. Tabbed Configuration Area */}
      <div className="flex-grow flex flex-col min-h-0">
        <div className="flex border-y border-white/5 bg-zinc-900/20">
          <button onClick={() => setActiveTab('tuning')} className={`flex-1 py-2 text-[9px] uppercase font-bold border-r border-white/5 ${activeTab === 'tuning' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>Tuning</button>
          <button onClick={() => setActiveTab('prompt')} className={`flex-1 py-2 text-[9px] uppercase font-bold border-r border-white/5 ${activeTab === 'prompt' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>System Prompt</button>
          <button onClick={() => setActiveTab('diag')} className={`flex-1 py-2 text-[9px] uppercase font-bold ${activeTab === 'diag' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>Diagnostics</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-3">
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              {[
                { label: 'FWD POWER', key: 'speed', min: 0, max: 255 },
                { label: 'TURN POWER', key: 'turnSpeed', min: 0, max: 255 },
                { label: 'PULSE WIDTH (MS)', key: 'turnMs', min: 100, max: 2000 },
                { label: 'SAFE DISTANCE (CM)', key: 'safeDist', min: 10, max: 100 },
                { label: 'AI FREQUENCY (MS)', key: 'cycle', min: 500, max: 10000 },
                { label: 'MODEL TEMP', key: 'temperature', min: 0, max: 1, step: 0.1 }
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase">{s.label}</span>
                    <span className="text-[10px] font-mono text-cyan-500">{tuning[s.key as keyof typeof tuning]}</span>
                  </div>
                  <input 
                    type="range" 
                    min={s.min} max={s.max} step={s.step || 1} 
                    value={tuning[s.key as keyof typeof tuning]} 
                    onChange={(e) => updateTuning(s.key as keyof typeof tuning, Number(e.target.value))}
                    className="w-full h-1 accent-cyan-500 appearance-none bg-zinc-800 rounded-full"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prompt' && (
            <div className="h-full flex flex-col gap-2">
              <select value={model} onChange={(e) => setModel(e.target.value)} className="text-[10px] py-1.5 bg-black/60 border-zinc-800 text-zinc-400">
                <option value="gemini-robotics-er-1.5-preview">Robotics Preview v1.5</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash (High Speed)</option>
              </select>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                className="flex-grow text-[10px] bg-black/40 border-zinc-900 p-2 font-mono text-zinc-400 leading-relaxed resize-none rounded-lg"
              />
            </div>
          )}

          {activeTab === 'diag' && (
            <div className="space-y-3">
              <div className="p-2 rounded bg-zinc-900/80 border border-white/5 flex flex-col gap-1">
                 <span className="text-[8px] text-zinc-600 font-bold uppercase italic">Active Memory</span>
                 <div className="text-[10px] text-zinc-400">{mission}</div>
              </div>
              <div className="p-2 rounded bg-zinc-900/80 border border-white/5 flex flex-col gap-1">
                 <span className="text-[8px] text-zinc-600 font-bold uppercase italic">Order Queue</span>
                 {Object.keys(orders).length === 0 ? <div className="text-[10px] text-zinc-700">Empty</div> : 
                   Object.entries(orders).map(([k, v]) => <div key={k} className="text-[10px] text-cyan-300">Tbl {k}: {v}</div>)
                 }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Neural Output (Persistent Footer) */}
      <div className="bg-black border-t border-white/10 h-32 flex flex-col shrink-0 overflow-hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
         <div className="px-3 py-1.5 bg-zinc-900 border-b border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest font-bold flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> Telemetry Buffer
            </span>
            <button onClick={() => setLogs([])} className="text-[8px] text-zinc-600 hover:text-zinc-400 uppercase font-bold">Flush</button>
         </div>
         <div className="flex-grow p-2 font-mono text-[9px] leading-snug overflow-y-auto custom-scrollbar bg-black/60">
            {logs.length === 0 ? (
               <div className="text-zinc-800 italic mt-6 text-center">Awaiting neural commands...</div>
            ) : (
               logs.map((l, i) => (
                  <div key={i} className={`mb-1 break-all ${l.includes('[ERR]') ? 'text-red-400' : l.includes('[PILOT]') ? 'text-green-400' : l.includes('[MANUAL]') ? 'text-yellow-600' : 'text-zinc-500'}`}>
                     {l}
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}
