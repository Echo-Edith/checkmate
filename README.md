# Checkm8

An AI-powered chess learning platform: play against Stockfish, solve puzzles, take lessons,
analyse games and ask an AI tutor.

**Stack:** Next.js (App Router) · TypeScript (strict) · Tailwind CSS · Supabase Auth (auth only) ·
MongoDB Atlas (all app data) · chess.js · Stockfish WASM · Google Gemini · Vercel

## Features

| Area | What it does |
| --- | --- |
| `/play` | Drag-and-drop and click-to-move board, castling, en passant, promotion, check/checkmate/stalemate/draw detection, history navigation, play vs Stockfish (5 levels) or two players, hints, resign |
| `/puzzles` | 14 tactics with difficulty filters, two-level hints (level 2 from the Coach AI), streaks, accuracy |
| `/lessons` | 16 lessons (beginner, intermediate, advanced) with interactive practice positions and saved progress |
| `/analyze` | Stockfish classifies every move (best, good, inaccuracy, mistake, blunder), missed chances, accuracy, eval graph, AI explanations |
| `/profile` | Statistics, recent games, username/bio, theme, board colours, favourite tutor |
| AI tutor | Teacher, Coach and Analyst personalities. Gemini only states evaluations that Stockfish produced |

## Setup

### 1. Install

```bash
npm install
```

`postinstall` copies the Stockfish engine files from `node_modules/stockfish` into `public/stockfish/`
(they are not committed). If the engine does not load, check that `public/stockfish/stockfish.js`
and `stockfish.wasm` exist.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in (never commit `.env.local`):

| Variable | Where it is used | Public? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client | yes |
| `MONGODB_URI` | Server only (MongoDB driver) | **no** |
| `GEMINI_API_KEY` | Server only (`/api/tutor`) | **no** |
| `GEMINI_MODEL` (optional) | Server only. Defaults to `gemini-flash-latest` | no |

Add the same variables in **Vercel → Project → Settings → Environment Variables**.
`.env.local` is not uploaded to Vercel automatically.

### 3. Supabase

1. Authentication → URL Configuration:
   - Site URL: your production URL.
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR-APP.vercel.app/auth/callback`.
2. Only Supabase Auth is used. Do not create application tables in Supabase.

### 4. MongoDB Atlas

- Database name: `checkm8`. Collections are created automatically: `profiles`, `progress`, `games`.
- Network Access: allow `0.0.0.0/0` (Vercel uses changing IP addresses).
- Indexes are created automatically on first use (`userId` unique on `profiles` and `progress`,
  `userId + createdAt` on `games`).

### 5. Run

```bash
npm run validate:content   # checks every lesson/puzzle position with chess.js
npm run typecheck
npm run dev
```

## Security notes

- The user ID always comes from the verified Supabase session (`getUser()`), never from the request body.
- Every MongoDB query for user data filters by that user ID. All database access happens on the server.
- Lesson and puzzle progress is re-verified on the server: the submitted moves must actually solve the position.
- Game results are computed on the server by replaying the moves with chess.js.
- Gemini and MongoDB credentials are server-only. `/api/tutor` requires login and is rate limited.
- Profile updates use a strict schema, so stats and `userId` cannot be written by the client.

## Storage

The target is about 250 KB per user on the free Atlas tier (512 MB).
Games are stored as SAN text (a game is roughly 0.5 KB), progress is one small document per user,
and engine output and the AI chat history are never stored. A single account can save at most
300 games; nothing is deleted automatically.

## Licence note: Stockfish

Stockfish is licensed under the **GNU GPL v3**. The engine files in `public/stockfish/` come from the
`stockfish` npm package. If you distribute this application, make the corresponding Stockfish source
available and keep `public/stockfish/NOTICE.md` and the licence text.
