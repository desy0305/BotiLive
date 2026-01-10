
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
- Body: 2WD Arduino Differential Drive.
- Logic: High-Level JSON Navigation.
- Sensors: Front Ultrasonic, Wide-Angle Camera.`);

export const MissionStateAtom = atom<string>('Standby');
export const OrderStorageAtom = atom<Record<string, string>>({}); 
export const ActionHistoryAtom = atom<string[]>([]); 

export const SystemPromptAtom = atom<string>(`ACT AS: EVA Autonomous Neural Core.
BEHAVIOR PROTOCOLS:
1. STANDBY: Remain stationary. Monitor telemetry.
2. AUTOPILOT: Aggressively navigate towards the user's defined target landmarks.
3. PATROL: Execute slow, methodical movements to scan the environment for changes.
4. SECURITY BOT: Focus on tracking moving objects. Stop and alert if significant movement detected.
5. VISION GUIDED: Follow the most prominent object/person in the center of the frame.
6. AI LIVE CONTROL: Robot acts as a physical avatar for the Live Voice model.

LOGIC:
- Safety: If Distance < 30cm, Force 'stop'.
- Motor: Confidence > 0.45 required for movement.`);

export const TuningParamsAtom = atom({
  speed: 210,
  turnSpeed: 170,
  turnMs: 750,
  minPower: 125,
  pulseMs: 1200,
  safeDist: 30,
  aiSmooth: 50,
  temperature: 0.1,
  cycle: 2200
});

export const AiThoughtAtom = atom<string>('EVA: Neural Core Initialized.');
export const SelectedModelAtom = atom('gemini-3-flash-preview');

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
