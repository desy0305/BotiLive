# BotiLive

BotiLive is an open-source robotics operator console for live robot supervision,
Gemini-assisted perception, and guarded command dispatch. The project is being
refactored around a server-side security boundary: browser clients should never
receive API keys, long-lived live-session tokens, or unrestricted robot-control
endpoints.

## Project Goals

- Provide a practical operator UI for robotics demos, testing, and supervised
  field work.
- Keep Gemini API access and robot command authorization on the server.
- Restrict robot network access to explicit allowlists and short command
  timeouts.
- Make local development reproducible without committing secrets.

## Local Development

Prerequisites:

- Node.js 22 or newer
- npm
- A Gemini API key stored only in your local server environment

Install dependencies:

```sh
npm install
```

Create a local environment file for the server from the checked-in example:

```sh
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` to a real key on your machine or deployment
secret store. Do not commit `.env`, `.env.local`, service account files, tokens,
or private keys.

Run the development UI:

```sh
npm run dev
```

Build the UI:

```sh
npm run build
```

Run the production server locally after a build:

```sh
npm start
```

The Vite dev server proxies API calls to `http://localhost:50055`, so start the
Node server or Docker container when testing AI, live audio, or robot proxy
features.

## Docker

BotiLive ships as a single container that serves the React app and the Node API
on port `50055`.

```sh
cp .env.example .env
# edit .env and set GEMINI_API_KEY locally
docker compose up -d --build
curl http://localhost:50055/healthz
```

The app is available at <http://localhost:50055>. If `GEMINI_API_KEY` is not
configured, manual robot controls remain visible but Gemini Vision and Live
controls are disabled.

## API Surface

- `GET /healthz`: server health and key-configuration status.
- `GET /api/config`: non-secret model and robot guardrail configuration.
- `POST /api/ai/vision-decision`: server-side Gemini vision decision endpoint.
- `POST /api/live/token`: short-lived Live API ephemeral token endpoint.
- `GET /api/robot/status`: guarded robot status proxy.
- `POST /api/robot/move`: guarded robot movement proxy.

## Server Configuration

The server-side configuration surface is documented in [.env.example](.env.example).
Important controls include:

- `ROBOT_ALLOWED_HOSTS`: comma-separated allowlist for robot-control hosts.
- `ROBOT_COMMAND_TIMEOUT_MS`: maximum time a robot command may wait on the
  upstream robot endpoint.
- `ROBOT_MIN_DISTANCE_CM`: minimum obstacle distance guardrail used by robot
  command logic.
- `LIVE_TOKEN_TTL_SECONDS` and `LIVE_TOKEN_START_SECONDS`: live-session token
  lifetime and start window limits.
- `ALLOWED_ORIGINS`: comma-separated browser origins allowed to call the server.

## Security Notes

Key rotation and revocation guidance, plus read-only secret scanning commands,
are in [SECURITY.md](SECURITY.md).

## License

BotiLive is released under the MIT License. See [LICENSE](LICENSE).
