
import {useAtom} from 'jotai';
import React, {useState} from 'react';
import {
  RobotIpAtom,
  IsAiActiveAtom,
  IsLiveActiveAtom,
  LogsAtom,
  TuningParamsAtom,
  RobotDistanceAtom,
  SystemPromptAtom,
  AiThoughtAtom,
  SelectedModelAtom,
  IsThinkingEnabledAtom,
  OrderStorageAtom,
  MissionStateAtom,
  HasApiKeySelectedAtom
} from './atoms';

export function ControlPanel() {
  const [ip, setIp] = useAtom(RobotIpAtom);
  const [isAiActive, setIsAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive, setIsLiveActive] = useAtom(IsLiveActiveAtom);
  const [logs, setLogs] = useAtom(LogsAtom);
  const [tuning, setTuning] = useAtom(TuningParamsAtom);
  const [thought] = useAtom(AiThoughtAtom);
  const [prompt, setPrompt] = useAtom(SystemPromptAtom);
  const [model, setModel] = useAtom(SelectedModelAtom);
  const [isThinking, setIsThinking] = useAtom(IsThinkingEnabledAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [hasKey, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const [expanded, setExpanded] = useState<string | null>('tuning');

  const updateTuning = (key: keyof typeof tuning, val: number) => {
    setTuning(prev => ({ ...prev, [key]: val }));
  };

  const sendRobotCmd = async (endpoint: string) => {
    setLogs(prev => [`[MANUAL] Attempting ${endpoint}...`, ...prev].slice(0, 50));
    try {
      await fetch(`http://${ip}${endpoint}`, { mode: 'no-cors' }).catch(() => {});
    } catch (e) {}
  };

  const openKeyManager = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    } else {
      setLogs(prev => [`[SYS] Key Selection not available in standalone mode. Using ENV.`, ...prev].slice(0, 50));
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-10">
      
      {/* 1. SECTION: Connection & Project */}
      <div className="bg-zinc-900/40 rounded border border-white/5 overflow-hidden">
        <button onClick={() => setExpanded(expanded === 'conn' ? null : 'conn')} className="w-full px-3 py-2 flex justify-between items-center hover:bg-white/5">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter flex items-center gap-2">
            🚀 Connection & Keys
          </span>
          <span className="text-xs">{expanded === 'conn' ? '▼' : '▶'}</span>
        </button>
        {expanded === 'conn' && (
          <div className="p-3 grid grid-cols-2 gap-3 border-t border-white/5">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] text-zinc-500 uppercase font-bold">Robot IP</label>
              <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="text-[10px] py-1 bg-black/60 border-zinc-800" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] text-zinc-500 uppercase font-bold">API Access</label>
              <button onClick={openKeyManager} className={`text-[9px] py-1 border transition-all ${!hasKey ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-cyan-900/20 border-cyan-500/40 text-cyan-400'}`}>
                {hasKey ? 'PROJECT SYNCED ✓' : 'SYNC PROJECT KEY'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECTION: Firmware Tuning */}
      <div className="bg-zinc-900/40 rounded border border-white/5 overflow-hidden">
        <button onClick={() => setExpanded(expanded === 'tuning' ? null : 'tuning')} className="w-full px-3 py-2 flex justify-between items-center hover:bg-white/5">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-tighter flex items-center gap-2">
            🛠️ Tuning (Firmware V8.2)
          </span>
          <span className="text-xs">{expanded === 'tuning' ? '▼' : '▶'}</span>
        </button>
        {expanded === 'tuning' && (
          <div className="p-3 flex flex-col gap-3 border-t border-white/5 bg-black/20">
            {[
              { label: 'FWD SPEED', key: 'speed', min: 0, max: 255 },
              { label: 'TURN SPEED', key: 'turnSpeed', min: 0, max: 255 },
              { label: 'TURN(MS)', key: 'turnMs', min: 100, max: 2000 },
              { label: 'MIN POWER', key: 'minPower', min: 0, max: 255 },
              { label: 'PULSE(MS)', key: 'pulseMs', min: 100, max: 5000 },
              { label: 'OBST(CM)', key: 'safeDist', min: 10, max: 100 },
              { label: 'AI SMOOTH', key: 'aiSmooth', min: 0, max: 100, unit: '%' },
              { label: 'AI TEMP', key: 'temperature', min: 0, max: 1, step: 0.1 },
              { label: 'CYCLE(MS)', key: 'cycle', min: 500, max: 10000 }
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <label className="text-[8px] text-zinc-400 font-bold w-16 shrink-0">{s.label}</label>
                <input 
                  type="range" 
                  min={s.min} max={s.max} step={s.step || 1} 
                  value={tuning[s.key as keyof typeof tuning]} 
                  onChange={(e) => updateTuning(s.key as keyof typeof tuning, Number(e.target.value))}
                  className="grow h-1 accent-cyan-500"
                />
                <span className="text-[10px] font-mono text-cyan-300 w-8 text-right">{tuning[s.key as keyof typeof tuning]}{s.unit || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Tactical Controller */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/60 rounded border border-white/10 mt-1">
        <button onMouseDown={() => sendRobotCmd('/move?dir=left')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-10 text-[10px] uppercase font-bold">Turn L</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=fwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-10 text-[10px] uppercase font-bold bg-zinc-800 border-zinc-600 tracking-widest text-white">↑ FWD</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=right')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-10 text-[10px] uppercase font-bold">Turn R</button>
        <button onClick={() => sendRobotCmd('/move?dir=left&speed=150')} className="h-9 text-[9px] text-zinc-500">← SPIN L</button>
        <button onClick={() => sendRobotCmd('/move?dir=stop')} className="h-9 bg-red-900/40 border-red-500 text-red-500 font-bold text-[10px] uppercase shadow-[0_0_10px_rgba(255,0,0,0.1)]">Stop</button>
        <button onClick={() => sendRobotCmd('/move?dir=right&speed=150')} className="h-9 text-[9px] text-zinc-500">SPIN R →</button>
        <button onClick={() => sendRobotCmd('/mode?val=hold')} className="h-9 text-[9px] uppercase">Hold</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=bwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-9 text-[10px] uppercase">↓ BWD</button>
        <button onClick={() => sendRobotCmd('/status')} className="h-9 text-[9px] uppercase text-blue-400">Status</button>
      </div>

      {/* 4. Cognitive Controls */}
      <div className="flex flex-col gap-2 mt-2">
        <button onClick={() => setIsAiActive(!isAiActive)} className={`py-4 font-bold uppercase text-[11px] tracking-[0.3em] transition-all border ${isAiActive ? 'bg-orange-600/30 border-orange-500 text-orange-200' : 'bg-cyan-600 text-white border-transparent shadow-[0_0_15px_rgba(0,229,255,0.2)]'}`}>
          {isAiActive ? '🛑 Terminate AI Wrapper' : '🚀 START AI WRAPPER'}
        </button>
        <button onClick={() => setIsLiveActive(!isLiveActive)} className={`py-3 font-bold uppercase text-[10px] tracking-widest transition-all border ${isLiveActive ? 'bg-magenta-900/40 border-magenta-500 text-white animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
          {isLiveActive ? '🛑 STOP BRAIN SYNC' : '🧠 CONNECT LIVE BRAIN'}
        </button>
      </div>

      {/* 5. Logs & Reasoning (The Black Box) */}
      <div className="bg-black border border-white/5 rounded-lg flex flex-col h-[280px] mt-2 overflow-hidden shadow-inner">
         <div className="px-3 py-1.5 bg-zinc-900/50 border-b border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-widest">Neural Logic Buffer</span>
            <button onClick={() => setLogs([])} className="text-[8px] text-zinc-600 hover:text-zinc-400 uppercase font-bold">Clear Logs</button>
         </div>
         <div className="flex-grow p-2 font-mono text-[9px] leading-tight overflow-y-auto custom-scrollbar bg-[rgba(0,0,0,0.4)]">
            {logs.length === 0 ? (
               <div className="text-zinc-800 italic mt-10 text-center">System Idle. Waiting for input frames...</div>
            ) : (
               logs.map((l, i) => (
                  <div key={i} className={`mb-1 ${l.includes('[ERR]') || l.includes('[CRITICAL]') ? 'text-red-400' : l.includes('[PILOT]') ? 'text-green-400' : 'text-zinc-500'}`}>
                     {l}
                  </div>
               ))
            )}
         </div>
      </div>

      {/* 6. System Prompt Edit */}
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[8px] text-zinc-600 uppercase font-bold">System Prompt (Editable)</span>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="bg-transparent border-none text-[9px] text-cyan-600 font-mono">
             <option value="gemini-robotics-er-1.5-preview">Robotics Preview (Default)</option>
             <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
          </select>
        </div>
        <textarea 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
          className="w-full text-[9px] h-32 bg-black/60 border-zinc-900 p-2 font-mono text-zinc-400 rounded leading-tight resize-none" 
        />
      </div>

    </div>
  );
}
