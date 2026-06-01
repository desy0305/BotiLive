import {getJson, postJson, normalizeRobotAddress} from '../../shared/api';
import type {RobotDirection, RobotMoveResponse, RobotStatusResponse} from '../../types/api';

interface RequestOptions {
  signal?: AbortSignal;
}

function requireRobotAddress(address: string) {
  const normalized = normalizeRobotAddress(address);
  if (!normalized) {
    throw new Error('Robot bridge address is required.');
  }

  return normalized;
}

export function moveRobot(
  address: string,
  dir: RobotDirection,
  speed?: number,
  durationMs?: number,
  options?: RequestOptions,
) {
  return postJson<RobotMoveResponse>(
    '/api/robot/move',
    {
      address: requireRobotAddress(address),
      dir,
      ...(speed !== undefined ? {speed} : {}),
      ...(durationMs !== undefined ? {durationMs} : {}),
    },
    options,
  );
}

export function fetchRobotStatus(address: string, options?: RequestOptions) {
  const params = new URLSearchParams({address: requireRobotAddress(address)});
  return getJson<RobotStatusResponse>(`/api/robot/status?${params.toString()}`, options);
}
