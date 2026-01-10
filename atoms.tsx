
import {atom} from 'jotai';
import {DetectTypes, BoundingBox2DType, BoundingBoxMaskType, PointingType} from './Types';
import {defaultPromptParts} from './consts';

export const RobotAddressAtom = atom<string>('agv.e-scm.org');
export const IsAiActiveAtom = atom<boolean>(false); 
export const IsLiveActiveAtom = atom<boolean>(false);
export const RobotDistanceAtom = atom<number>(-1);
export const RobotModeAtom = atom<string>('UNKNOWN');
export const LogsAtom = atom<string[]>([]);
export const HasApiKeySelectedAtom = atom<boolean>(true);

export const HardwareContextAtom = atom<string>(`HARDWARE_SPEC: 
- Type: 2WD Arduino Robotics Platform (EVA Body)
- Control: HTTPS API via Nginx Proxy
- Sensors: Front Ultrasonic, Front Wide-Angle Camera
- Capabilities: Proportional speed control, Timed pulses, Mission memory.`);

export const MissionStateAtom = atom<string>('Standby');
export const OrderStorageAtom = atom<Record<string, string>>({}); 
export const ActionHistoryAtom = atom<string[]>([]); 

export const SystemPromptAtom = atom<string>(`You are EVA's Vision Pilot. Your job is to execute the CURRENT MISSION autonomously.
Mission Context: Navigate Lazar's environment safely.
Input: Camera feed + Current Objective.
Output: JSON { "reasoning": "string", "command": "fwd" | "left" | "right" | "stop" | "bwd", "confidence": 0.0-1.0 }
Autonomous Behavior:
- If Mission is "Standby": Remain stationary or explore slowly.
- If Mission is "Navigate to [X]": Actively look for [X] and move towards it.
- Obstacle Avoidance: Always override commands if distance < 30cm.`);

export const TuningParamsAtom = atom({
  speed: 180,
  turnSpeed: 140,
  turnMs: 600,
  minPower: 80,
  pulseMs: 1000,
  safeDist: 35,
  aiSmooth: 50,
  temperature: 0.2,
  cycle: 2000
});

export const AiThoughtAtom = atom<string>('EVA Neural Core: Awaiting Lazar...');
export const SelectedModelAtom = atom('gemini-robotics-er-1.5-preview');

// Spatial support
export const DetectTypeAtom = atom<DetectTypes>('2D bounding boxes');
export const PromptsAtom = atom<Record<string, string[]>>(defaultPromptParts);
export const BoundingBoxes2DAtom = atom<BoundingBox2DType[]>([]);
export const ImageSrcAtom = atom<string | null>(null);
export const IsThinkingEnabledAtom = atom<boolean>(false);
export const RequestJsonAtom = atom<string>('');
export const ResponseJsonAtom = atom<string>('');
export const TemperatureAtom = atom<number>(0.1);
export const HoverEnteredAtom = atom<boolean>(false);
export const IsUploadedImageAtom = atom<boolean>(false);
export const DrawModeAtom = atom<boolean>(false);
export const LinesAtom = atom<any[]>([]);
export const ActiveColorAtom = atom<string>('rgb(0, 0, 0)');
export const IsLoadingAtom = atom<boolean>(false);
export const PointsAtom = atom<PointingType[]>([]);
export const BoundingBoxMasksAtom = atom<BoundingBoxMaskType[]>([]);
export const BumpSessionAtom = atom<number>(0);
export const ImageSentAtom = atom<boolean>(false);
export const RevealOnHoverModeAtom = atom<boolean>(false);
