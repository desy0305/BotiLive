
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
  const [history, setHistory] = useAtom(ActionHistoryAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const aiRef = useRef(isAiActive);
  const addressRef = useRef(address);
  const historyRef = useRef(history);
  const distRef = useRef(distance);
  
  useEffect(() => { aiRef.current = isAiActive; }, [isAiActive]);
  useEffect(() => { addressRef.current = address; }, [address]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { distRef.current = distance; }, [distance]);

  // Utility for fetching from Robot Address
  const fetchRobot = async (endpoint: string) => {
    const fullUrl = addressRef.current.startsWith('http') ? `${addressRef.current}${endpoint}` : `http://${addressRef.current}${endpoint}`;
    try {
      const res = await fetch(fullUrl, { mode: 'cors', cache: 'no-store' }).catch(() => null);
      return res;
    } catch (e) { return null; }
  };

  // Status Polling
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!addressRef.current) return;
      const res = await fetchRobot('/status');
      if (res) {
        try {
          const data = await res.json();
          setDistance(data.d);
          setMode(data.m);
        } catch(e) {}
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Reactive Vision Cycle
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
        const hybridContext = `${prompt}\n${hwContext}\nSTATE: Distance=${distRef.current}cm, Mission=${mission}, Orders=${JSON.stringify(orders)}`;

        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: hybridContext }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] },
          config: {
            responseMimeType: "application/json",
            temperature: tuning.temperature,
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

        // Log before move
        const logMsg = `[PILOT] CMD: ${cmd.toUpperCase()} (${(decision.confidence * 100).toFixed(0)}%) | ${decision.reasoning.substring(0, 40)}...`;
        setLogs(prev => [logMsg, ...prev].slice(0, 50));

        if (cmd !== 'stop' && distRef.current > 15) {
          setHistory(prev => [...prev, cmd].slice(-10));
          const aiSpeed = Math.round(tuning.speed * (0.4 + decision.confidence * 0.6));
          const fullUrl = addressRef.current.startsWith('http') ? `${addressRef.current}/move?dir=${cmd}&speed=${aiSpeed}` : `http://${addressRef.current}/move?dir=${cmd}&speed=${aiSpeed}`;
          fetch(fullUrl, { mode: 'no-cors' }).catch(() => {});
          
          setTimeout(() => {
            const stopUrl = addressRef.current.startsWith('http') ? `${addressRef.current}/move?dir=stop` : `http://${addressRef.current}/move?dir=stop`;
            fetch(stopUrl, { mode: 'no-cors' }).catch(() => {});
          }, tuning.turnMs);
        }
      } catch (err: any) {
        setLogs(prev => [`[ERR] Neural Fault: ${err.message}`, ...prev].slice(0, 50));
        if (err.message?.includes("404")) setHasKey(false);
      } finally {
        if (aiRef.current) cycleTimer = setTimeout(runVisionPulse, tuning.cycle);
      }
    }

    runVisionPulse();
    return () => clearTimeout(cycleTimer);
  }, [isAiActive, model, prompt, tuning, setThought, setLogs, setHistory, hwContext, mission, orders, setHasKey]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#09090b] text-[#e4e4e7] p-3 gap-3 overflow-hidden font-['Space_Mono'] selection:bg-cyan-500/30">
      
      {/* 1. Global HUD Bar */}
      <header className="flex justify-between items-center bg-zinc-900/60 px-4 py-2 rounded-lg border border-white/5 shadow-2xl shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_12px_#00e5ff]" />
                <h1 className="text-[11px] font-bold tracking-[0.4em] uppercase text-zinc-100">AI Robotics Pilot</h1>
             </div>
             <div className="hidden md:flex px-2 py-0.5 bg-zinc-800 rounded border border-white/5 text-[9px] text-zinc-500 font-mono tracking-tighter">
               v9.8-STANDALONE-PROD
             </div>
          </div>
          <div className="flex items-center gap-4">
             {isLiveActive && <LiveAudioHandler />}
             <div className={`text-[9px] font-mono px-3 py-1 rounded-full border ${window.location.protocol === 'https:' ? 'bg-cyan-900/10 border-cyan-500/20 text-cyan-500' : 'bg-orange-900/10 border-orange-500/20 text-orange-500'}`}>
                {window.location.protocol === 'https:' ? '🔒 SECURE LINK' : '⚠️ UNSECURE WEB'}
             </div>
          </div>
      </header>

      {/* 2. Main WorkView Split */}
      <main className="flex grow gap-3 overflow-hidden min-h-0">
        
        {/* Left: Monitor & Telemetry */}
        <section className="flex-[0.55] flex flex-col min-w-0 h-full">
          <div className="grow relative bg-black rounded-lg border border-white/10 overflow-hidden shadow-2xl">
            <Content />
          </div>
          <div className="mt-3 bg-zinc-900/40 border border-white/5 rounded-lg p-3 shrink-0 h-24 overflow-y-auto custom-scrollbar">
             <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest">Thought Processor</span>
                <div className="flex-grow h-[1px] bg-cyan-900/30" />
             </div>
             <p className="text-[11px] font-mono text-cyan-100 leading-tight italic">
               {thought || 'Waiting for cycle start...'}
             </p>
          </div>
        </section>

        {/* Right: Command Deck */}
        <section className="flex-[0.45] min-w-0 h-full">
           <ControlPanel />
        </section>

      </main>

    </div>
  );
}

export default App;
