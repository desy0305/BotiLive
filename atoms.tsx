
import {atom} from 'jotai';
import {DetectTypes, BoundingBox2DType, BoundingBoxMaskType, PointingType} from './Types';
import {defaultPromptParts} from './consts';

export const RobotIpAtom = atom<string>('192.168.0.119');
export const IsAiActiveAtom = atom<boolean>(false); // Vision Pilot Navigation
export const IsLiveActiveAtom = atom<boolean>(false); // Live Conversational Brain
export const RobotDistanceAtom = atom<number>(-1);
export const RobotModeAtom = atom<string>('UNKNOWN');
export const LogsAtom = atom<string[]>([]);

export const HardwareContextAtom = atom<string>(`HARDWARE_SPEC: 
- Type: 2WD Arduino Robot Car
- Camera: Forward Mounted
- Ultrasonic: Front-Facing HC-SR04
- Safety: CRITICAL! Stop if Distance < 30cm.`);

export const MissionStateAtom = atom<string>('Awaiting orders...');
export const OrderStorageAtom = atom<Record<string, string>>({}); // Table Memory
export const ActionHistoryAtom = atom<string[]>([]); // Rolling action log

export const SystemPromptAtom = atom<string>(`You are an AI Waitress/Concierge Robot.
NAV LOGIC:
1. React to "SENSOR DATA" first. If distance is low, HALT or TURN.
2. Follow Mission State instructions.
3. Keep track of customer orders in the log.
4. Use "move_robot" to navigate physically.`);

export const TuningParamsAtom = atom({
  speed: 180,
  turnSpeed: 150,
  duration: 400,
  safeDist: 30,
  cycle: 1500, // Vision pulse speed
  temperature: 0.1
});

export const AiThoughtAtom = atom<string>('Standby...');
export const SelectedModelAtom = atom('gemini-2.5-flash-latest');

// Spatial/Legacy Support
export const DetectTypeAtom = atom<DetectTypes>('2D bounding boxes');
export const PromptsAtom = atom<Record<string, string[]>>(defaultPromptParts);
export const BoundingBoxes2DAtom = atom<BoundingBox2DType[]>([]);
export const ImageSrcAtom = atom<string | null>(null);
export const IsThinkingEnabledAtom = atom<boolean>(false);
export const RequestJsonAtom = atom<string>('');
export const ResponseJsonAtom = atom<string>('');
export const TemperatureAtom = atom<number>(0.1);

// Added missing atoms identified by component errors
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
