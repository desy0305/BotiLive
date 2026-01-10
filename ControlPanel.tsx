
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
  const [hasKey] = useAtom(HasApiKeySelectedAtom);

  const [activeTab, setActiveTab] = useState<'tuning' | 'prompt' | 'diag'>('tuning');

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
    const fullUrl = `${baseUrl}${endpoint}`;

    setLogs(prev => [`[EXEC] ${endpoint} -> ${baseUrl}`, ...prev].slice(0, 50));
    try {
      await fetch(fullUrl, { mode: 'no-cors', cache: 'no-store' });
    } catch (e: any) {
      setLogs(prev => [`[ERR] Link Dead: ${e.message}`, ...prev].slice(0, 50));
    }
  };

  const runConnectivityDiagnostic = async () => {
    const baseUrl = getRobotBase();
    const target = `${baseUrl}/status`;
    setLogs(prev => [`[DIAG] Probing: ${target}`, ...prev].slice(0, 50));
    
    try {
      const res = await fetch(target, { mode: 'cors' });
      if (res.ok) {
        const json = await res.json();
        setLogs(prev => [`[DIAG] SUCCESS! Distance: ${json.d}cm`, ...prev].slice(0, 50));
      } else {
        setLogs(prev => [`[DIAG] HTTP FAIL: ${res.status}`, ...prev].slice(0, 50));
      }
    } catch (e: any) {
      setLogs(prev => [
        `[DIAG] BLOCK: ${e.message}`,
        `[HELP] Site is ${window.location.protocol.toUpperCase()}. Robot must use HTTPS.`,
        ...prev
      ].slice(0, 50));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/60 rounded-lg border border-white/5 shadow-2xl">
      <div className="p-3 bg-zinc-900/80 border-b border-white/5 grid grid-cols-2 gap-3 shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Robot Link</label>
          <input 
            type="text" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="agv.e-scm.org"
            className="text-[11px] py-1.5 px-2 bg-black border-zinc-800 text-cyan-400 font-mono focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Safety Lock</label>
          <button className="text-[10px] py-1.5 border font-bold bg-cyan-950/40 border-cyan-500/40 text-cyan-400 uppercase">
             Arming...
          </button>
        </div>
      </div>

      <div className="p-3 bg-zinc-950/60 grid grid-cols-3 gap-1 shrink-0">
        <button onMouseDown={() => executeRobotCommand('/move?dir=left')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-900/80 border-white/5 text-zinc-400 uppercase font-bold hover:bg-zinc-800">Turn L</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=fwd')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-800 border-zinc-500 text-white uppercase font-bold hover:border-cyan-500">↑ Forward</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=right')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-10 text-[10px] bg-zinc-900/80 border-white/5 text-zinc-400 uppercase font-bold hover:bg-zinc-800">Turn R</button>
        <button onClick={() => executeRobotCommand('/move?dir=left&speed=150')} className="h-8 text-[8px] text-zinc-600 uppercase border-dashed font-mono">Spin L</button>
        <button onClick={() => executeRobotCommand('/move?dir=stop')} className="h-10 bg-red-600/40 border-red-600/50 text-red-100 font-bold text-[10px] uppercase shadow-[0_0_15px_rgba(220,38,38,0.2)]">E-STOP</button>
        <button onClick={() => executeRobotCommand('/move?dir=right&speed=150')} className="h-8 text-[8px] text-zinc-600 uppercase border-dashed font-mono">Spin R</button>
        <button onClick={() => executeRobotCommand('/status')} className="h-8 text-[8px] text-blue-500/60 uppercase">Ping</button>
        <button onMouseDown={() => executeRobotCommand('/move?dir=bwd')} onMouseUp={() => executeRobotCommand('/move?dir=stop')} className="h-8 text-[9px] bg-zinc-900/80 text-zinc-400 uppercase">↓ Reverse</button>
        <button onClick={runConnectivityDiagnostic} className="h-8 text-[8px] text-amber-500/60 uppercase underline font-bold">Debug</button>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2 bg-black/60 shrink-0">
        <button 
          onClick={() => setIsAiActive(!isAiActive)} 
          className={`py-3.5 font-bold uppercase text-[11px] tracking-[0.2em] border shadow-2xl transition-all ${isAiActive ? 'bg-orange-600/40 border-orange-500 text-orange-200 animate-pulse' : 'bg-cyan-600 border-transparent text-black'}`}
        >
          {isAiActive ? 'Kill Vision' : 'Engage Vision'}
        </button>
        <button 
          onClick={() => setIsLiveActive(!isLiveActive)} 
          className={`py-3.5 font-bold uppercase text-[11px] tracking-[0.2em] border transition-all ${isLiveActive ? 'bg-magenta-900/40 border-magenta-500 text-white animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
        >
          {isLiveActive ? 'Kill Brain' : 'Link Brain'}
        </button>
      </div>

      <div className="flex-grow flex flex-col min-h-0 border-t border-white/5 bg-zinc-950/40">
        <div className="flex bg-zinc-900/30">
          <button onClick={() => setActiveTab('tuning')} className={`flex-1 py-2.5 text-[9px] uppercase font-bold ${activeTab === 'tuning' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>Tuning</button>
          <button onClick={() => setActiveTab('prompt')} className={`flex-1 py-2.5 text-[9px] uppercase font-bold ${activeTab === 'prompt' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>Pilot</button>
          <button onClick={() => setActiveTab('diag')} className={`flex-1 py-2.5 text-[9px] uppercase font-bold ${activeTab === 'diag' ? 'bg-cyan-500/10 text-cyan-400 border-b-2 border-b-cyan-500' : 'text-zinc-600'}`}>Memory</button>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              {[
                { label: 'FWD POWER', key: 'speed', min: 0, max: 255 },
                { label: 'TURN POWER', key: 'turnSpeed', min: 0, max: 255 },
                { label: 'PULSE MS', key: 'turnMs', min: 100, max: 2000 },
                { label: 'SAFE OBST', key: 'safeDist', min: 10, max: 100 },
                { label: 'PULSE CYCLE', key: 'cycle', min: 500, max: 10000 }
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase">{s.label}</span>
                    <span className="text-[10px] font-mono text-cyan-500">{tuning[s.key as keyof typeof tuning]}</span>
                  </div>
                  <input 
                    type="range" 
                    min={s.min} max={s.max} 
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
              <select value={model} onChange={(e) => setModel(e.target.value)} className="text-[10px] py-1.5 bg-black border-zinc-800 text-zinc-400 font-mono">
                <option value="gemini-robotics-er-1.5-preview">Robotics v1.5</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              </select>
              <textarea 
                value={prompt} 
                onChange={(e) => setPrompt(e.target.value)} 
                className="flex-grow text-[10px] bg-black/60 border-zinc-900 p-3 font-mono text-zinc-400 leading-relaxed resize-none rounded-lg"
              />
            </div>
          )}

          {activeTab === 'diag' && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-zinc-900/60 border border-white/5 text-[10px]">
                 <span className="text-zinc-600 block mb-1 uppercase font-bold tracking-tighter">Current Objective</span>
                 <div className="text-zinc-100 font-mono italic">"{mission}"</div>
              </div>
              <div className="p-3 rounded bg-zinc-900/60 border border-white/5 text-[10px]">
                 <span className="text-zinc-600 block mb-1 uppercase font-bold tracking-tighter">Memory Storage</span>
                 {Object.keys(orders).length === 0 ? <div className="text-zinc-700 italic">No orders logged.</div> : 
                   Object.entries(orders).map(([k, v]) => (
                     <div key={k} className="text-cyan-400 flex justify-between border-b border-white/5 py-1">
                       <span>Table {k}</span>
                       <span className="text-zinc-500">{v}</span>
                     </div>
                   ))
                 }
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-black border-t border-white/10 h-32 flex flex-col shrink-0 overflow-hidden shadow-2xl">
         <div className="px-3 py-1.5 bg-zinc-900 border-b border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest font-bold">Telemetry Buffer</span>
            <button onClick={() => setLogs([])} className="text-[8px] text-zinc-600 hover:text-zinc-400 font-bold uppercase">Flush</button>
         </div>
         <div className="flex-grow p-2 font-mono text-[9px] leading-tight overflow-y-auto custom-scrollbar">
            {logs.length === 0 ? (
               <div className="text-zinc-800 italic mt-6 text-center">System Idle. Waiting for packets...</div>
            ) : (
               logs.map((l, i) => (
                  <div key={i} className={`mb-1 break-all ${l.includes('[ERR]') || l.includes('[BLOCK]') ? 'text-red-400 font-bold' : l.includes('[PILOT]') ? 'text-green-400' : l.includes('[DIAG]') ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                     {l}
                  </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}
