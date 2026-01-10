
import {useAtom} from 'jotai';
import React, {useEffect, useRef} from 'react';
import {Content} from './Content';
import {ControlPanel} from './ControlPanel';
import {LiveAudioHandler} from './LiveAudioHandler';
import {
  IsAiActiveAtom,
  IsLiveActiveAtom,
  RobotAddressAtom,
  RobotDistanceAtom,
  RobotModeAtom,
  SystemPromptAtom,
  AiThoughtAtom,
  SelectedModelAtom,
  TuningParamsAtom,
  LogsAtom,
  ActionHistoryAtom,
  HardwareContextAtom,
  MissionStateAtom,
  OrderStorageAtom,
  HasApiKeySelectedAtom
} from './atoms';
import {GoogleGenAI, Type} from '@google/genai';

function App() {
  const [isAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive] = useAtom(IsLiveActiveAtom);
  const [address] = useAtom(RobotAddressAtom);
  const [distance, setDistance] = useAtom(RobotDistanceAtom);
  const [, setMode] = useAtom(RobotModeAtom);
  const [prompt] = useAtom(SystemPromptAtom);
  const [hwContext] = useAtom(HardwareContextAtom);
  const [thought, setThought] = useAtom(AiThoughtAtom);
  const [model] = useAtom(SelectedModelAtom);
  const [tuning] = useAtom(TuningParamsAtom);
  const [, setLogs] = useAtom(LogsAtom);
  const [, setHistory] = useAtom(ActionHistoryAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const aiRef = useRef(isAiActive);
  const addressRef = useRef(address);
  const missionRef = useRef(mission);
  const distRef = useRef(distance);
  
  useEffect(() => { aiRef.current = isAiActive; }, [isAiActive]);
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { missionRef.current = mission; }, [mission]);
  useEffect(() => { distRef.current = distance; }, [distance]);

  const getBaseUrl = () => {
    let raw = addressRef.current.trim().replace(/^https?:\/\//, '');
    const proto = window.location.protocol === 'https:' ? 'https://' : 'http://';
    return `${proto}${raw}`.replace(/\/$/, '');
  };

  // Telemetry Polling
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!addressRef.current) return;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${getBaseUrl()}/status`, { 
          method: 'GET',
          signal: controller.signal, 
          mode: 'cors',
          cache: 'no-store'
        });
        clearTimeout(id);
        if (res.ok) {
          const data = await res.json();
          if (data.d !== undefined) setDistance(data.d);
          if (data.m !== undefined) setMode(data.m);
        }
      } catch(e) {}
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Vision Pilot Cycle
  useEffect(() => {
    if (!isAiActive) return;
    let cycleTimer: any;
    
    async function runVisionPulse() {
      if (!aiRef.current) return;
      const video = document.querySelector('video');
      if (!video) { cycleTimer = setTimeout(runVisionPulse, 1000); return; }

      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const context = `
          EVA NAV UNIT ACTIVE.
          HW: ${hwContext}
          CURRENT MISSION: ${missionRef.current}
          MEMORY: ${JSON.stringify(orders)}
          DISTANCE: ${distRef.current}cm
          LOGIC: If mission != 'Standby', be AGGRESSIVE in reaching goal.
          SAFE: Dist < ${tuning.safeDist} -> STOP.
        `;

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: context }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] },
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reasoning: { type: Type.STRING },
                command: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              },
              required: ["reasoning", "command", "confidence"]
            }
          }
        });

        const decision = JSON.parse(response.text || '{}');
        setThought(decision.reasoning);
        const cmd = decision.command?.toLowerCase() || 'stop';

        if (cmd !== 'stop' && decision.confidence > 0.45) {
          setLogs(prev => [`[PILOT] NAVIGATING: ${cmd.toUpperCase()} (Confidence: ${Math.round(decision.confidence*100)}%)`, ...prev].slice(0, 100));
          const baseS = cmd === 'fwd' ? tuning.speed : tuning.turnSpeed;
          const finalS = Math.max(tuning.minPower, Math.round(baseS * (0.6 + decision.confidence * 0.4)));
          
          fetch(`${getBaseUrl()}/move?dir=${cmd}&speed=${finalS}`, { mode: 'no-cors' }).catch(() => {});
          setTimeout(() => fetch(`${getBaseUrl()}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), tuning.turnMs);
        }
      } catch (err: any) {
        setLogs(prev => [`[PILOT ERR] Cycle failed: ${err.message}`, ...prev].slice(0, 100));
      } finally {
        if (aiRef.current) cycleTimer = setTimeout(runVisionPulse, tuning.cycle);
      }
    }

    runVisionPulse();
    return () => clearTimeout(cycleTimer);
  }, [isAiActive, model, tuning, orders]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-[#e4e4e7] p-2 gap-2 overflow-hidden font-['Space_Mono'] selection:bg-cyan-500/30">
      <header className="flex justify-between items-center bg-zinc-900/60 px-4 py-2 rounded-lg border border-white/5 shadow-xl shrink-0">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-cyan-400">
                <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#00e5ff] animate-pulse" />
                <h1 className="text-[10px] font-bold tracking-widest uppercase">EVA SYSTEM</h1>
             </div>
             <div className="hidden md:block px-2 py-0.5 bg-zinc-800/50 rounded border border-white/5 text-[9px] text-zinc-500 font-mono">
               OBJ: {mission}
             </div>
          </div>
          <div className="flex items-center gap-3">
             {isLiveActive && <LiveAudioHandler />}
             <div className={`text-[8px] font-mono px-2 py-1 rounded border ${window.location.protocol === 'https:' ? 'border-cyan-500/20 text-cyan-500' : 'border-orange-500/20 text-orange-500'}`}>
                {window.location.protocol === 'https:' ? 'HTTPS OK' : 'INSECURE'}
             </div>
          </div>
      </header>

      <main className="flex flex-col lg:flex-row grow gap-2 overflow-hidden min-h-0">
        <section className="flex-[0.5] flex flex-col min-w-0 h-full">
          <div className="grow relative bg-black rounded border border-white/5 overflow-hidden shadow-2xl">
            <Content />
          </div>
          <div className="mt-2 bg-zinc-950 border border-cyan-900/20 rounded p-2 shrink-0 h-20 overflow-y-auto custom-scrollbar">
             <p className="text-[10px] font-mono text-cyan-400/80 leading-tight italic">
               {thought || 'EVA Kernel: Standing by for optical sync...'}
             </p>
          </div>
        </section>

        <section className="flex-[0.5] min-w-0 h-full overflow-y-auto custom-scrollbar">
           <ControlPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
