# Copilot instructions for this repository

## Build, test, and lint commands

- `npm run dev` starts the Vite frontend and Express API together. The frontend is at `http://localhost:5173`; the API listens on `http://localhost:3001`. For separate deployments, build the frontend with `VITE_API_BASE_URL=https://api.example.com`, configure the backend `FRONTEND_ORIGINS=https://studio.example.com`, and deploy `dist/` and the Express server independently. Cross-origin API requests use credentialed CORS and secure SameSite=None session cookies in production.
- `npm run build` runs the TypeScript check and builds the frontend into `dist/`.
- `npm run lint` runs the TypeScript compiler without emitting files.
- There is no test suite configured yet. When adding tests, use the project's chosen test runner and document its focused single-test command here.
- `npm start` starts the Express API server only; deploy the Vite `dist/` build separately.

## High-level architecture

- `src/App.tsx` is the React workspace: it owns the home inspiration/showcase, independent canvas and script project libraries/editors, draggable canvas, inspector, and account/character/work management views.
- `src/styles.css` contains the visual system and the CSS-drawn scene artwork; the scene art does not depend on external image assets.
- `src/types.ts` defines the frontend project and scene data shapes.
- `server/index.js` exposes the Express API: `data/accounts.json` stores accounts, credit balances, transaction records, and encrypted per-category model settings (`chat`, `image`, `video`, `audio`); legacy single-model settings are migrated to `chat` when loaded. Each project is stored separately under `data/projects/<user-id>/<project-id>.json`. Set `DATA_DIRECTORY` to override the local JSON data directory.
- Authentication uses scrypt password hashes and HttpOnly SameSite session cookies; only token hashes are persisted, with a 7-day expiry. Account/profile, recharge, project, model settings, and script-breakdown routes require a session.
- Backend-only consumption monitoring is available at `GET /internal/observability/usage?window=1h|24h|7d|30d` and as an SSE stream at `/internal/observability/usage/events`. Both require `Authorization: Bearer $OBSERVABILITY_TOKEN`; configure the same random token of at least 32 characters on the API server and the monitoring terminal. Start the dashboard with `npm run monitor` (optional `OBSERVABILITY_WINDOW=1h|24h|7d|30d`). These endpoints are not used by or displayed in the frontend.
- `POST /api/account/recharge` is a test-only simulated recharge; it does not collect money. Model settings are independently saved, tested, and cleared using `PUT /api/account/model` and `POST /api/account/model/test` with a `kind` of `chat`, `image`, `video`, or `audio`. `POST /api/tools/breakdown` uses only the chat model, falling back to local sentence splitting if no chat model is configured; model-backed breakdowns cost 5 credits. Other model categories are connection settings only until their generation tools are separately integrated.
- Model API keys are encrypted with AES-256-GCM. Set a stable `MODEL_CONFIG_SECRET` for deployment and do not rotate it while encrypted keys remain; local development can create a private key file under ignored `data/`.
- In development, Vite proxies `/api` requests to `http://localhost:3001` by default; override with `VITE_DEV_API_PROXY_TARGET`. In deployments, `VITE_API_BASE_URL` points the frontend directly to its separately hosted API.

## Key conventions

- Keep the project payload shape consistent between `src/types.ts`, the API validation in `server/index.js`, and per-user project JSON files.
- Scene positions (`x`, `y`) are canvas-world coordinates. Apply canvas pan/zoom to the world container, not to individual scene data.
- Project CRUD uses authenticated `/api/projects` endpoints. Canvas projects (`projectType: "canvas"`) and script projects (`projectType: "script"`) are separate saved documents; frontend edits flow through `updateProject` / `updateScene` and trigger a debounced `PUT /api/projects/:id`.
- The script editor imports `.txt`, `.text`, `.md`, `.markdown`, and `.docx` files locally; DOCX text extraction is loaded on demand, and imported text updates the current script project through the existing autosave flow.
- The SKILL workspace offers built-in creative prompt presets, imports custom `.md`/`.txt`/`.skill` instructions, and stores each user's multi-selection and prompt template through authenticated `/api/account/skills` endpoints in `data/accounts.json`. The script editor's Skill picker supports combining several skills, and the breakdown request includes all selected instructions in the rendered `{skill}` and `{script}` template when using the configured chat model; local sentence splitting does not execute prompts.
- Keep home, project libraries, individual editors, characters, work management, and account settings as distinct `activeNav` views rather than merging their content into the canvas editor.
- Keep API errors explicit and return JSON error messages; the frontend surfaces them as toast notifications.
- Account, credit, and project data use local JSON persistence for this MVP. Do not assume an external database, payment gateway, email verification service, or image/video-generation service exists.
- There is no admin account bootstrap or management UI/API. The terminal dashboard is read-only. Consumption telemetry is built from persisted usage transactions; newly successful model-backed breakdowns are published immediately to connected SSE monitor clients.
