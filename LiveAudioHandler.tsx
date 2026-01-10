
import React, {useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {GoogleGenAI, Modality, Type, LiveServerMessage} from '@google/genai';
import {
  RobotAddressAtom,
  SystemPromptAtom,
  HardwareContextAtom,
  LogsAtom,
  AiThoughtAtom,
  RobotDistanceAtom,
  MissionStateAtom,
  OrderStorageAtom,
  TuningParamsAtom,
  HasApiKeySelectedAtom
} from './atoms';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export function LiveAudioHandler() {
  const [address] = useAtom(RobotAddressAtom);
  const [prompt] = useAtom(SystemPromptAtom);
  const [hw] = useAtom(HardwareContextAtom);
  const [distance] = useAtom(RobotDistanceAtom);
  const [tuning] = useAtom(TuningParamsAtom);
  const [, setLogs] = useAtom(LogsAtom);
  const [, setThought] = useAtom(AiThoughtAtom);
  const [mission, setMission] = useAtom(MissionStateAtom);
  const [orders, setOrders] = useAtom(OrderStorageAtom);
  const [hasKey] = useAtom(HasApiKeySelectedAtom);
  
  const [isMicActive, setIsMicActive] = useState(false);
  const [isEvaTalking, setIsEvaTalking] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{in: AudioContext, out: AudioContext} | null>(null);

  // Use refs for telemetry to avoid re-triggering the useEffect connection logic
  const distanceRef = useRef(distance);
  const missionRef = useRef(mission);
  const ordersRef = useRef(orders);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { missionRef.current = mission; }, [mission]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const addLog = (msg: string, type: 'ai' | 'sys' | 'err' = 'sys') => {
    setLogs(prev => [`[EVA] [${type.toUpperCase()}] ${msg}`, ...prev].slice(0, 50));
  };

  const getRobotBase = () => {
    let clean = address.trim().replace(/^https?:\/\//, '');
    const proto = window.location.protocol === 'https:' ? 'https://' : 'http://';
    return `${proto}${clean}`.replace(/\/$/, '');
  };

  useEffect(() => {
    if (!hasKey) return;

    if (!audioContextsRef.current) {
      audioContextsRef.current = {
        in: new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000}),
        out: new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000})
      };
    }

    const {in: inputAudioCtx, out: outputAudioCtx} = audioContextsRef.current;
    let nextStartTime = 0;
    const outputNode = outputAudioCtx.createGain();
    outputNode.connect(outputAudioCtx.destination);
    
    const sources = new Set<AudioBufferSourceNode>();
    let micStream: MediaStream | null = null;
    let videoInterval: any;

    async function connectBrain() {
      try {
        await inputAudioCtx.resume();
        await outputAudioCtx.resume();

        addLog("Syncing EVA Neural Core...", "sys");
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const tools = [
          {
            name: 'move_robot',
            parameters: {
              type: Type.OBJECT,
              description: 'Immediate motor control.',
              properties: {
                dir: { type: Type.STRING, enum: ['fwd', 'bwd', 'left', 'right', 'stop'] },
                speed: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ['dir', 'speed', 'reason']
            }
          },
          {
            name: 'log_mission',
            parameters: {
              type: Type.OBJECT,
              description: 'Update the global mission objective or store an order in memory.',
              properties: {
                new_goal: { type: Type.STRING, description: 'The overall task (e.g., Deliver coffee to Table 1)' },
                table_id: { type: Type.STRING, description: 'Target table number if applicable' },
                items: { type: Type.STRING, description: 'Items involved in the order' }
              }
            }
          }
        ];

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              addLog("EVA Synchronized", "sys");
              setIsMicActive(true);
              
              const source = inputAudioCtx.createMediaStreamSource(micStream!);
              const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                if (!sessionRef.current) return;
                const input = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
                const base64 = encode(new Uint8Array(int16.buffer));
                sessionPromise.then(s => {
                  try { s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }); } catch(e) {}
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioCtx.destination);

              videoInterval = setInterval(() => {
                const video = document.querySelector('video');
                if (!video) return;
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 240;
                canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240);
                const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
                sessionPromise.then(s => {
                  try { s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }); } catch(e) {}
                });
              }, 2000);
            },
            onmessage: async (message: LiveServerMessage) => {
              const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64) {
                setIsEvaTalking(true);
                nextStartTime = Math.max(nextStartTime, outputAudioCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioBase64), outputAudioCtx, 24000, 1);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                  sources.delete(source);
                  if (sources.size === 0) setIsEvaTalking(false);
                });
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
                sources.add(source);
              }

              if (message.toolCall) {
                const functionResponses = [];
                for (const fc of message.toolCall.functionCalls) {
                  if (fc.name === 'move_robot') {
                    const {dir, speed, reason} = fc.args as any;
                    addLog(`MOTOR: ${dir.toUpperCase()}`, "ai");
                    setThought(reason);
                    fetch(`${getRobotBase()}/move?dir=${dir}&speed=${speed}`, { mode: 'no-cors' }).catch(() => {});
                    setTimeout(() => fetch(`${getRobotBase()}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), tuning.turnMs);
                  }
                  if (fc.name === 'log_mission') {
                    const {new_goal, table_id, items} = fc.args as any;
                    if (new_goal) {
                      setMission(new_goal);
                      addLog(`MISSION UPDATE: ${new_goal}`, "sys");
                    }
                    if (table_id && items) {
                      setOrders(prev => ({ ...prev, [table_id]: items }));
                      addLog(`MEMORY LOGGED: Table ${table_id} wants ${items}`, "sys");
                    }
                  }
                  functionResponses.push({ id: fc.id, name: fc.name, response: { result: "ok" } });
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
              }

              if (message.serverContent?.interrupted) {
                sources.forEach(s => { try { s.stop(); } catch(e) {} });
                sources.clear();
                nextStartTime = 0;
                setIsEvaTalking(false);
              }
            },
            onerror: (e: any) => {
              addLog(`Fault: ${e.message}`, "err");
              setIsMicActive(false);
            },
            onclose: () => {
              addLog("Neural Core Offline", "sys");
              setIsMicActive(false);
              setIsEvaTalking(false);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            tools: [{ functionDeclarations: tools as any }],
            systemInstruction: `You are EVA (Electronic Virtual Assistant), the high-intelligence home robot for Lazar.
Languge: Speak Bulgarian (predominantly) or English as requested.
Persona: Helpful, witty, and technologically advanced.
Greeting: Your very first response MUST start with: "Hello Lazar, I am EVA, your Home Robot, what is the task you would like me to do execute now?"
Mission Logic: 
1. Use 'log_mission' to update the global objective whenever Lazar gives a task.
2. Use 'move_robot' for immediate steering.
3. You can see through the camera. Comment on what you see.
4. Current Status: Distance=${distanceRef.current}cm, Current Objective="${missionRef.current}", Memory=${JSON.stringify(ordersRef.current)}.`
          }
        });
        sessionRef.current = sessionPromise;
      } catch (e: any) { addLog(`Init Error: ${e.message}`, "err"); }
    }

    connectBrain();
    return () => {
      clearInterval(videoInterval);
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => {
          try { s.close(); } catch(e) {}
        });
      }
      if (micStream) micStream.getTracks().forEach(t => t.stop());
    };
    // Removed distance/mission/orders from dependencies to maintain stable connection
  }, [hasKey, address, prompt]);

  return (
    <div className="flex items-center gap-3 bg-black/60 px-4 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(0,229,255,0.05)]">
      <div className="relative flex items-center justify-center">
        <div className={`w-3 h-3 rounded-full ${isMicActive ? 'bg-cyan-500 shadow-[0_0_10px_#00e5ff]' : 'bg-red-500'} ${isEvaTalking ? 'animate-ping' : ''}`} />
        {isEvaTalking && <div className="absolute w-5 h-5 rounded-full border border-cyan-400 animate-ping opacity-30" />}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-cyan-400 font-mono tracking-tighter uppercase font-black">EVA BRAIN</span>
        <span className="text-[8px] text-zinc-500 font-mono leading-none tracking-tighter uppercase">
          {isEvaTalking ? 'Vocalizing...' : isMicActive ? 'Listening...' : 'Offline'}
        </span>
      </div>
      {isMicActive && (
        <div className="flex gap-0.5 items-end h-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`w-0.5 bg-cyan-500/60 rounded-full animate-bounce`} style={{ height: `${Math.random()*100}%`, animationDelay: `${i*0.1}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}
