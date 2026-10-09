# Post Me

**Your social media, on autopilot.** Post Me is a multi-client website for social media auto-posting. It turns your content into branded images, narrated Reels/Shorts and long YouTube videos, and publishes them on a schedule to **Facebook, Instagram, YouTube and Telegram**.

The code was extracted from the content-generation and auto-posting part of [My Study Guide](https://github.com/naikoo68/My-Study-Guide).

## Repository layout

| Path | What it is |
|------|------------|
| `backend/` | Node.js + Express API. Handles scheduling, rendering (Puppeteer + ffmpeg + Cloudinary), narration (TTS), posting, clients (tenants) and auth. |
| `frontend/` | React + Vite website: landing page, login, and the Post Me panel. |
| `voice-server/` | Optional self-hosted voice-cloning service (Chatterbox) for the "My own voice" narrator. |
| `.github/workflows/` | CI, backend deploy, and voice-server deploy. |

## How clients work

- The **super-admin** (role `admin`, created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`) opens **Clients** in the panel. There they create a client, give it an admin login, and optionally a custom domain.
- Each **client admin** (role `institute_admin`) signs in and gets their own isolated social connections, schedules, profiles, voice and content.
- Isolation is enforced by `TENANT_ENFORCEMENT=on`, which is required in production. `backend/tests/tenantEnforcement.test.js` fails the build if it is missing.

## Panel

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/admin` | Connection status, number of posts published, quick links |
| Auto Posting | `/admin/facebook` | Connect Facebook/Instagram/Telegram/YouTube, schedules, reels, long videos, narration, branding |
| Cross-Posting | `/admin/cross-posting` | Extra profiles, each with its own pages, tokens and schedules |
| Voice Studio | `/admin/voice-studio` | Clone your own voice (needs `voice-server/`) |
| Clients | `/admin/clients` | Super-admin only: create and manage clients |

`/q-card/:id`, `/flashcard/:id` and `/slide-card/:id` are chrome-less pages that the backend screenshots to render post images. They must stay public, and `CLIENT_URL` must point at the deployed frontend.

## What gets posted

Posts are built from the content library: streams → subjects → topics → sessions → quizzes → questions (`/api/...` content routes), plus practice items (`/api/practice`). Content can be added through the existing content API, the question editor and the bulk upload in Auto Posting. A full content-library UI is not included yet.

## Local setup

```bash
# Backend
cd backend
npm install --legacy-peer-deps
cp .env.example .env        # set MONGO_URI, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD, Cloudinary
npm run dev                 # http://localhost:5000  (health: /api/health)

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

Rendering needs **Chromium** (`PUPPETEER_EXECUTABLE_PATH`) and **ffmpeg** (`FFMPEG_PATH`). The backend `Dockerfile` installs both.

## Checks

```bash
cd backend  && npm test                  # 70 test files (posting, rendering, tenant isolation)
cd frontend && npm test && npm run build
```

## Deploy

- **Backend:** `deploy-backend.yml` SSHes into your VM, builds `backend/Dockerfile`, and runs the `postme-backend` container on host port **5100** (put Nginx in front). It needs:
  - the repo secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (and optionally `AI_KEY_ENC_SECRET`)
  - the repo variable `DEPLOY_ENABLED=true`
  - `~/post-me/backend/postme.env` on the VM, copied from `backend/postme.env.example`
- **Voice server (optional):** run `deploy-voice.yml` manually. It needs at least 8 GB of RAM.
- **Frontend:** any static host (Cloudflare Pages, Netlify). Build `frontend/` with `VITE_API_URL` set to your API, and publish `frontend/dist`.
- The scheduler runs every minute inside the backend. On hosts that sleep, ping `/api/health` regularly; that also fires any posts that are due.
