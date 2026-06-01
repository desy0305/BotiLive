import {GoogleGenAI, Type} from '@google/genai';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

type RobotDirection = 'fwd' | 'bwd' | 'left' | 'right' | 'stop';

interface Env {
  port: number;
  geminiApiKey: string;
  autonomyModel: string;
  fallbackModel: string;
  liveModel: string;
  robotBaseUrl: string;
  robotAllowedHosts: string[];
  robotCommandTimeoutMs: number;
  robotMinDistanceCm: number;
  liveTokenTtlSeconds: number;
  liveTokenStartSeconds: number;
  allowedOrigins: string[];
}

interface VisionDecision {
  reasoning: string;
  command: RobotDirection;
  confidence: number;
  speed?: number;
  durationMs?: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');
const staticDir = path.join(rootDir, 'dist');
const directions = new Set<RobotDirection>(['fwd', 'bwd', 'left', 'right', 'stop']);

loadDotEnv(path.join(rootDir, '.env'));

const env = readEnv();

const ai = env.geminiApiKey ? new GoogleGenAI({apiKey: env.geminiApiKey}) : null;

function loadDotEnv(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readEnv(): Env {
  const robotBaseUrl = process.env.ROBOT_BASE_URL || 'http://agv.e-scm.org';
  const defaultRobotHost = new URL(normalizeBaseUrl(robotBaseUrl)).hostname;
  return {
    port: intEnv('PORT', 50055, 1, 65535),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    autonomyModel: process.env.GEMINI_AUTONOMY_MODEL || 'gemini-robotics-er-1.6-preview',
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash',
    liveModel: process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview',
    robotBaseUrl,
    robotAllowedHosts: csvEnv('ROBOT_ALLOWED_HOSTS', defaultRobotHost),
    robotCommandTimeoutMs: intEnv('ROBOT_COMMAND_TIMEOUT_MS', 1500, 100, 10000),
    robotMinDistanceCm: intEnv('ROBOT_MIN_DISTANCE_CM', 30, 1, 500),
    liveTokenTtlSeconds: intEnv('LIVE_TOKEN_TTL_SECONDS', 1800, 60, 1800),
    liveTokenStartSeconds: intEnv('LIVE_TOKEN_START_SECONDS', 60, 15, 300),
    allowedOrigins: csvEnv('ALLOWED_ORIGINS', 'http://localhost:50055'),
  };
}

function intEnv(key: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[key]);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function csvEnv(key: string, fallback: string) {
  return (process.env[key] || fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value: string) {
  const raw = value.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

function clamp(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function robotBaseUrl(input?: unknown) {
  const raw = typeof input === 'string' && input.trim() ? input : env.robotBaseUrl;
  const url = new URL(normalizeBaseUrl(raw));
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw httpError(400, 'Robot URL must use HTTP or HTTPS.');
  }
  if (!env.robotAllowedHosts.includes(url.hostname)) {
    throw httpError(403, `Robot host is not allowed: ${url.hostname}`);
  }
  return url.origin;
}

function httpError(status: number, message: string) {
  const error = new Error(message) as Error & {status?: number};
  error.status = status;
  return error;
}

function setCommonHeaders(req: IncomingMessage, res: ServerResponse, contentType = 'application/json') {
  const origin = req.headers.origin;
  if (origin && (env.allowedOrigins.includes(origin) || env.allowedOrigins.includes('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self)');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com;"
  );
}

function sendJson(req: IncomingMessage, res: ServerResponse, status: number, value: unknown) {
  setCommonHeaders(req, res);
  res.statusCode = status;
  res.end(JSON.stringify(value));
}

function sendNoContent(req: IncomingMessage, res: ServerResponse) {
  setCommonHeaders(req, res);
  res.statusCode = 204;
  res.end();
}

async function readJson(req: IncomingMessage, limitBytes = 6 * 1024 * 1024) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > limitBytes) {
      throw httpError(413, 'Request body is too large.');
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = env.robotCommandTimeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(id);
  }
}

async function sendRobotMove(baseUrl: string, dir: RobotDirection, speed: number) {
  const url = new URL('/move', baseUrl);
  url.searchParams.set('dir', dir);
  if (dir !== 'stop') {
    url.searchParams.set('speed', String(speed));
  }
  return fetchWithTimeout(url.toString(), {method: 'GET'});
}

async function handleVisionDecision(req: IncomingMessage, res: ServerResponse) {
  if (!ai) {
    throw httpError(503, 'GEMINI_API_KEY is not configured on the server.');
  }

  const body = await readJson(req);
  const image = (body.image ?? {}) as Record<string, unknown>;
  const context = (body.context ?? {}) as Record<string, unknown>;
  const generationConfig = (body.generationConfig ?? {}) as Record<string, unknown>;
  const imageData = typeof image.data === 'string' ? image.data : '';
  if (!imageData || imageData.length > 4_000_000) {
    throw httpError(400, 'A valid JPEG image payload is required.');
  }

  const model = chooseVisionModel(body.model);
  const thinkingBudget = clamp(generationConfig.thinkingBudget, 0, 0, 24576);
  const temperature = Math.min(1, Math.max(0, Number(generationConfig.temperature ?? 0.1)));

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          text: [
            'You are BotiLive autonomous robotics control.',
            'Return only JSON matching the schema. Prefer stop when uncertain or unsafe.',
            `System prompt: ${String(context.systemPrompt ?? '')}`,
            `Hardware: ${String(context.hardwareContext ?? '')}`,
            `Mission: ${String(context.mission ?? 'Standby')}`,
            `Memory: ${JSON.stringify(context.memory ?? {})}`,
            `Distance: ${Number(context.distanceCm ?? -1)}cm`,
            `Safe distance: ${Number(context.safeDistanceCm ?? env.robotMinDistanceCm)}cm`,
          ].join('\n'),
        },
        {inlineData: {mimeType: 'image/jpeg', data: imageData}},
      ],
    },
    config: {
      responseMimeType: 'application/json',
      temperature,
      thinkingConfig: model.includes('robotics') ? {thinkingBudget} : {thinkingLevel: thinkingBudget > 0 ? 'low' : 'minimal'},
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reasoning: {type: Type.STRING},
          command: {type: Type.STRING, enum: ['fwd', 'left', 'right', 'bwd', 'stop']},
          confidence: {type: Type.NUMBER},
          speed: {type: Type.NUMBER},
          durationMs: {type: Type.NUMBER},
        },
        required: ['reasoning', 'command', 'confidence'],
      },
    },
  } as never);

  const text = String(response.text ?? '{}');
  const decision = sanitizeDecision(JSON.parse(text) as Record<string, unknown>);
  sendJson(req, res, 200, {decision});
}

