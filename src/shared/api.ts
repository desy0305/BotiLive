export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface JsonRequestOptions {
  signal?: AbortSignal;
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => undefined);
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  }

  const text = await response.text().catch(() => '');
  return text || `${response.status} ${response.statusText}`;
}

export async function postJson<T>(path: string, body: unknown, options: JsonRequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: options.signal,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export async function getJson<T>(path: string, options: JsonRequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    headers: {Accept: 'application/json'},
    cache: 'no-store',
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.json() as Promise<T>;
}

export function normalizeRobotAddress(address: string) {
  return address.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}
