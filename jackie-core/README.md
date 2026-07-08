# jackie-core

Persistent AI orchestrator for iPhone Safari on Vercel (Next.js 14).

## What is real now

- ✅ Next.js 14 app with App Router
- ✅ High-detail Jackie Global Terminal UI (theme/background controls, accessories, tool deck, command trail)
- ✅ Immutable `SYSTEM_PROMPT` genome in code (`src/lib/system-prompt.ts`)
- ✅ Model routing: Anthropic Sonnet primary, OpenAI `gpt-5` fallback
- ✅ Streaming chat responses
- ✅ Required no-key message: `Jackie here— No model keys set. Add ANTHROPIC_API_KEY or OPENAI_API_KEY in Vercel.`
- ✅ Memory pods wired to Supabase (`memory_pods`) with `/pod` support
- ✅ Session-summary auto-save per chat turn (`kind='session_summary'`)
- ✅ Bootstrap recall on new session (`/api/bootstrap`)
- ✅ Response guardrails: `Jackie here—` prefix (unless `/raw`), `/confirm` for irreversible intents
- ✅ Vercel Analytics integrated (`@vercel/analytics`)
- ✅ Route decision audit logs via `console.log`
- ✅ Optional Google Cloud Logging mirror for pod saves when `GCP_PROJECT_ID` is set
- ✅ SQL schema included at `supabase/memory_pods.sql`

## Roadmap / constraints

- ⚠️ Live Vercel URL is created only after deployment from your Vercel account.
- ⚠️ Next.js 14 has known advisories in upstream dependency data; pinning remains on 14 per request.

## Environment variables

Set these in Vercel Project Settings → Environment Variables:

- `ANTHROPIC_API_KEY` (primary model)
- `OPENAI_API_KEY` (fallback model)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GCP_PROJECT_ID` (optional)
- `GOOGLE_APPLICATION_CREDENTIALS` (optional for Cloud Logging auth when needed)
- `ANTHROPIC_MODEL` (optional override, default `claude-sonnet-4-5`)
- `OPENAI_MODEL` (optional override, default `gpt-5`)

## Deploy steps (Vercel)

1. Push this repo.
2. Import project in Vercel, root directory: `jackie-core`.
3. Add env vars above.
4. Deploy.

## Local run

```bash
cd jackie-core
npm install
npm run dev
```

## Global Terminal experience

The default UI is now a workstation-style terminal surface with:

- theme switching (Obsidian, Midnight Glass, Neon Forge, Aurora Prism)
- dynamic procedural backgrounds (no static assets)
- density/font/transparency tuning
- quick command chips and command trail
- accessory panels (status HUD, layout minimap, tab navigator, context inspector)

## Supabase SQL

Run:

```sql
-- file: supabase/memory_pods.sql
create extension if not exists pgcrypto;

create table if not exists public.memory_pods (
  id uuid primary key default gen_random_uuid(),
  user_id text default 'daigle',
  created_at timestamptz default now(),
  kind text check (kind in ('session_summary','pod','decision','artifact_ref')),
  summary text not null,
  full_text text,
  metadata jsonb
);

create index if not exists memory_pods_user_created_at_idx
  on public.memory_pods (user_id, created_at desc);
```

## Required behavior checks

### Ping check

Send `ping`:
- If pods exist: `Jackie here— Online. Last we worked on <latest summary>`
- If not: `Jackie here— Online. No saved session summary yet.`

### Memory fallback

If Supabase is unavailable, responses include:
- `Memory offline, no pods saved.`

### `/pod` command

Send `/pod <text>` to store a pod (`kind='pod'`).
If DB write fails, response includes:
- `Failed to save pod: <error>`
