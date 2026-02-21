# Ludo - Web-based Multiplayer Game

A real-time, rule-accurate, mobile-first Ludo game built with React, Next.js, and Ably.

## Architecture
- **Frontend**: React + Vite + TypeScript + Framer Motion (Deployed to GitHub Pages)
- **Backend**: Next.js API Routes (Deployed to Vercel)
- **Real-time**: Ably Channels (WebSockets)
- **Persistence**: Upstash Redis

**Note on Real-time**: Vercel Functions do not support persistent WebSocket connections. This project uses [Ably](https://ably.com/) as a third-party real-time transport to enable low-latency updates while maintaining authoritative server-side logic in stateless Vercel environments.

## Local Development

### Prerequisites
- Node.js (v18+)
- Ably Account (Free tier)
- Upstash Redis Account (Free tier)

### Setup
1. Clone the repository.
2. Install dependencies in both folders:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
3. Configure environment variables:
   - Create `backend/.env` based on `backend/.env.example`.
   - Create `frontend/.env` based on `frontend/.env.example`.

### Running
Open two terminals:
- **Backend**: `cd backend && npm run dev` (Runs on port 3000)
- **Frontend**: `cd frontend && npm run dev` (Runs on port 5173)

## Deployment

### Backend (Vercel)
1. Push the `backend` folder to a new Vercel project (or link the repo and set Root Directory to `backend`).
2. Add environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ABLY_API_KEY`, `PUBLIC_FRONTEND_ORIGIN`.

### Frontend (GitHub Pages)
1. Set the GitHub Secret `VITE_API_URL` to your Vercel deployment URL.
2. The GitHub Action in `.github/workflows/deploy.yml` will automatically build and deploy to the `gh-pages` branch on push to `main`.

## Rules
- **Spawn**: Pieces spawn on the start square ONLY on rolling a 6.
- **Extra Turns**: Awarded for rolling a 6 or cutting an opponent's piece.
- **Cutting**: Landing on an opponent's piece sends it back to the yard (excluding safe squares).
- **Safe Squares**: Star-marked squares and the starting squares are safe.
- **Home Path**: Must roll an exact number to reach home.
- **Winning**: First player to get all 4 pieces home wins.

## AI & Reconnection
- AI takes over for players who disconnect for more than 10 seconds.
- Players can reconnect using their `sessionId` (stored in localStorage) to regain control.
- Bots can be added to the lobby by the creator.
