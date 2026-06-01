import {postJson} from '../../shared/api';
import type {LiveTokenResponse} from '../../types/api';

export async function requestLiveToken() {
  const response = await postJson<LiveTokenResponse>('/api/live/token', {});
  if (!response.token) {
    throw new Error('Live token response did not include a token.');
  }

  return response;
}
