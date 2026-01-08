
import {useAtom} from 'jotai';
import React, {useEffect, useRef} from 'react';
import {Content} from './Content';
import {ControlPanel} from './ControlPanel';
import {LiveAudioHandler} from './LiveAudioHandler';
import {
  IsAiActiveAtom,
  IsLiveActiveAtom,
  RobotIpAtom,
  RobotDistanceAtom,
  RobotModeAtom,
  SystemPromptAtom,
  AiThoughtAtom,
  SelectedModelAtom,
  TuningParamsAtom,
  LogsAtom,
  IsThinkingEnabledAtom,
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
  const [ip] = useAtom(RobotIpAtom);
  const [distance, setDistance] = useAtom(RobotDistanceAtom);
  const [, setMode] = useAtom(RobotModeAtom);
  const [prompt] = useAtom(SystemPromptAtom);
  const [hwContext] = useAtom(HardwareContextAtom);
  // Fix: Correctly destructure both the 'thought' value and 'setThought' setter to resolve the "Cannot find name 'thought'" error.
  const [thought, setThought] = useAtom(AiThoughtAtom);
  const [model] = useAtom(SelectedModelAtom);
  const [tuning] = useAtom(TuningParamsAtom);
  const [, setLogs] = useAtom(LogsAtom);
  const [isThinking] = useAtom(IsThinkingEnabledAtom);
  const [history, setHistory] = useAtom(ActionHistoryAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [orders] = useAtom(OrderStorageAtom);
  const [, setHasKey] = useAtom(HasApiKeySelectedAtom);

  const aiRef = useRef(isAiActive);
  const historyRef = useRef(history);
  const distRef = useRef(distance);
  
  useEffect(() => { aiRef.current = isAiActive; }, [isAiActive]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { distRef.current = distance; }, [distance]);

  // Status Polling Loop
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!ip) return;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 800);
        const res = await fetch(`http://${ip}/status`, { signal: controller.signal, mode: 'cors' }).catch(() => null);
        if (res) {
          const data = await res.json();
          setDistance(data.d);
          setMode(data.m);
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(timer);
  }, [ip, setDistance, setMode]);

  // Reactive Vision Pilot
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
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const hybridContext = `${prompt}\n${hwContext}\nSTATE: Distance=${distRef.current}cm, Mission=${mission}, Memory=${JSON.stringify(orders)}`;

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

        // LOGGING BEFORE EXECUTION
        const logMsg = `[PILOT] CMD: ${cmd.toUpperCase()} (${(decision.confidence * 100).toFixed(0)}%) | ${decision.reasoning.substring(0, 50)}...`;
        setLogs(prev => [logMsg, ...prev].slice(0, 50));

        if (cmd !== 'stop') {
          setHistory(prev => [...prev, cmd].slice(-10));
          const aiSpeed = Math.round(tuning.speed * (0.4 + decision.confidence * 0.6));
          fetch(`http://${ip}/move?dir=${cmd}&speed=${aiSpeed}`, { mode: 'no-cors' }).catch(() => {});
          setTimeout(() => fetch(`http://${ip}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), tuning.turnMs);
        }
      } catch (err: any) {
        setLogs(prev => [`[ERR] Vision Cycle Failed: ${err.message}`, ...prev].slice(0, 50));
        if (err.message?.includes("404")) setHasKey(false);
      } finally {
        if (aiRef.current) cycleTimer = setTimeout(runVisionPulse, tuning.cycle);
      }
    }

    runVisionPulse();
    return () => clearTimeout(cycleTimer);
  }, [isAiActive, model, ip, prompt, tuning, setThought, setLogs, setHistory, hwContext, mission, orders, setHasKey]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--bg-color)] p-2 gap-2 overflow-hidden selection:bg-cyan-500/30">
      {/* HUD Bar */}
      <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded border border-white/5 shrink-0">
          <h1 className="text-[10px] font-bold tracking-[0.3em] text-[var(--accent-color)] uppercase flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]" />
            Robotics PROD-READY v9.7
          </h1>
          <div className="flex items-center gap-3">
             {isLiveActive && <LiveAudioHandler />}
             <div className="text-[8px] font-mono text-zinc-600 bg-black/60 px-2 py-0.5 rounded border border-zinc-800 uppercase">
               {window.location.protocol === 'https:' ? '🔒 SSL Active' : '⚠️ No SSL'} | Robot: {ip}
             </div>
          </div>
      </div>

      <div className="flex grow gap-2 overflow-hidden">
        <div className="w-1/2 flex flex-col min-w-0 h-full">
          <Content />
          {/* Spatial/Thought Indicator Under Camera */}
          <div className="mt-2 p-2 bg-black border border-cyan-900 rounded font-mono text-[9px] text-cyan-200 min-h-[40px] leading-tight overflow-y-auto">
             <span className="text-cyan-600 mr-2 font-bold">NEURAL OUTPUT:</span> {thought}
          </div>
        </div>
        <div className="w-1/2 flex flex-col min-w-0 bg-card-bg/40 rounded-lg p-3 border border-white/5 shadow-2xl h-full overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-cyan-500 opacity-60">
             <span className="text-xs">⚙️</span>
             <span className="text-[9px] uppercase font-bold tracking-widest">Control Deck</span>
          </div>
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
