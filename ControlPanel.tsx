
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
  MissionStateAtom
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
  const [orders, setOrders] = useAtom(OrderStorageAtom);
  const [mission] = useAtom(MissionStateAtom);

  const sendRobotCmd = async (endpoint: string) => {
    try {
      await fetch(`http://${ip}${endpoint}`, { mode: 'no-cors' });
      return true;
    } catch (e) { return false; }
  };

  return (
    <div className="flex flex-col gap-3 pb-4 h-full">
      {/* Core Setup */}
      <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
        <div className="flex flex-col gap-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Robot IP</label>
          <input type="text" value={ip} onChange={(e) => setIp(e.target.value)} className="text-[10px] py-1 bg-black/60 border-zinc-800" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[8px] text-zinc-500 uppercase font-bold">Nav Model</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="text-[10px] py-1 bg-black/60 border-zinc-800">
             <option value="gemini-robotics-er-1.5-preview">Robotics 1.5</option>
             <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
             <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash</option>
          </select>
        </div>
      </div>

      {/* Manual D-PAD */}
      <div className="grid grid-cols-3 gap-1 shrink-0 p-1 bg-zinc-900/50 rounded-lg">
        <button onMouseDown={() => sendRobotCmd('/move?dir=left')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 text-xs hover:bg-zinc-700">LEFT</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=fwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 font-bold bg-zinc-800">FWD</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=right')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-12 text-xs hover:bg-zinc-700">RIGHT</button>
        <button onClick={() => sendRobotCmd('/move?dir=left&speed=150')} className="h-10 text-[9px] bg-zinc-900">SPIN L</button>
        <button onClick={() => sendRobotCmd('/move?dir=stop')} className="h-10 bg-red-900/40 border-red-700 text-red-500 font-bold text-xs">HALT</button>
        <button onClick={() => sendRobotCmd('/move?dir=right&speed=150')} className="h-10 text-[9px] bg-zinc-900">SPIN R</button>
        <button onClick={() => sendRobotCmd('/mode?val=hold')} className="h-10 text-[8px] bg-zinc-950">HOLD</button>
        <button onMouseDown={() => sendRobotCmd('/move?dir=bwd')} onMouseUp={() => sendRobotCmd('/move?dir=stop')} className="h-10 bg-zinc-800">BWD</button>
        <button onClick={() => setLogs([])} className="h-10 text-[8px] bg-zinc-950">CLR LOG</button>
      </div>

      {/* Prompt / Context Editor */}
      <div className="bg-zinc-900/30 p-2 rounded-lg border border-white/5 flex flex-col gap-2">
         <div className="flex justify-between items-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold">System Directive</span>
            <button onClick={() => setIsThinking(!isThinking)} className={`text-[8px] px-2 py-0.5 rounded ${isThinking ? 'bg-cyan-900 text-cyan-400' : 'bg-zinc-800'}`}>
              THINKING: {isThinking ? 'ON' : 'OFF'}
            </button>
         </div>
         <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full text-[10px] h-20 bg-black/40 border-white/5 resize-none font-mono leading-tight" />
         
         <div className="flex flex-col gap-1">
            <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-tight">Hardware Context</span>
            <input value={hw} onChange={(e) => setHw(e.target.value)} className="w-full text-[9px] py-1 bg-black/40 border-white/5 font-mono" />
         </div>
      </div>

      {/* Action Toggles */}
      <div className="flex flex-col gap-2">
        <button onClick={() => setIsAiActive(!isAiActive)} className={`py-3 font-bold uppercase text-[10px] tracking-widest transition-all ${isAiActive ? 'bg-orange-600 border-orange-400 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
          {isAiActive ? '🛑 DISENGAGE VISION PILOT' : '🚀 ENGAGE VISION PILOT'}
        </button>
        <button onClick={() => setIsLiveActive(!isLiveActive)} className={`py-4 font-bold uppercase text-xs tracking-[0.2em] shadow-lg transition-all ${isLiveActive ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse' : 'bg-[var(--accent-color)] border-[var(--accent-color)] text-black'}`}>
          {isLiveActive ? '🛑 STOP BRAIN SYNC' : '🧠 CONNECT LIVE BRAIN'}
        </button>
      </div>

      {/* Memory & Orders */}
      <div className="bg-black/60 p-3 rounded-lg border border-zinc-800 min-h-[120px] flex flex-col">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-1 mb-2">
           <span className="text-[9px] text-zinc-500 uppercase font-bold">Robot Memory</span>
           <span className="text-[10px] text-cyan-400 font-mono italic">{mission}</span>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {Object.keys(orders).length > 0 ? (
            Object.entries(orders).map(([tbl, items]) => (
              <div key={tbl} className="flex justify-between items-center text-[10px] bg-white/5 px-2 py-1 rounded">
                <span className="text-zinc-400">Table {tbl}:</span>
                <span className="text-cyan-100 font-bold">{items}</span>
              </div>
            ))
          ) : <div className="text-[9px] text-zinc-600 italic mt-2">No active orders in table memory.</div>}
        </div>
      </div>

      {/* Reasoning Log */}
      <div className="bg-black/80 p-2 rounded-lg border border-cyan-900/30 font-mono text-[10px] flex flex-col">
          <span className="text-[8px] text-cyan-500 uppercase mb-1 font-bold">Neural Output</span>
          <div className="text-cyan-200 leading-tight h-16 overflow-y-auto custom-scrollbar">
            {thought || 'Robot idle. Awaiting command...'}
          </div>
      </div>

      {/* System Logs */}
      <div className="flex-grow min-h-[100px] bg-black/90 p-2 rounded-lg border border-white/5 font-mono text-[9px] overflow-y-auto flex flex-col-reverse custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className={`mb-1 leading-tight ${log.includes('ERR') ? 'text-red-400' : log.includes('PILOT') ? 'text-orange-400' : 'text-zinc-500'}`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}
