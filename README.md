# IntentHunt

Social intent monitoring SaaS that finds buying-intent posts on Reddit, classifies them with AI, and auto-sends personalized DMs.

## Architecture

- **Backend**: Node.js + Express + Supabase + Claude API + Reddit API
- **Frontend**: React + Vite + TailwindCSS v4

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project (run `backend/src/db/schema.sql` in the SQL editor)
- Reddit OAuth app (https://www.reddit.com/prefs/apps — choose "web app")
- Anthropic API key

### Backend

```bash
cd backend
cp ../.env.example .env   # fill in your keys
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deploy

### Backend → Railway

1. Connect your repo to Railway
2. Set root directory to `/backend`
3. Add all environment variables from `.env.example`

### Frontend → Vercel

1. Connect your repo to Vercel
2. Set root directory to `/frontend`
3. Set `VITE_API_URL` to your Railway backend URL

## Features

- Reddit OAuth integration
- Real-time keyword + location scanning
- AI-powered intent classification (B2C/B2B/Noise, 0-100 score, urgency)
- Auto-DM engine with rate limiting (10/hr)
- Live lead feed with filters
- CSV export
- Setup wizard
- Message templates with placeholders
