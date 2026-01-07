
import {useAtom} from 'jotai';
import React from 'react';
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
  ActionHistoryAtom,
  HardwareContextAtom,
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
  const [hw, setHw] = useAtom(HardwareContextAtom);
  const [model, setModel] = useAtom(SelectedModelAtom);
  const [isThinking, setIsThinking] = useAtom(IsThinkingEnabledAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const sendRobotCmd = async (endpoint: string) => {
    try {
      await fetch(`http://${ip}${endpoint}`, { mode: 'no-cors' });
      return true;
    } catch (e) { return false; }
  };

  const openKeyManager = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
  };

  return (
    <div className="flex flex-col gap-3 pb-6 h-full min-h-0 overflow-y-auto custom-scrollbar">
      {/* 1. Global Project Access */}
      <div className="bg-cyan-950/20 border border-cyan-500/30 p-2 rounded flex justify-between items-center">
        <span className="text-[9px] text-cyan-400 uppercase font-bold tracking-widest">API Project Link</span>
        <button onClick={openKeyManager} className="text-[8px] px-3 py-1 bg-cyan-900 border-cyan-500/50 hover:bg-cyan-800 transition-colors">
          SWITCH API KEY
        </button>
      </div>

      {/* 2. Core Config */}
      <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
        <div className="flex flex-col gap-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Target IP</label>
          <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="text-[10px] py-1 bg-black/60 border-zinc-800" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Pilot Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="text-[10px] py-1 bg-black/60 border-zinc-800">
             <option value="gemini-robotics-er-1.5-preview">Robotics 1.5 (PROD)</option>
             <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
             <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash</option>
          </select>
        </div>
      </div>

      {/* 3. Tactical Controller */}
      <div className="grid grid-cols-3 gap-1 shrink-0 p-1 bg-zinc-900/40 rounded-lg">
        <button onMouseDown={() => sendRobotCmd('/move?dir=left')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 text-xs">LEFT</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=fwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 font-bold bg-zinc-800 border-zinc-700">FWD</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=right')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 text-xs">RIGHT</button>
        <button onClick={() => sendRobotCmd('/move?dir=left&speed=150')} className="h-10 text-[9px] bg-zinc-900 border-zinc-800 text-zinc-400">SPIN L</button>
        <button onClick={() => sendRobotCmd('/move?dir=stop')} className="h-10 bg-red-950/60 border-red-500/50 text-red-500 font-bold text-xs shadow-[0_0_10px_rgba(255,0,0,0.2)]">HALT</button>
        <button onClick={() => sendRobotCmd('/move?dir=right&speed=150')} className="h-10 text-[9px] bg-zinc-900 border-zinc-800 text-zinc-400">SPIN R</button>
        <button onClick={() => sendRobotCmd('/mode?val=auto')} className="h-10 text-[8px] bg-blue-900/30 border-blue-500/40 text-blue-400">AUTO-NAV</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=bwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-10 bg-zinc-800 border-zinc-700">BWD</button>
        <button onClick={() => setLogs([])} className="h-10 text-[8px] bg-black">RESET LOGS</button>
      </div>

      {/* 4. Cognitive Setup */}
      <div className="bg-zinc-900/30 p-2 rounded-lg border border-white/5 flex flex-col gap-2">
         <div className="flex justify-between items-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">System Directive</span>
            <button onClick={() => setIsThinking(!isThinking)} className={`text-[8px] px-2 py-0.5 rounded transition-all ${isThinking ? 'bg-cyan-900 text-cyan-400 border border-cyan-500' : 'bg-zinc-800 border border-transparent'}`}>
              THINKING: {isThinking ? 'ENABLED' : 'DISABLED'}
            </button>
         </div>
         <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full text-[10px] h-24 bg-black/40 border-white/5 resize-none font-mono leading-tight p-2 rounded" />
         
         <div className="flex flex-col gap-1">
            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">Perceived Hardware</span>
            <input value={hw} onChange={(e) => setHw(e.target.value)} className="w-full text-[9px] py-1 bg-black/40 border-white/5 font-mono px-2" />
         </div>
      </div>

      {/* 5. Execution Toggles */}
      <div className="flex flex-col gap-2">
        <button onClick={() => setIsAiActive(!isAiActive)} className={`py-3 font-bold uppercase text-[10px] tracking-widest transition-all border ${isAiActive ? 'bg-orange-600/20 border-orange-500 text-orange-200 shadow-[0_0_15px_rgba(234,88,12,0.1)]' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
          {isAiActive ? '🛑 STOP VISION PILOT' : '🚀 ENGAGE VISION PILOT'}
        </button>
        <button onClick={() => setIsLiveActive(!isLiveActive)} className={`py-4 font-bold uppercase text-xs tracking-[0.2em] shadow-lg transition-all border ${isLiveActive ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse' : 'bg-[var(--accent-color)] border-transparent text-black'}`}>
          {isLiveActive ? '🛑 STOP CONCIERGE' : '🧠 CONNECT LIVE BRAIN'}
        </button>
      </div>

      {/* 6. Persistent Memory */}
      <div className="bg-black/60 p-3 rounded-lg border border-zinc-800 min-h-[140px] flex flex-col gap-2">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
           <span className="text-[9px] text-zinc-500 uppercase font-bold">Memory Cluster</span>
           <span className="text-[10px] text-cyan-400 font-mono tracking-tighter">{mission}</span>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
          {Object.keys(orders).length > 0 ? (
            Object.entries(orders).map(([tbl, items]) => (
              <div key={tbl} className="flex justify-between items-center text-[10px] bg-cyan-900/10 border border-cyan-500/10 px-2 py-1.5 rounded">
                <span className="text-zinc-500 font-mono">T{tbl} ORDER:</span>
                <span className="text-cyan-100 font-bold">{items}</span>
              </div>
            ))
          ) : <div className="text-[9px] text-zinc-600 italic mt-4 text-center">Neural memory buffer empty...</div>}
        </div>
      </div>

      {/* 7. Logic HUD */}
      <div className="bg-black/80 p-2 rounded-lg border border-cyan-950 font-mono text-[10px] flex flex-col gap-1">
          <span className="text-[8px] text-cyan-500 uppercase font-bold">Thinking Process</span>
          <div className="text-cyan-200 leading-tight h-20 overflow-y-auto custom-scrollbar pr-1">
            {thought || 'System idle. Waiting for sensors...'}
          </div>
      </div>
    </div>
  );
}
