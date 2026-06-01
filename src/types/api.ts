export type RobotDirection = 'fwd' | 'bwd' | 'left' | 'right' | 'stop';

export interface RobotMoveRequest {
  address: string;
  dir: RobotDirection;
  speed?: number;
  durationMs?: number;
}

export interface RobotMoveResponse {
  ok?: boolean;
  message?: string;
  dir?: RobotDirection;
  speed?: number;
  durationMs?: number;
  trace?: ApiTrace;
}

export interface RobotStatusResponse {
  d?: number;
  distance?: number;
  m?: string;
  mode?: string;
  error?: string;
  trace?: ApiTrace;
}

export interface VisionDecisionRequest {
  model: string;
  image: {
    mimeType: 'image/jpeg';
    data: string;
  };
  context: {
    systemPrompt: string;
    hardwareContext: string;
    mission: string;
    memory: Record<string, string>;
    distanceCm: number;
    safeDistanceCm: number;
  };
  generationConfig: {
    temperature: number;
    thinkingBudget: number;
  };
}

export interface VisionDecision {
  reasoning: string;
  command: RobotDirection;
  confidence: number;
  speed?: number;
  durationMs?: number;
  rawText?: string;
  trace?: ApiTrace;
}

export interface LiveTokenResponse {
  token: string;
  model: string;
  expiresAt?: string;
  trace?: ApiTrace;
}

export interface PublicConfigResponse {
  models: {
    autonomy: string;
    fallback: string;
    live: string;
  };
  robot: {
    baseUrl: string;
    allowedHosts: string[];
    commandTimeoutMs: number;
    minDistanceCm: number;
  };
  hasGeminiKey: boolean;
}

export interface ApiTrace {
  requestId: string;
  route: string;
  model?: string;
  latencyMs: number;
  status?: number;
}
