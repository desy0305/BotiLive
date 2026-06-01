import {postJson} from '../../shared/api';
import type {RobotDirection, VisionDecision, VisionDecisionRequest} from '../../types/api';

const ROBOT_DIRECTIONS = new Set<RobotDirection>(['fwd', 'bwd', 'left', 'right', 'stop']);

interface RequestOptions {
  signal?: AbortSignal;
}

function getDecisionPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && 'decision' in payload) {
    const decision = (payload as {decision?: unknown}).decision;
    if (decision && typeof decision === 'object') {
      return decision as Record<string, unknown>;
    }
  }

  return (payload ?? {}) as Record<string, unknown>;
}

export async function requestVisionDecision(
  request: VisionDecisionRequest,
  options?: RequestOptions,
): Promise<VisionDecision> {
  const payload = await postJson<unknown>('/api/ai/vision-decision', request, options);
  const decision = getDecisionPayload(payload);
  const command = typeof decision.command === 'string' ? decision.command.toLowerCase() : 'stop';
  const confidence = Number(decision.confidence ?? 0);

  return {
    reasoning: typeof decision.reasoning === 'string' ? decision.reasoning : 'No reasoning returned.',
    command: ROBOT_DIRECTIONS.has(command as RobotDirection) ? (command as RobotDirection) : 'stop',
    confidence: Number.isFinite(confidence) ? confidence : 0,
    speed: Number.isFinite(Number(decision.speed)) ? Number(decision.speed) : undefined,
    durationMs: Number.isFinite(Number(decision.durationMs)) ? Number(decision.durationMs) : undefined,
    rawText: typeof decision.rawText === 'string' ? decision.rawText : undefined,
    trace: decision.trace && typeof decision.trace === 'object' ? (decision.trace as VisionDecision['trace']) : undefined,
  };
}
