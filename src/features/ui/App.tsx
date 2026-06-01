import {useEffect, useRef} from 'react';
import {useAtom} from 'jotai';
import {Content} from '../live/Content';
import {ControlPanel} from '../robot/ControlPanel';
import {LiveAudioHandler} from '../live/LiveAudioHandler';
import {requestVisionDecision} from '../ai/api';
import {fetchRobotStatus, moveRobot} from '../robot/api';
import {getJson} from '../../shared/api';
import {captureVideoFrameBase64} from '../../shared/video';
import type {PublicConfigResponse, RobotDirection} from '../../types/api';
import {
  AiThoughtAtom,
  HasGeminiKeyAtom,
  HardwareContextAtom,
  IsAiActiveAtom,
  IsLiveActiveAtom,
  LogsAtom,
  MissionStateAtom,
  OrderStorageAtom,
  RobotAddressAtom,
  RobotDistanceAtom,
  RobotModeAtom,
  SelectedModelAtom,
  SystemPromptAtom,
  TuningParamsAtom,
} from '../../state/atoms';

function App() {
  const [isAiActive, setIsAiActive] = useAtom(IsAiActiveAtom);
  const [isLiveActive, setIsLiveActive] = useAtom(IsLiveActiveAtom);
  const [hasGeminiKey, setHasGeminiKey] = useAtom(HasGeminiKeyAtom);
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

  const aiRef = useRef(isAiActive);
  const addressRef = useRef(address);
  const missionRef = useRef(mission);
  const distRef = useRef(distance);

  useEffect(() => {
    aiRef.current = isAiActive;
  }, [isAiActive]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    missionRef.current = mission;
  }, [mission]);

  useEffect(() => {
    distRef.current = distance;
  }, [distance]);

  useEffect(() => {
    getJson<PublicConfigResponse>('/api/config')
      .then((config) => setHasGeminiKey(Boolean(config.hasGeminiKey)))
      .catch(() => setHasGeminiKey(false));
  }, [setHasGeminiKey]);

  useEffect(() => {
    if (!hasGeminiKey) {
      setIsAiActive(false);
      setIsLiveActive(false);
    }
  }, [hasGeminiKey, setIsAiActive, setIsLiveActive]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!addressRef.current) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 1500);
      try {
        const data = await fetchRobotStatus(addressRef.current, {signal: controller.signal});
        const nextDistance = data.d ?? data.distance;
        const nextMode = data.m ?? data.mode;

        if (nextDistance !== undefined) {
          setDistance(nextDistance);
        }
        if (nextMode !== undefined) {
          setMode(nextMode);
        }
      } catch {
        // Robot telemetry is best-effort; stale HUD data is safer than noisy logs.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [setDistance, setMode]);

  useEffect(() => {
    if (!isAiActive || !hasGeminiKey) {
      return;
    }

    let cycleTimer: number | undefined;

    async function runVisionPulse() {
      if (!aiRef.current) {
        return;
      }

      if (missionRef.current === 'Standby') {
        setThought('EVA PILOT: Core in STANDBY. Monitoring for telemetry triggers...');
        cycleTimer = window.setTimeout(runVisionPulse, 2000);
        return;
      }

      const video = document.querySelector('video');
      if (!video) {
        cycleTimer = window.setTimeout(runVisionPulse, 1000);
        return;
      }

      try {
        const base64 = captureVideoFrameBase64(video, {width: 640, height: 480, quality: 0.5});
        const decision = await requestVisionDecision({
          model,
          image: {mimeType: 'image/jpeg', data: base64},
          context: {
            systemPrompt: prompt,
            hardwareContext: hwContext,
            mission: missionRef.current,
            memory: orders,
            distanceCm: distRef.current,
            safeDistanceCm: tuning.safeDist,
          },
          generationConfig: {
            temperature: tuning.temperature,
            thinkingBudget: tuning.thinkingBudget,
          },
        });

        setThought(decision.reasoning);
        const cmd = decision.command.toLowerCase() as RobotDirection;

        if (cmd !== 'stop' && decision.confidence > 0.45) {
          const time = new Date().toLocaleTimeString();
          setLogs((prev) => [
            `[${time}] [PILOT] ${cmd.toUpperCase()} (${Math.round(decision.confidence * 100)}%)`,
            ...prev,
          ].slice(0, 100));

          const baseSpeed = cmd === 'fwd' || cmd === 'bwd' ? tuning.speed : tuning.turnSpeed;
          const finalSpeed = decision.speed ?? Math.max(tuning.minPower, Math.round(baseSpeed * (0.6 + decision.confidence * 0.4)));
          const durationMs = decision.durationMs ?? tuning.turnMs;
          const commandAddress = addressRef.current;

          await moveRobot(commandAddress, cmd, finalSpeed, durationMs);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLogs((prev) => [`[ERR] Vision Cycle: ${message}`, ...prev].slice(0, 100));
      } finally {
        if (aiRef.current) {
          cycleTimer = window.setTimeout(runVisionPulse, tuning.cycle);
        }
      }
    }

    runVisionPulse();
    return () => {
      if (cycleTimer) {
        window.clearTimeout(cycleTimer);
      }
    };
  }, [hasGeminiKey, hwContext, isAiActive, model, orders, prompt, setLogs, setThought, tuning]);

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
          {isLiveActive && hasGeminiKey && <LiveAudioHandler />}
          <div className="text-[8px] font-black px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-400 uppercase tracking-widest">
            {hasGeminiKey ? 'API: Backend' : 'AI: Configure Key'}
          </div>
        </div>
      </header>

      <main className="flex flex-col lg:flex-row grow gap-4 overflow-hidden min-h-0">
        <section className="flex-[0.6] flex flex-col min-w-0 h-full gap-3">
          <div className="grow relative bg-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
            <Content />
          </div>
          <div className="bg-zinc-950 border border-cyan-900/20 rounded-2xl p-4 shrink-0 h-28 overflow-y-auto custom-scrollbar shadow-inner relative">
            <div className="absolute top-2 right-3 text-[7px] text-cyan-500/30 font-bold uppercase tracking-widest">
              Neural_Thought_Stream
            </div>
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
