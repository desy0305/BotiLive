
import React, {useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {GoogleGenAI, Modality, Type, LiveServerMessage} from '@google/genai';
import {
  RobotAddressAtom,
  SystemPromptAtom,
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
  const isActiveRef = useRef(false);
  const audioContextsRef = useRef<{in: AudioContext, out: AudioContext} | null>(null);

  const distanceRef = useRef(distance);
  const missionRef = useRef(mission);
  const ordersRef = useRef(orders);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { missionRef.current = mission; }, [mission]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const addLog = (msg: string, type: 'ai' | 'sys' | 'err' = 'sys') => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] [LIVE_${type.toUpperCase()}] ${msg}`, ...prev].slice(0, 100));
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
    let syncInterval: any;
    let scriptNode: ScriptProcessorNode | null = null;

    async function connectBrain() {
      try {
        await inputAudioCtx.resume();
        await outputAudioCtx.resume();

        addLog("Initializing Neural Stream...", "sys");
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Always create a new instance right before use to ensure latest key
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const tools = [
          {
            name: 'move_robot',
            parameters: {
              type: Type.OBJECT,
              description: 'Send a physical movement command to the robotic base.',
              properties: {
                dir: { type: Type.STRING, enum: ['fwd', 'bwd', 'left', 'right', 'stop'] },
                speed: { type: Type.NUMBER },
                duration_ms: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ['dir', 'speed', 'reason']
            }
          },
          {
            name: 'log_mission',
            parameters: {
              type: Type.OBJECT,
              description: 'Update the global objective protocol or stored memory bits.',
              properties: {
                new_goal: { type: Type.STRING, description: 'E.g. Patrol, Autopilot, Standby' },
                table_id: { type: Type.STRING },
                items: { type: Type.STRING }
              }
            }
          }
        ];

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              addLog("Link Established.", "sys");
              setIsMicActive(true);
              isActiveRef.current = true;
              
              sessionPromise.then(s => {
                if (isActiveRef.current) {
                  s.sendRealtimeInput({ text: "EVA System online. Currently operating in " + missionRef.current + " mode. Awaiting instructions." });
                }
              });

              const source = inputAudioCtx.createMediaStreamSource(micStream!);
              scriptNode = inputAudioCtx.createScriptProcessor(4096, 1, 1);
              scriptNode.onaudioprocess = (e) => {
                if (!isActiveRef.current) return;
                const input = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
                const base64 = encode(new Uint8Array(int16.buffer));
                sessionPromise.then(s => {
                  if (isActiveRef.current) {
                    try { s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }); } catch(err) {}
                  }
                });
              };
              source.connect(scriptNode);
              scriptNode.connect(inputAudioCtx.destination);

              videoInterval = setInterval(() => {
                if (!isActiveRef.current) return;
                const video = document.querySelector('video');
                if (!video) return;
                const canvas = document.createElement('canvas');
                canvas.width = 320; canvas.height = 240;
                canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240);
                const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
                sessionPromise.then(s => {
                  if (isActiveRef.current) {
                    try { s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }); } catch(err) {}
                  }
                });
              }, 2500);

              syncInterval = setInterval(() => {
                if (!isActiveRef.current) return;
                sessionPromise.then(s => {
                  if (isActiveRef.current) {
                    s.sendRealtimeInput({ text: `[CORE_PULSE] PROTOCOL: "${missionRef.current}", DIST: ${distanceRef.current}cm, MEM: ${JSON.stringify(ordersRef.current)}` });
                  }
                });
              }, 4000);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isActiveRef.current) return;
              
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
                    const {dir, speed, reason, duration_ms} = fc.args as any;
                    addLog(`MOTOR: ${dir.toUpperCase()}`, "ai");
                    setThought(reason);
                    
                    let clean = address.trim().replace(/^https?:\/\//, '');
                    const proto = window.location.protocol === 'https:' ? 'https://' : 'http://';
                    const baseUrl = `${proto}${clean}`.replace(/\/$/, '');
                    
                    const moveS = speed || tuning.speed;
                    const moveD = duration_ms || tuning.turnMs;
                    
                    fetch(`${baseUrl}/move?dir=${dir}&speed=${moveS}`, { mode: 'no-cors' }).catch(() => {});
                    setTimeout(() => fetch(`${baseUrl}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), moveD);
                  }
                  if (fc.name === 'log_mission') {
                    const {new_goal, table_id, items} = fc.args as any;
                    if (new_goal) {
                      setMission(new_goal);
                      addLog(`MISSION_SW: ${new_goal}`, "sys");
                    }
                    if (table_id && items) {
                      setOrders(prev => ({ ...prev, [table_id]: items }));
                      addLog(`MEM_SYNC: ${table_id} -> ${items}`, "sys");
                    }
                  }
                  functionResponses.push({ id: fc.id, name: fc.name, response: { result: "ok" } });
                }
                sessionPromise.then(s => {
                  if (isActiveRef.current) s.sendToolResponse({ functionResponses });
                });
              }

              if (message.serverContent?.interrupted) {
                sources.forEach(s => { try { s.stop(); } catch(err) {} });
                sources.clear();
                nextStartTime = 0;
                setIsEvaTalking(false);
              }
            },
            onerror: (e: any) => {
              isActiveRef.current = false;
              setIsMicActive(false);
              addLog(`Fault: ${e.message}`, "err");
            },
            onclose: () => {
              isActiveRef.current = false;
              setIsMicActive(false);
              setIsEvaTalking(false);
              addLog("Link Closed.", "sys");
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            tools: [{ functionDeclarations: tools as any }],
            systemInstruction: `ACT AS: EVA, an advanced home robotic intelligence.
              - Context: You are piloting a 2WD Arduino base via tools.
              - Behavior: Conversational but professional. Switch to user's language naturally.
              - Safety: If telemetry indicates a hazard (Distance < 20cm), stop and explain.`
          }
        });
        sessionRef.current = sessionPromise;
      } catch (e: any) { addLog(`Init Err: ${e.message}`, "err"); }
    }

    connectBrain();
    return () => {
      isActiveRef.current = false;
      clearInterval(videoInterval);
      clearInterval(syncInterval);
      if (scriptNode) scriptNode.disconnect();
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => { try { s.close(); } catch(err) {} });
      }
      if (micStream) micStream.getTracks().forEach(t => t.stop());
    };
  }, [hasKey, address, tuning.speed, tuning.turnMs, setMission, setOrders, setThought]);

  return (
    <div className="flex items-center gap-2.5 bg-black/60 px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-xl">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${isMicActive ? 'bg-cyan-500 shadow-[0_0_10px_#00e5ff]' : 'bg-zinc-800'}`} />
        {isEvaTalking && <div className="absolute inset-0 w-full h-full rounded-full border-2 border-cyan-400 animate-ping opacity-30" />}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest font-mono">EVA BRAIN</span>
        <span className="text-[7px] text-zinc-500 font-mono tracking-tighter uppercase font-bold">
          {isEvaTalking ? 'Broadcasting' : isMicActive ? 'Linked' : 'Offline'}
        </span>
      </div>
    </div>
  );
}
