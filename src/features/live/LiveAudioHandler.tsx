import {useEffect, useRef, useState} from 'react';
import {useAtom} from 'jotai';
import {GoogleGenAI, Modality, Type, type LiveServerMessage} from '@google/genai';
import {
  AiThoughtAtom,
  LogsAtom,
  MissionStateAtom,
  OrderStorageAtom,
  RobotAddressAtom,
  RobotDistanceAtom,
  SystemPromptAtom,
  TuningParamsAtom,
} from '../../state/atoms';
import {LIVE_MODEL_ID} from '../../shared/models';
import {moveRobot} from '../robot/api';
import {requestLiveToken} from './api';
import type {RobotDirection} from '../../types/api';

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function toRobotDirection(value: unknown): RobotDirection {
  const normalized = typeof value === 'string' ? value.toLowerCase() : 'stop';
  return normalized === 'fwd' || normalized === 'bwd' || normalized === 'left' || normalized === 'right' || normalized === 'stop'
    ? normalized
    : 'stop';
}

export function LiveAudioHandler() {
  const [address] = useAtom(RobotAddressAtom);
  const [distance] = useAtom(RobotDistanceAtom);
  const [tuning] = useAtom(TuningParamsAtom);
  const [prompt] = useAtom(SystemPromptAtom);
  const [, setLogs] = useAtom(LogsAtom);
  const [, setThought] = useAtom(AiThoughtAtom);
  const [mission, setMission] = useAtom(MissionStateAtom);
  const [orders, setOrders] = useAtom(OrderStorageAtom);

  const [isMicActive, setIsMicActive] = useState(false);
  const [isEvaTalking, setIsEvaTalking] = useState(false);
  const sessionRef = useRef<Promise<{close: () => void}> | null>(null);
  const isActiveRef = useRef(false);
  const audioContextsRef = useRef<{in: AudioContext; out: AudioContext} | null>(null);

  const addressRef = useRef(address);
  const distanceRef = useRef(distance);
  const missionRef = useRef(mission);
  const ordersRef = useRef(orders);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);
  useEffect(() => {
    distanceRef.current = distance;
  }, [distance]);
  useEffect(() => {
    missionRef.current = mission;
  }, [mission]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const addLog = (msg: string, type: 'ai' | 'sys' | 'err' = 'sys') => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] [LIVE_${type.toUpperCase()}] ${msg}`, ...prev].slice(0, 100));
  };

  useEffect(() => {
    if (!audioContextsRef.current) {
      const BrowserAudioContext = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      audioContextsRef.current = {
        in: new BrowserAudioContext({sampleRate: 16000}),
        out: new BrowserAudioContext({sampleRate: 24000}),
      };
    }

    const {in: inputAudioCtx, out: outputAudioCtx} = audioContextsRef.current;
    let nextStartTime = 0;
    const outputNode = outputAudioCtx.createGain();
    outputNode.connect(outputAudioCtx.destination);

    const sources = new Set<AudioBufferSourceNode>();
    let micStream: MediaStream | null = null;
    let videoInterval: number | undefined;
    let syncInterval: number | undefined;
    let scriptNode: ScriptProcessorNode | null = null;

    async function connectBrain() {
      try {
        await inputAudioCtx.resume();
        await outputAudioCtx.resume();

        addLog('Requesting ephemeral Live token...', 'sys');
        const {token, model = LIVE_MODEL_ID} = await requestLiveToken();
        micStream = await navigator.mediaDevices.getUserMedia({audio: true});
        const ai = new GoogleGenAI({apiKey: token});

        const tools = [
          {
            name: 'move_robot',
            parameters: {
              type: Type.OBJECT,
              description: 'Send a guarded movement command to the robotic base.',
              properties: {
                dir: {type: Type.STRING, enum: ['fwd', 'bwd', 'left', 'right', 'stop']},
                speed: {type: Type.NUMBER},
                duration_ms: {type: Type.NUMBER},
                reason: {type: Type.STRING},
              },
              required: ['dir', 'speed', 'reason'],
            },
          },
          {
            name: 'log_mission',
            parameters: {
              type: Type.OBJECT,
              description: 'Update the global objective protocol or stored memory bits.',
              properties: {
                new_goal: {type: Type.STRING, description: 'E.g. Patrol, Autopilot, Standby'},
                table_id: {type: Type.STRING},
                items: {type: Type.STRING},
              },
            },
          },
        ];

        const sessionPromise = ai.live.connect({
          model,
          callbacks: {
            onopen: () => {
              addLog('Link established.', 'sys');
              setIsMicActive(true);
              isActiveRef.current = true;

              sessionPromise.then((session) => {
                if (isActiveRef.current) {
                  session.sendRealtimeInput({
                    text: `BotiLive online. Mission ${missionRef.current}. Awaiting operator instructions.`,
                  });
                }
              });

              const source = inputAudioCtx.createMediaStreamSource(micStream!);
              scriptNode = inputAudioCtx.createScriptProcessor(4096, 1, 1);
              scriptNode.onaudioprocess = (e) => {
                if (!isActiveRef.current) {
                  return;
                }
                const input = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                  int16[i] = Math.max(-1, Math.min(1, input[i])) * 32767;
                }
                const base64 = encode(new Uint8Array(int16.buffer));
                sessionPromise.then((session) => {
                  if (isActiveRef.current) {
                    session.sendRealtimeInput({media: {data: base64, mimeType: 'audio/pcm;rate=16000'}});
                  }
                }).catch(() => undefined);
              };
              source.connect(scriptNode);
              scriptNode.connect(inputAudioCtx.destination);

              videoInterval = window.setInterval(() => {
                if (!isActiveRef.current) {
                  return;
                }
                const video = document.querySelector('video');
                if (!video) {
                  return;
                }
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                canvas.getContext('2d')?.drawImage(video, 0, 0, 320, 240);
                const base64 = canvas.toDataURL('image/jpeg', 0.4).split(',')[1];
                sessionPromise.then((session) => {
                  if (isActiveRef.current) {
                    session.sendRealtimeInput({media: {data: base64, mimeType: 'image/jpeg'}});
                  }
                }).catch(() => undefined);
              }, 3000);

              syncInterval = window.setInterval(() => {
                if (!isActiveRef.current) {
                  return;
                }
                sessionPromise.then((session) => {
                  if (isActiveRef.current) {
                    session.sendRealtimeInput({
                      text: `[CORE_PULSE] PROMPT: ${prompt}; PROTOCOL: "${missionRef.current}", DIST: ${distanceRef.current}cm, MEM: ${JSON.stringify(ordersRef.current)}`,
                    });
                  }
                }).catch(() => undefined);
              }, 5000);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (!isActiveRef.current) {
                return;
              }

              const textParts: string[] = [];
              const parts = message.serverContent?.modelTurn?.parts ?? [];
              for (const part of parts) {
                if (typeof part.text === 'string' && part.text.trim()) {
                  textParts.push(part.text.trim());
                }

                const audioBase64 = part.inlineData?.data;
                if (!audioBase64) {
                  continue;
                }
                setIsEvaTalking(true);
                nextStartTime = Math.max(nextStartTime, outputAudioCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioBase64), outputAudioCtx, 24000, 1);
                const source = outputAudioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                  sources.delete(source);
                  if (sources.size === 0) {
                    setIsEvaTalking(false);
                  }
                });
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
                sources.add(source);
              }

              if (textParts.length > 0) {
                setThought(textParts.join(' '));
              }

              if (message.toolCall) {
                const functionResponses: Array<{id?: string; name?: string; response: {result: string}}> = [];
                for (const fc of message.toolCall.functionCalls ?? []) {
                  if (fc.name === 'move_robot') {
                    const {dir, speed, reason, duration_ms: durationMs} = fc.args as Record<string, unknown>;
                    const direction = toRobotDirection(dir);
                    const moveSpeed = Number(speed || tuning.speed);
                    const moveDuration = Number(durationMs || tuning.turnMs);
                    addLog(`MOTOR: ${direction.toUpperCase()}`, 'ai');
                    setThought(typeof reason === 'string' ? reason : 'Live control command issued.');
                    await moveRobot(addressRef.current, direction as RobotDirection, moveSpeed, moveDuration).catch((err: unknown) => {
                      addLog(err instanceof Error ? err.message : String(err), 'err');
                    });
                  }
                  if (fc.name === 'log_mission') {
                    const {new_goal: newGoal, table_id: tableId, items} = fc.args as Record<string, unknown>;
                    if (typeof newGoal === 'string' && newGoal) {
                      setMission(newGoal);
                      addLog(`MISSION_SW: ${newGoal}`, 'sys');
                    }
                    if (typeof tableId === 'string' && typeof items === 'string') {
                      setOrders((prev) => ({...prev, [tableId]: items}));
                      addLog(`MEM_SYNC: ${tableId}`, 'sys');
                    }
                  }
                  functionResponses.push({id: fc.id, name: fc.name, response: {result: 'ok'}});
                }
                sessionPromise.then((session) => {
                  if (isActiveRef.current) {
                    session.sendToolResponse({functionResponses});
                  }
                }).catch(() => undefined);
              }

              if (message.serverContent?.interrupted) {
                sources.forEach((source) => {
                  try {
                    source.stop();
                  } catch {
                    // Already stopped.
                  }
                });
                sources.clear();
                nextStartTime = 0;
                setIsEvaTalking(false);
              }
            },
            onerror: (e) => {
              isActiveRef.current = false;
              setIsMicActive(false);
              addLog(`Fault: ${e.message}`, 'err');
            },
            onclose: () => {
              isActiveRef.current = false;
              setIsMicActive(false);
              setIsEvaTalking(false);
              addLog('Link closed.', 'sys');
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Zephyr'}}},
            tools: [{functionDeclarations: tools as any}],
            systemInstruction: `ACT AS: BotiLive, a supervised home robotics intelligence.
