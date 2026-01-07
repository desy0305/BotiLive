
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
  OrderStorageAtom
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
  const [, setThought] = useAtom(AiThoughtAtom);
  const [model] = useAtom(SelectedModelAtom);
  const [tuning] = useAtom(TuningParamsAtom);
  const [, setLogs] = useAtom(LogsAtom);
  const [isThinking] = useAtom(IsThinkingEnabledAtom);
  const [history, setHistory] = useAtom(ActionHistoryAtom);
  const [mission] = useAtom(MissionStateAtom);
  const [orders] = useAtom(OrderStorageAtom);

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
        const res = await fetch(`http://${ip}/status`, { signal: controller.signal });
        clearTimeout(id);
        const data = await res.json();
        setDistance(data.d);
        setMode(data.m);
      } catch (e) { /* Silent fail for robot offline */ }
    }, 1000);
    return () => clearInterval(timer);
  }, [ip, setDistance, setMode]);

  // Reactive Vision Pilot (Obstacle Avoidance & Nav)
  useEffect(() => {
    if (!isAiActive) return;

    let cycleTimer: any;
    
    async function runVisionPulse() {
      if (!aiRef.current) return;

      const video = document.querySelector('video');
      if (!video) {
        cycleTimer = setTimeout(runVisionPulse, 1000);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const hybridContext = `
          ${prompt}
          ${hwContext}
          CURRENT SENSOR DATA: Ultrasonic Distance = ${distRef.current}cm
          CURRENT MISSION: ${mission}
          ACTION MEMORY: ${historyRef.current.slice(-5).join(' -> ')}
          TABLE ORDERS: ${JSON.stringify(orders)}
          Decision required for current frame:
        `;

        const response = await ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              { text: hybridContext },
              { inlineData: { mimeType: "image/jpeg", data: base64 } }
            ]
          },
          config: {
            responseMimeType: "application/json",
            temperature: tuning.temperature,
            thinkingConfig: isThinking ? { thinkingBudget: 1000 } : { thinkingBudget: 0 },
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
        if (cmd !== 'stop') {
          setLogs(prev => [`[PILOT] ${cmd.toUpperCase()} (${(decision.confidence * 100).toFixed(0)}%) - ${decision.reasoning.substring(0, 40)}`, ...prev].slice(0, 50));
          setHistory(prev => [...prev, cmd].slice(-10));

          const aiSpeed = Math.round(tuning.speed * (0.6 + decision.confidence * 0.4));
          fetch(`http://${ip}/move?dir=${cmd}&speed=${aiSpeed}`, { mode: 'no-cors' }).catch(()=>{});
          setTimeout(() => { fetch(`http://${ip}/move?dir=stop`, { mode: 'no-cors' }).catch(()=>{}); }, tuning.duration);
        }
      } catch (err: any) {
        if (err.message?.includes("404")) {
           setLogs(prev => [`[ERR] Model ${model} not accessible. Check API Project.`, ...prev].slice(0, 50));
        } else {
           setLogs(prev => [`[ERR] Vision Pilot Cycle Failed: ${err.message}`, ...prev].slice(0, 50));
        }
      } finally {
        if (aiRef.current) cycleTimer = setTimeout(runVisionPulse, tuning.cycle);
      }
    }

    runVisionPulse();
    return () => clearTimeout(cycleTimer);
  }, [isAiActive, model, ip, prompt, tuning, isThinking, setThought, setLogs, setHistory, hwContext, mission, orders]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[var(--bg-color)] p-2 gap-2 overflow-hidden selection:bg-cyan-500/30">
      {/* HUD Bar */}
      <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 rounded border border-white/5 shrink-0">
          <div className="flex items-center gap-4">
             <h1 className="text-[10px] font-bold tracking-[0.3em] text-[var(--accent-color)] uppercase flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]" />
               Robotics Core v9.6-PROD
             </h1>
          </div>
          <div className="flex items-center gap-3">
             {isLiveActive && <LiveAudioHandler />}
             <div className="text-[8px] font-mono text-zinc-600 bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
               SYS_ACTIVE_MODELS: [${model}, NativeAudio]
             </div>
          </div>
      </div>

      {/* Main Workview (50:50) */}
      <div className="flex grow gap-2 overflow-hidden">
        <div className="w-1/2 flex flex-col min-w-0">
          <Content />
        </div>
        <div className="w-1/2 flex flex-col min-w-0 bg-card-bg/40 rounded-lg p-2 border border-white/5 shadow-2xl">
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
