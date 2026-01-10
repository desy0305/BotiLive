
import {useAtom} from 'jotai';
import React, {useEffect, useRef, useState} from 'react';
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
  HardwareContextAtom,
  MissionStateAtom,
  OrderStorageAtom,
  HasApiKeySelectedAtom
} from './atoms';
import {GoogleGenAI, Type} from '@google/genai';

// Removed explicit window.aistudio declaration as it is already defined by the environment
// and was causing a conflict with existing AIStudio type definitions.

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
  const [mission] = useAtom(MissionStateAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [hasKey, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const aiRef = useRef(isAiActive);
  const addressRef = useRef(address);
  const missionRef = useRef(mission);
  const distRef = useRef(distance);
  
  useEffect(() => { aiRef.current = isAiActive; }, [isAiActive]);
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { missionRef.current = mission; }, [mission]);
  useEffect(() => { distRef.current = distance; }, [distance]);

  // Handle API Key Requirement
  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - aistudio is globally available but might not be in the standard Window type in all environments
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();
  }, [setHasKey]);

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
        const id = setTimeout(() => controller.abort(), 1500);
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
  }, [setDistance, setMode]);

  // Vision Pilot Cycle
  useEffect(() => {
    if (!isAiActive) return;
    let cycleTimer: any;
    
    async function runVisionPulse() {
      if (!aiRef.current) return;
      
      if (missionRef.current === 'Standby') {
        setThought("EVA PILOT: Core in STANDBY. Monitoring for telemetry triggers...");
        cycleTimer = setTimeout(runVisionPulse, 2000);
        return;
      }

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
          CORE_PROMPT: ${prompt}
          HW: ${hwContext}
          PROTOCOL: ${missionRef.current}
          MEMORY: ${JSON.stringify(orders)}
          DISTANCE: ${distRef.current}cm
          SAFE_GAP: ${tuning.safeDist}cm
        `;

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: context }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] },
          config: {
            responseMimeType: "application/json",
            temperature: tuning.temperature,
            thinkingConfig: tuning.thinkingBudget > 0 ? { thinkingBudget: tuning.thinkingBudget } : undefined,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reasoning: { type: Type.STRING },
                command: { type: Type.STRING, description: "fwd, left, right, bwd, stop" },
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
          const time = new Date().toLocaleTimeString();
          setLogs(prev => [`[${time}] [PILOT] ${cmd.toUpperCase()} (${Math.round(decision.confidence*100)}%)`, ...prev].slice(0, 100));
          const baseS = (cmd === 'fwd' || cmd === 'bwd') ? tuning.speed : tuning.turnSpeed;
          const finalS = Math.max(tuning.minPower, Math.round(baseS * (0.6 + decision.confidence * 0.4)));
          
          fetch(`${getBaseUrl()}/move?dir=${cmd}&speed=${finalS}`, { mode: 'no-cors' }).catch(() => {});
          setTimeout(() => fetch(`${getBaseUrl()}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), tuning.turnMs);
        }
      } catch (err: any) {
        setLogs(prev => [`[ERR] Vision Cycle: ${err.message}`, ...prev].slice(0, 100));
      } finally {
        if (aiRef.current) cycleTimer = setTimeout(runVisionPulse, tuning.cycle);
      }
    }

    runVisionPulse();
    return () => clearTimeout(cycleTimer);
  }, [isAiActive, model, tuning, orders, prompt, setThought, setLogs]);

  if (!hasKey) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-8 text-center z-[100] font-['Space_Mono']">
        <div className="w-20 h-20 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mb-8" />
        <h2 className="text-2xl font-black text-cyan-400 mb-4 tracking-widest uppercase">Encryption Key Required</h2>
        <p className="text-zinc-400 max-w-md mb-8 text-sm leading-relaxed italic">
          EVA System requires a valid API key from a paid GCP project to establish neural link. 
          Please select your project to continue deployment.
        </p>
        <button 
          onClick={async () => {
            // @ts-ignore
            await window.aistudio.openSelectKey();
            setHasKey(true);
          }}
          className="bg-cyan-600 hover:bg-cyan-500 text-black px-12 py-4 rounded-full font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
        >
          Initialize Core
        </button>
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noreferrer"
          className="mt-6 text-[10px] text-zinc-600 hover:text-cyan-400 underline uppercase tracking-tighter"
        >
          Billing & Documentation
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020203] text-[#e4e4e7] p-2 md:p-4 gap-4 overflow-hidden font-['Space_Mono'] selection:bg-cyan-500/30">
      <header className="flex justify-between items-center bg-zinc-900/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2.5 text-cyan-400">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_15px_#00e5ff] animate-pulse" />
                <h1 className="text-xs font-black tracking-[0.2em] uppercase">EVA_OS_v2.5</h1>
             </div>
             <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5 text-[9px] text-cyan-500/80 font-mono">
               <span className="opacity-40 uppercase">OBJ:</span> {mission.toUpperCase()}
             </div>
          </div>
          <div className="flex items-center gap-4">
             {isLiveActive && <LiveAudioHandler />}
             <div className={`text-[8px] font-black px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-400 uppercase tracking-widest`}>
                Link: Secured
             </div>
          </div>
      </header>

      <main className="flex flex-col lg:flex-row grow gap-4 overflow-hidden min-h-0">
        <section className="flex-[0.6] flex flex-col min-w-0 h-full gap-3">
          <div className="grow relative bg-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
            <Content />
          </div>
          <div className="bg-zinc-950 border border-cyan-900/20 rounded-2xl p-4 shrink-0 h-28 overflow-y-auto custom-scrollbar shadow-inner relative">
             <div className="absolute top-2 right-3 text-[7px] text-cyan-500/30 font-bold uppercase tracking-widest">Neural_Thought_Stream</div>
             <p className="text-[11px] font-mono text-cyan-400/90 leading-relaxed italic pr-4">
               {thought || 'EVA Kernel: Neural link establishing. Standing by for optical sync...'}
             </p>
          </div>
        </section>

        <section className="flex-[0.4] min-w-[320px] h-full overflow-y-auto custom-scrollbar">
           <ControlPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
