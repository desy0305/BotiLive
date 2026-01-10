
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
- Type: 2WD Arduino Robot Car
- Connectivity: HTTPS Proxy via agv.e-scm.org
- Camera: Forward Mounted
- Ultrasonic: Front-Facing HC-SR04
- Safety: Stop if Distance < 30cm.`);

export const MissionStateAtom = atom<string>('Standby');
export const OrderStorageAtom = atom<Record<string, string>>({}); 
export const ActionHistoryAtom = atom<string[]>([]); 

export const SystemPromptAtom = atom<string>(`You are a small 2-wheeled robot with SMOOTH speed-controlled movement.
Perspective: Obstacles closer to bottom are NEAR.
Mission: Navigate safely. Your CONFIDENCE value directly controls motor SPEED.
Output: JSON { "reasoning": "string", "command": "fwd" | "left" | "right" | "stop" | "bwd", "confidence": 0.0-1.0 }
Rules:
1. If path clearly open -> "fwd" with confidence 0.7-1.0 (faster)
2. If obstacle nearby -> "left"/"right" with confidence 0.3-0.6 (slower, cautious)
3. If obstacle very close (<15cm) -> "bwd" with confidence 0.5
4. Avoid oscillating directions.
5. Be SMOOTH - confidence controls speed.`);

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

export const AiThoughtAtom = atom<string>('Neural Core Online. Waiting for engage signal...');
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
