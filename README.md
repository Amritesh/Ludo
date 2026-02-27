# Ludo Tactical Edition

A real-time, rule-accurate, mobile-first Ludo game with advanced tactical mechanics, built with React, Next.js, and Ably.

## ⚔️ Tactical Edition Rules

### 🎲 Strategic Dice Bank
- **Bank-based Turn**: Instead of moving immediately, rolls are stored in a **Dice Bank**.
- **Bonus Rolls**: Rolling a 6, landing on an Arrow Tail, or capturing a piece adds extra dice to your bank.
- **Sequencing**: You must spend ALL dice in your bank to finish your turn.
- **Auto-Execution**: If a selected piece has only one legal move, it auto-executes.

### 🛡️ Stacking & Combat
- **Heavy Pair (2 Tokens)**: Moves only on even rolls (2, 4, 6) at half speed. Immune to capture by single tokens.
- **Invincible Stack (3-4 Tokens)**: Completely immune to capture and acts as a blockade.
- **Allied Stack**: Tokens from allied houses (Diagonal: Red↔Yellow, Green↔Blue) form an invincible shield when on the same square.
- **Coexistence**: A single token can land on an enemy Heavy Pair without capture (Sits on top).

### 🏹 Arrow Power
- **Outer Track Glide**: Landing on an arrow tail glides you to the head and grants a bonus roll.
- **Inner Turning Track**: Eligible tokens can take shortcuts into the home stretch.

### 🏠 Home Stretch Constraint
- **Strict Total Sum**: If your ONLY movable tokens are in the home stretch, and the total bank sum exceeds the exact steps needed to finish, the **entire bank is discarded** and your turn ends.

## 🤖 AI Tiers
- **Easy**: Greedy logic, prioritizes pieces closest to start.
- **Medium**: Scans for kills, uses arrows, protects safe zones.
- **Hard**: Evaluates full bank sequences, forms tactical stacks, and avoids home-stretch discard traps.

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