function chooseVisionModel(value: unknown) {
  const requested = typeof value === 'string' ? value : '';
  const allowed = new Set([env.autonomyModel, env.fallbackModel]);
  return allowed.has(requested) ? requested : env.autonomyModel;
}

function sanitizeDecision(raw: Record<string, unknown>): VisionDecision {
  const command = typeof raw.command === 'string' ? raw.command.toLowerCase() : 'stop';
  const safeCommand = directions.has(command as RobotDirection) ? (command as RobotDirection) : 'stop';
  return {
    reasoning: typeof raw.reasoning === 'string' && raw.reasoning.trim() ? raw.reasoning.slice(0, 1000) : 'No reasoning returned.',
    command: safeCommand,
    confidence: Math.min(1, Math.max(0, Number(raw.confidence ?? 0))),
    speed: clamp(raw.speed, safeCommand === 'fwd' || safeCommand === 'bwd' ? 210 : 170, 0, 255),
    durationMs: clamp(raw.durationMs, 750, 0, 5000),
  };
}

async function handleLiveToken(req: IncomingMessage, res: ServerResponse) {
  if (!ai) {
    throw httpError(503, 'GEMINI_API_KEY is not configured on the server.');
  }

  await readJson(req, 1024);
  const expiresAt = new Date(Date.now() + env.liveTokenTtlSeconds * 1000);
  const newSessionExpiresAt = new Date(Date.now() + env.liveTokenStartSeconds * 1000);
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt.toISOString(),
      newSessionExpireTime: newSessionExpiresAt,
      liveConnectConstraints: {
        model: env.liveModel,
        config: {
          sessionResumption: {},
          temperature: 0.7,
          responseModalities: ['AUDIO'],
          thinkingConfig: {thinkingLevel: 'minimal'},
        },
      },
      httpOptions: {apiVersion: 'v1alpha'},
    },
  } as never);

  res.setHeader('Cache-Control', 'no-store');
  sendJson(req, res, 200, {token: token.name, model: env.liveModel, expiresAt: expiresAt.toISOString()});
}