- Context: You pilot a 2WD Arduino base only through guarded tools.
- Safety: Stop before hazards and explain when telemetry suggests distance is below 20cm.
- Operator prompt: ${prompt}`,
          },
        });
        sessionRef.current = sessionPromise;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        addLog(`Init Err: ${message}`, 'err');
      }
    }

    void connectBrain();
    return () => {
      isActiveRef.current = false;
      if (videoInterval) {
        window.clearInterval(videoInterval);
      }
      if (syncInterval) {
        window.clearInterval(syncInterval);
      }
      scriptNode?.disconnect();
      sessionRef.current?.then((session) => session.close()).catch(() => undefined);
      micStream?.getTracks().forEach((track) => track.stop());
    };
  }, [prompt, setLogs, setMission, setOrders, setThought, tuning.speed, tuning.turnMs]);

  return (
    <div className="flex items-center gap-2.5 bg-black/60 px-4 py-1.5 rounded-full border border-cyan-500/20 shadow-xl">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${isMicActive ? 'bg-cyan-500 shadow-[0_0_10px_#00e5ff]' : 'bg-zinc-800'}`} />
        {isEvaTalking && <div className="absolute inset-0 w-full h-full rounded-full border-2 border-cyan-400 animate-ping opacity-30" />}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest font-mono">LIVE LINK</span>
        <span className="text-[7px] text-zinc-500 font-mono tracking-tighter uppercase font-bold">
          {isEvaTalking ? 'Broadcasting' : isMicActive ? 'Linked' : 'Offline'}
        </span>
      </div>
    </div>
  );
}
