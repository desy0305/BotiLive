import {useState} from 'react';
import {useAtom} from 'jotai';
import {
  IsAiActiveAtom,
  IsLiveActiveAtom,
  HasGeminiKeyAtom,
  LogsAtom,
  MissionStateAtom,
  OrderStorageAtom,
  RobotAddressAtom,
  SelectedModelAtom,
  SystemPromptAtom,
  TuningParamsAtom,
} from '../../state/atoms';
import {VISION_MODEL_OPTIONS} from '../../shared/models';
import type {RobotDirection} from '../../types/api';
import {moveRobot} from './api';

const protocols = [
  {id: 'Standby', label: 'Pause'},
  {id: 'Autopilot', label: 'Auto'},
  {id: 'Patrol', label: 'Patrol'},
  {id: 'Security Bot', label: 'Guard'},
  {id: 'Vision Guided', label: 'Vision'},
  {id: 'AI Live Control', label: 'Live'},
];

export function ControlPanel() {
  const [address, setAddress] = useAtom(RobotAddressAtom);
  const [isAiActive, setIsAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive, setIsLiveActive] = useAtom(IsLiveActiveAtom);
  const [hasGeminiKey] = useAtom(HasGeminiKeyAtom);
  const [logs, setLogs] = useAtom(LogsAtom);
  const [tuning, setTuning] = useAtom(TuningParamsAtom);
  const [prompt, setPrompt] = useAtom(SystemPromptAtom);
  const [model, setModel] = useAtom(SelectedModelAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [mission, setMission] = useAtom(MissionStateAtom);

  const [activeTab, setActiveTab] = useState<'tuning' | 'kernel' | 'memory'>('tuning');

  const updateTuning = (key: keyof typeof tuning, val: number) => {
    setTuning((prev) => ({...prev, [key]: val}));
  };

  const executeRobotCommand = async (dir: RobotDirection, speed?: number, durationMs?: number) => {
    const started = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${started}] [API] POST /api/robot/move dir=${dir} speed=${speed ?? 0} duration=${durationMs ?? 0}`, ...prev].slice(0, 160));
    try {
      const response = await moveRobot(address, dir, speed, durationMs);
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] [ROBOT] ${dir.toUpperCase()} ${response.ok ? 'accepted' : 'failed'} ${
          response.trace ? `req=${response.trace.requestId} ${response.trace.latencyMs}ms` : ''
        }`,
        ...prev,
      ].slice(0, 160));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLogs((prev) => [`[${new Date().toLocaleTimeString()}] [ERR] ${message}`, ...prev].slice(0, 160));
    }
  };

  const logClass = (line: string) => {
    if (line.includes('[ERR]')) return 'text-red-400 border-red-900/60 bg-red-950/10';
    if (line.includes('[LLM') || line.includes('[LIVE_LLM]')) return 'text-fuchsia-300 border-fuchsia-900/60 bg-fuchsia-950/10';
    if (line.includes('[API]') || line.includes('[LIVE_API]')) return 'text-sky-300 border-sky-900/60 bg-sky-950/10';
    if (line.includes('[ROBOT]') || line.includes('[PILOT]') || line.includes('[LIVE_AI]')) return 'text-emerald-300 border-emerald-900/60 bg-emerald-950/10';
    if (line.includes('[CORE]')) return 'text-cyan-300 border-cyan-900/60 bg-cyan-950/10';
    return 'text-zinc-500 border-zinc-800 bg-zinc-950/30';
  };

  return (
    <div className="flex flex-col bg-zinc-950/80 rounded-xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-md">
      <div className="p-3 border-b border-white/10 bg-zinc-900/40 space-y-3 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded border px-2 py-1.5 ${hasGeminiKey ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            <div className="text-[7px] uppercase text-zinc-500 font-black">Gemini</div>
            <div className="text-[9px] uppercase font-black">{hasGeminiKey ? 'Ready' : 'Missing'}</div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${isAiActive ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' : 'border-zinc-800 bg-black/30 text-zinc-500'}`}>
            <div className="text-[7px] uppercase text-zinc-500 font-black">Vision</div>
            <div className="text-[9px] uppercase font-black">{isAiActive ? 'Active' : 'Idle'}</div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${isLiveActive ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300' : 'border-zinc-800 bg-black/30 text-zinc-500'}`}>
            <div className="text-[7px] uppercase text-zinc-500 font-black">Live</div>
            <div className="text-[9px] uppercase font-black">{isLiveActive ? 'Linked' : 'Offline'}</div>
          </div>
        </div>

        <div className="flex gap-2 text-left">
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest px-1">Autonomy Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full text-[10px] bg-black border-zinc-800 text-cyan-400 py-1.5 px-2 rounded font-mono focus:border-cyan-500 outline-none appearance-none"
            >
              {VISION_MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
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
          <button
            disabled={!hasGeminiKey}
            onClick={() => setIsAiActive(!isAiActive)}
            className={`py-2.5 rounded font-black uppercase text-[9px] border transition-all ${
              isAiActive
                ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse'
                : 'bg-cyan-600 border-transparent text-black hover:bg-cyan-500'
            }`}
          >
            {!hasGeminiKey ? 'Set Gemini Key' : isAiActive ? 'Vision Pilot Active' : 'Start Vision Pilot'}
          </button>
          <button
            disabled={!hasGeminiKey}
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`py-2.5 rounded font-black uppercase text-[9px] border transition-all ${
              isLiveActive
                ? 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'
            }`}
          >
            {!hasGeminiKey ? 'Key Required' : isLiveActive ? 'Live Brain Linked' : 'Link Live Brain'}
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-white/5 bg-black/20 shrink-0 text-left">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block px-1 text-left">Operational Missions</span>
        <div className="grid grid-cols-3 gap-1.5">
          {protocols.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setMission(p.id);
                setLogs((prev) => [`[${new Date().toLocaleTimeString()}] [CORE] PROTOCOL -> ${p.id.toUpperCase()}`, ...prev].slice(0, 100));
              }}
              className={`py-2.5 rounded-lg flex flex-col items-center justify-center border transition-all duration-300 ${
                mission === p.id ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300' : 'bg-zinc-900/30 border-white/5 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-tight text-center px-1 leading-none">{p.label}</span>
              <span className="mt-1 text-[7px] text-zinc-500 uppercase">{p.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-zinc-950/60 shrink-0 border-b border-white/5 flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px]">
          <div />
          <button
            onMouseDown={() => void executeRobotCommand('fwd', tuning.speed)}
            onMouseUp={() => void executeRobotCommand('stop')}
            className="h-12 bg-zinc-800 border border-zinc-600 rounded-lg active:bg-zinc-700 flex items-center justify-center text-xs font-black shadow-lg"
          >
            FWD
          </button>
          <div />

          <button
            onMouseDown={() => void executeRobotCommand('left', tuning.turnSpeed)}
            onMouseUp={() => void executeRobotCommand('stop')}
            className="h-12 bg-zinc-900 border border-white/5 text-zinc-400 rounded-lg active:bg-zinc-800 flex items-center justify-center text-xs font-black"
          >
            L
          </button>
          <button
            onMouseDown={() => void executeRobotCommand('bwd', tuning.speed)}
            onMouseUp={() => void executeRobotCommand('stop')}
            className="h-12 bg-zinc-800 border border-zinc-600 rounded-lg active:bg-zinc-700 flex items-center justify-center text-xs font-black"
          >
            BWD
          </button>
          <button
            onMouseDown={() => void executeRobotCommand('right', tuning.turnSpeed)}
            onMouseUp={() => void executeRobotCommand('stop')}
            className="h-12 bg-zinc-900 border border-white/5 text-zinc-400 rounded-lg active:bg-zinc-800 flex items-center justify-center text-xs font-black"
          >
            R
          </button>

          <button
            onClick={() => void executeRobotCommand('stop')}
            className="col-span-3 mt-3 h-11 bg-red-600 border border-red-400 text-white text-[10px] font-black uppercase rounded-lg shadow-xl active:scale-95 transition-all"
          >
            STOP ENGINE
          </button>
        </div>
      </div>

      <div className="flex flex-col shrink-0 border-b border-white/10">
        <div className="flex bg-zinc-900/80 shrink-0">
          {(['tuning', 'kernel', 'memory'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[9px] uppercase font-black tracking-widest transition-all ${
                activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="h-64 overflow-y-auto custom-scrollbar p-4 bg-zinc-950/20 text-left">
          {activeTab === 'tuning' && (
            <div className="space-y-5">
              {[
                {label: 'DRIVE VELOCITY', key: 'speed', min: 0, max: 255},
                {label: 'TURN VELOCITY', key: 'turnSpeed', min: 0, max: 255},
                {label: 'SYNC FREQUENCY (MS)', key: 'cycle', min: 500, max: 10000},
                {label: 'SAFE DISTANCE (CM)', key: 'safeDist', min: 10, max: 100},
                {label: 'THINKING BUDGET', key: 'thinkingBudget', min: 0, max: 24576},
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">{s.label}</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-black px-1.5 py-0.5 rounded">
                      {tuning[s.key as keyof typeof tuning]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    value={tuning[s.key as keyof typeof tuning]}
                    onChange={(e) => updateTuning(s.key as keyof typeof tuning, Number(e.target.value))}
                    className="w-full h-1.5 accent-cyan-500 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              ))}
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
                {Object.keys(orders).length === 0 ? (
                  <div className="text-zinc-800 italic text-[9px] py-4 text-center">Neural buffer empty.</div>
                ) : (
                  Object.entries(orders).map(([k, v]) => (
                    <div key={k} className="text-[10px] text-zinc-300 flex justify-between items-center border-b border-white/5 py-2.5 last:border-0">
                      <span className="text-zinc-500 font-bold uppercase text-[7px] tracking-widest">LOC_{k}</span>
                      <span className="text-cyan-500 font-mono font-bold">{v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-black flex flex-col min-h-[300px] max-h-[520px]">
        <div className="px-3 py-2 bg-zinc-900/60 flex justify-between items-center border-b border-white/5">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.25em]">API + LLM Event Stream</span>
          <button onClick={() => setLogs([])} className="text-[8px] text-zinc-600 hover:text-white uppercase font-bold">
            Flush
          </button>
        </div>
        <div className="grow p-3 font-mono text-[9px] leading-[1.55] overflow-y-auto custom-scrollbar flex flex-col-reverse text-left gap-1">
          {logs.map((l, i) => (
            <div
              key={`${i}-${l}`}
              className={`rounded-sm px-2 py-1 border-l-2 break-words transition-all ${logClass(l)}`}
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
