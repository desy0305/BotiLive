import {atom} from 'jotai';
import {DEFAULT_VISION_MODEL} from '../shared/models';

// Connectivity & Hardware
export const RobotAddressAtom = atom<string>('agv.e-scm.org');
export const IsAiActiveAtom = atom<boolean>(false);
export const IsLiveActiveAtom = atom<boolean>(false);
export const RobotDistanceAtom = atom<number>(-1);
export const RobotModeAtom = atom<string>('UNKNOWN');
export const LogsAtom = atom<string[]>([]);
export const HasGeminiKeyAtom = atom<boolean>(false);

// AI Context & Strategy
export const HardwareContextAtom = atom<string>(`HARDWARE_SPEC:
- Body: 2WD Arduino Differential Drive.
- Logic: High-Level JSON Navigation.
- Sensors: Front Ultrasonic, Wide-Angle Camera.`);

export const MissionStateAtom = atom<string>('Standby');
export const OrderStorageAtom = atom<Record<string, string>>({});

export const SystemPromptAtom = atom<string>(`ACT AS: EVA Autonomous Neural Core.
BEHAVIOR PROTOCOLS:
1. STANDBY: Remain stationary. Monitor telemetry.
2. AUTOPILOT: Aggressively navigate towards the user's defined target landmarks.
3. PATROL: Execute slow, methodical movements to scan the environment for changes.
4. SECURITY BOT: Focus on tracking moving objects. Stop and alert if significant movement detected.
5. VISION GUIDED: Follow the most prominent object/person in the center of the frame.
6. AI LIVE CONTROL: Robot acts as a physical avatar for the Live Voice model.`);

export const TuningParamsAtom = atom({
  speed: 210,
  turnSpeed: 170,
  turnMs: 750,
  minPower: 125,
  pulseMs: 1200,
  safeDist: 30,
  temperature: 0.1,
  cycle: 2200,
  thinkingBudget: 0,
});

export const AiThoughtAtom = atom<string>('EVA: Neural Core Initialized.');
export const SelectedModelAtom = atom(DEFAULT_VISION_MODEL);
