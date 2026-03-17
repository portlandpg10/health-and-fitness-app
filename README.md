# Health & Fitness App

A full-stack health and fitness web app with weight tracking, workout creation (LLM-powered), workout history, and lift tracking. Deployable via Portainer from GitHub.

## Features

- **Weight Tracker**: Daily steps (1k increments), bad calories (100 increments), weight. Mobile-friendly form, desktop table/graphs, regression model.
- **Workout Creator**: Generate weekly workouts via LLM, edit on mobile, considers recent history.
- **Single Workout Display**: TV-optimized view for gym (Roku browser).
- **Current Lifts Display**: TV-optimized view of lift values.
- **Workout History**: Log completed workouts, view details.
- **Current Lift Values**: Add/edit lifts with weight and volume (e.g. 3×5).
- **PIN Auth**: Optional PIN protection via `AUTH_PIN` env var.

## Development

```bash
npm run install:all
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Production (Docker)

```bash
docker compose up -d
```

Or deploy via Portainer: create a stack from this repo, set build context to the repo root, use `docker-compose.yml`.

## Environment

Copy `.env.example` to `.env` and configure:

- `AUTH_PIN` - 4-8 digit PIN (hashed). Omit for no auth on trusted LAN.
- `ANTHROPIC_API_KEY` - For LLM workout generation (Claude). Omit to use fallback templates.
- `ANTHROPIC_MODEL` - Optional, Claude model (default: `claude-3-5-sonnet-20241022`).
- `DATABASE_PATH` - SQLite path (default: `./data/health.db`).

## TV Display URLs

- Workout: `/workout/:id/display`
- Lifts: `/lifts/display`

Open in Roku browser or cast from phone.
