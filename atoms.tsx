
import {atom} from 'jotai';
import {DetectTypes, BoundingBox2DType, BoundingBoxMaskType, PointingType} from './Types';
import {defaultPromptParts} from './consts';

export const RobotIpAtom = atom<string>('192.168.0.119');
export const IsAiActiveAtom = atom<boolean>(false); 
export const IsLiveActiveAtom = atom<boolean>(false);
export const RobotDistanceAtom = atom<number>(-1);
export const RobotModeAtom = atom<string>('UNKNOWN');
export const LogsAtom = atom<string[]>([]);
export const HasApiKeySelectedAtom = atom<boolean>(false);

export const HardwareContextAtom = atom<string>(`HARDWARE_SPEC: 
- Type: 2WD Arduino Robot Car
- Camera: Forward Mounted
- Ultrasonic: Front-Facing HC-SR04
- Safety: Stop if Distance < 30cm.`);

export const MissionStateAtom = atom<string>('Standby');
export const OrderStorageAtom = atom<Record<string, string>>({}); 
export const ActionHistoryAtom = atom<string[]>([]); 

export const SystemPromptAtom = atom<string>(`You are an AI Waitress and Concierge Robot.
Your job is to navigate safely, interact with customers, and remember orders.
If you see a human, greet them. If you take an order, save it to memory.
ALWAYS respect the SENSOR DATA distance threshold.`);

export const TuningParamsAtom = atom({
  speed: 180,
  turnSpeed: 150,
  duration: 450,
  safeDist: 30,
  cycle: 1500,
  temperature: 0.1
});

export const AiThoughtAtom = atom<string>('Neural Core Initialized...');
export const SelectedModelAtom = atom('gemini-robotics-er-1.5-preview');

// Legacy/Spatial support
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
