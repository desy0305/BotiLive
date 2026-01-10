
import React, {useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {GoogleGenAI, Modality, Type, LiveServerMessage} from '@google/genai';
import {
  RobotAddressAtom,
  SystemPromptAtom,
  HardwareContextAtom,
  LogsAtom,
  AiThoughtAtom,
  ActionHistoryAtom,
  RobotDistanceAtom,
  MissionStateAtom,
  OrderStorageAtom,
  TuningParamsAtom,
  HasApiKeySelectedAtom
} from './atoms';

// Manual encoding/decoding functions
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
  const sessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{in: AudioContext, out: AudioContext} | null>(null);

  const addLog = (msg: string, type: 'ai' | 'sys' | 'err' = 'sys') => {
    setLogs(prev => [`[BRAIN] [${type.toUpperCase()}] ${msg}`, ...prev].slice(0, 50));
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

        addLog("Syncing Core...", "sys");
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        
        const tools = [{
          name: 'move_robot',
          parameters: {
            type: Type.OBJECT,
            description: 'Physical chassis control.',
            properties: {
              dir: { type: Type.STRING, enum: ['fwd', 'bwd', 'left', 'right', 'stop'] },
              speed: { type: Type.NUMBER },
              reason: { type: Type.STRING }
            },
            required: ['dir', 'speed', 'reason']
          }
        }];

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              addLog("Brain Synchronized", "sys");
              setIsMicActive(true);
              const source = inputAudioCtx.createMediaStreamSource(micStream!);
              const scriptProcessor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const input = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
                const base64 = encode(new Uint8Array(int16.buffer));
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
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
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
              }, 1500);
            },
            onmessage: async (message: LiveServerMessage) => {
              const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audioBase64) {
                nextStartTime = Math.max(nextStartTime, outputAudioCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioBase64), outputAudioCtx, 24000, 1);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => sources.delete(source));
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
                    
                    const baseUrl = getRobotBase();
                    fetch(`${baseUrl}/move?dir=${dir}&speed=${speed}`, { mode: 'no-cors' }).catch(() => {});
                    setTimeout(() => fetch(`${baseUrl}/move?dir=stop`, { mode: 'no-cors' }).catch(() => {}), tuning.turnMs);
                  }
                  functionResponses.push({ id: fc.id, name: fc.name, response: { result: "executed" } });
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses }));
              }

              if (message.serverContent?.interrupted) {
                sources.forEach(s => { try { s.stop(); } catch(e) {} });
                sources.clear();
                nextStartTime = 0;
              }
            },
            onerror: (e: any) => {
              addLog(`Fault: ${e.message}`, "err");
              setIsMicActive(false);
            },
            onclose: () => {
              addLog("Link Severed", "sys");
              setIsMicActive(false);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            tools: [{ functionDeclarations: tools as any }],
            systemInstruction: `${prompt}\n${hw}\nStatus: Dist=${distance}cm.`
          }
        });
        sessionRef.current = sessionPromise;
      } catch (e: any) { addLog(`Init Error: ${e.message}`, "err"); }
    }

    connectBrain();
    return () => {
      clearInterval(videoInterval);
      if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
      if (micStream) micStream.getTracks().forEach(t => t.stop());
    };
  }, [hasKey, address, prompt, tuning.turnMs]);

  return (
    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full border border-cyan-500/30">
      <div className={`w-2 h-2 rounded-full ${isMicActive ? 'bg-cyan-500 animate-pulse' : 'bg-red-500'}`} />
      <span className="text-[10px] text-cyan-400 font-mono tracking-tighter uppercase font-bold">Brain {isMicActive ? 'Synced' : 'Link Dead'}</span>
    </div>
  );
}
