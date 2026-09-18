# Ninja Ops Dashboard

One screen for two Retell voice agents and the n8n recap workflow. It answers
the question that used to need three browser tabs: **did this call reach
Daniel?**

Built with Next.js. Runs on Vercel. Protected by one shared login.

## What it is not

**It never writes.** No publishing, no editing an agent, no changing the
workflow. Both API clients refuse any endpoint that is not on a read-only
allow-list, so a future mistake gets blocked, not just avoided.

Changes to the agents and to the workflow happen in the private repo one level
up, behind an approval ladder.

## Safe to make public

This repo holds no secrets and no personal data.

- Every API key lives in an environment variable, read only on the server.
- The browser never sees a key. Proven by a grep of the built bundle, in
  "Checks" below.
- No caller name, phone number, or address is committed. Those appear on screen
  at run time only, and are masked by default.

## Run it on your computer

You need Node 20 or newer.

```bash
cd dashboard
npm install
cp .env.example .env.local
```

Now fill in `.env.local`. See **Environment variables** below.

```bash
npm run check-keys   # proves both API keys work, prints no secrets
npm run dev          # http://localhost:3000
```

## Environment variables

| Name | What it is |
|---|---|
| `RETELL_API_KEY` | A Retell key. **Use a read-only key.** |
| `RETELL_BASE_URL` | `https://api.retellai.com` |
| `AGENT_A_ID` | Agent A's id |
| `AGENT_A_PHONE` | Agent A's number, E.164, e.g. `+15550101234` |
| `AGENT_B_ID` | Agent B's id |
| `AGENT_B_PHONE` | Agent B's number, E.164 |
| `N8N_API_KEY` | An n8n API key |
| `N8N_BASE_URL` | `https://<your-subdomain>.app.n8n.cloud` |
| `N8N_WORKFLOW_ID` | The recap workflow's id |
| `AUTH_SECRET` | Random. `openssl rand -base64 32` |
| `DASHBOARD_USERNAME` | The one username |
| `DASHBOARD_PASSWORD_HASH` | The password, hashed. See below |

### The password

```bash
npm run hash-password -- "a long password you picked"
```

It prints two lines. **Use the base64 line in `.env.local`.**

A bcrypt hash starts with `$2b$12$`. In a `.env` file, Next.js reads those `$`
signs as variable names and eats part of the hash, so every login fails with no
useful error. Base64 has no `$`, so it always survives. The code accepts either
shape, so the raw hash is fine in the Vercel settings page, which does not
substitute anything.

Never commit the password or the hash. Never paste either into a chat.

## Put it on Vercel

**1. Make this folder its own git repo.** It sits inside a private repo on
disk, but it is tracked separately, and the parent ignores it.

```bash
cd dashboard
git init
git add .
git commit -m "Ninja Ops dashboard: first version"
```

Check nothing secret went in before you push:

```bash
git ls-files | grep -E "\.env" # should print .env.example ONLY
```

**2. Make an empty public repo on GitHub**, with no README and no `.gitignore`.
Then:

```bash
git branch -M main
git remote add origin https://github.com/<you>/<repo-name>.git
git push -u origin main
```

**3. Import it into Vercel.** Go to vercel.com, New Project, pick the repo.
Vercel detects Next.js by itself. Change no build settings.

**4. Add every environment variable** from the table above, under Settings →
Environment Variables, for Production, Preview, and Development.

Two must be different from your computer's copy:

- `AUTH_SECRET` — make a fresh one. Never reuse the local value.
- `DASHBOARD_PASSWORD_HASH` — use a real password, not the local test one.

**5. Deploy.** Then open the URL. You should land on the login page, not the
dashboard. If you see the dashboard without signing in, stop and tell Rey.

### A note on cost

Vercel's Hobby plan is free but its terms forbid commercial use. This dashboard
serves a paying client, so it is commercial. It will run on the free plan, but
that breaks the terms. Budget $20 a month for Pro before showing a client.

## Checks

Run these after any change. All must pass.

```bash
npm run check-keys                   # both keys work, Retell key cannot write
npx tsc --noEmit                     # types are sound
npm run build                        # it builds
grep -rl "Bearer" .next/static/      # MUST print nothing
grep -rlE "PATCH|PUT|DELETE" src/    # MUST print nothing
```

Signed out, every page and every `/api/` route must answer with a redirect to
`/login`, not with data:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/retell/calls
# 307 or 401. Never 200.
```

## How it is put together

```
src/
  app/
    (app)/            Signed-in pages. The nav shell lives here.
    login/            The only page a signed-out person can reach.
    api/              Server routes. The ONLY place a key is used.
  components/         Shared pieces. Never import from src/lib/retell.ts here.
  lib/
    retell.ts         Retell client. server-only. Read-only allow-list.
    n8n.ts            n8n client. server-only. Read-only allow-list.
    agents.ts         The two agents. Ids only, never a version number.
    plain.ts          Every code turned into plain English. Change wording HERE.
    stats.ts          Counting rules. "unknown" is always its own bucket.
    format.ts         Dates and numbers, always in California time.
    chart-theme.ts    Resolves CSS colour tokens for Recharts.
  middleware.ts       Blocks every route for a signed-out visitor.
```

### Two rules that are easy to break

**Plain English.** Nothing on screen shows a raw code in Simple mode. Every
code goes through `src/lib/plain.ts`. Every big number carries a sentence that
says what it means.

**Theme tokens.** No hex colour in a component. Use the CSS variables in
`src/app/globals.css`. Every view must be readable in light and in dark.