async function handleRobotStatus(req: IncomingMessage, res: ServerResponse, url: URL) {
  const baseUrl = robotBaseUrl(url.searchParams.get('address') || url.searchParams.get('baseUrl') || undefined);
  try {
    const response = await fetchWithTimeout(new URL('/status', baseUrl).toString(), {method: 'GET'});
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    sendJson(req, res, response.ok ? 200 : 502, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Robot bridge is unavailable.';
    sendJson(req, res, 503, {d: -1, m: 'OFFLINE', error: message});
  }
}

async function handleRobotMove(req: IncomingMessage, res: ServerResponse) {
  const body = await readJson(req, 32 * 1024);
  const baseUrl = robotBaseUrl(body.address ?? body.baseUrl);
  const rawDir = typeof body.dir === 'string' ? body.dir.toLowerCase() : 'stop';
  if (!directions.has(rawDir as RobotDirection)) {
    throw httpError(400, 'Invalid robot direction.');
  }
  const dir = rawDir as RobotDirection;
  const speed = clamp(body.speed, 160, 0, 255);
  const durationMs = clamp(body.durationMs, dir === 'stop' ? 0 : 750, 0, 5000);

  try {
    const response = await sendRobotMove(baseUrl, dir, speed);
    if (dir !== 'stop' && durationMs > 0) {
      setTimeout(() => {
        void sendRobotMove(baseUrl, 'stop', 0).catch(() => undefined);
      }, durationMs);
    }
    sendJson(req, res, response.ok ? 200 : 502, {ok: response.ok, dir, speed, durationMs});
  } catch (error) {
    if (dir !== 'stop') {
      await sendRobotMove(baseUrl, 'stop', 0).catch(() => undefined);
    }
    throw error;
  }
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL) {
  const pathname = decodeURIComponent(url.pathname);
  const requested = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.normalize(path.join(staticDir, requested));
  if (!resolved.startsWith(staticDir)) {
    throw httpError(403, 'Forbidden.');
  }

  const file = existsSync(resolved) && statSync(resolved).isFile() ? resolved : path.join(staticDir, 'index.html');
  const content = await readFile(file);
  setCommonHeaders(req, res, contentType(file));
  if (path.basename(file) === 'index.html') {
    res.setHeader('Cache-Control', 'no-store');
  }
  res.statusCode = 200;
  res.end(content);
}

function contentType(file: string) {
  const ext = path.extname(file);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    return sendNoContent(req, res);
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
    return sendJson(req, res, 200, {ok: true, service: 'botilive', hasGeminiKey: Boolean(env.geminiApiKey)});
  }

  if (req.method === 'GET' && url.pathname === '/api/config') {
    return sendJson(req, res, 200, {
      models: {autonomy: env.autonomyModel, fallback: env.fallbackModel, live: env.liveModel},
      robot: {
        baseUrl: env.robotBaseUrl,
        allowedHosts: env.robotAllowedHosts,
        commandTimeoutMs: env.robotCommandTimeoutMs,
        minDistanceCm: env.robotMinDistanceCm,
      },
      hasGeminiKey: Boolean(env.geminiApiKey),
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/ai/vision-decision') {
    return handleVisionDecision(req, res);
  }

  if (req.method === 'POST' && url.pathname === '/api/live/token') {
    return handleLiveToken(req, res);
  }

  if (req.method === 'GET' && url.pathname === '/api/robot/status') {
    return handleRobotStatus(req, res, url);
  }

  if (req.method === 'POST' && url.pathname === '/api/robot/move') {
    return handleRobotMove(req, res);
  }

  if (url.pathname.startsWith('/api/')) {
    throw httpError(404, 'API route not found.');
  }

  return serveStatic(req, res, url);
}

const server = createServer((req, res) => {
  route(req, res).catch((error: unknown) => {
    const status = typeof error === 'object' && error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Internal server error.';
    sendJson(req, res, status, {error: message});
  });
});

server.listen(env.port, '0.0.0.0', () => {
  console.log(`BotiLive server listening on http://0.0.0.0:${env.port}`);
});
