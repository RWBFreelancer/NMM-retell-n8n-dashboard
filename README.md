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

Let it invent one. A password you make up is the thing most likely to go wrong.

```bash
npm run hash-password              # invents a strong password and prints it
npm run hash-password -- --write   # the same, and updates .env.local for you
npm run hash-password -- "your own long password"
```

It prints the value twice: once as a whole line for `.env.local`, and once
bare for the Vercel settings page. **In the Vercel value box, paste the bare
value only** — no `DASHBOARD_PASSWORD_HASH=` in front, no quote marks.

The value looks like `s1.32768.8.1.<hex>.<hex>`. It holds only the letters a
to f and s, the digits, and dots. That matters:

- A `$` in a `.env` file is read as a variable name, and Next.js eats what
  follows it. A bcrypt hash starts with `$2b$12$`, so it used to arrive 8
  characters short and every login failed with no useful error. **This value
  has no `$`.**
- Base64 was the first fix, but base64 contains `+`, `/` and `=`, which some
  paste boxes and URL fields mangle. **This value has none of those either.**

The hashing is scrypt, from Node's own crypto. Nothing to install. It lives in
`src/lib/password-hash.mjs`, which the app and both npm scripts share, so
`check-login` can never give a different answer to the server.

Old bcrypt values still work, raw or base64, so nothing breaks in a hurry. A
value with characters missing is refused outright and the login page says so,
rather than quietly failing.

Never commit the password or the value. Never paste either into a chat.

### When a sign-in is refused

```bash
npm run check-login -- "the password you are typing"
```

It reads `.env.local` the way the app does and prints PASS, WARN, or FAIL for
each step. It prints no secret.

To test what is in the **Vercel** settings page, copy the value out of the box
and pass it in. Nothing is sent anywhere and nothing is written to disk:

```bash
npm run check-login -- "your password" --hash "<the value box contents>"
```

That is the only way to check the live settings from your computer, because the
server never shows them back to you.

The login page also warns you by itself. If a sign-in setting is missing or
unreadable, `/login` shows **"This dashboard is not set up yet"** and names the
setting, before you type anything. A wrong password gives a different message.
So the page tells you which of the two problems you have.

The server also logs the reason, with no values. Look in Vercel under the
deployment's Logs tab for a line starting `LOGIN SETUP:` or `LOGIN REFUSED:`.

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
      page.tsx        Overview.
      agent/[key]/    One agent: the call table, filters, search, paging, CSV.
        calls/[id]/   One call: recording, transcript, every field, the recap.
      ops/            The recap robot, run by run.
      reports/        What kind of calls came in, and what work people wanted.
    login/            The only page a signed-out person can reach.
    api/              Server routes. The ONLY place a key is used.
  components/         Shared pieces. Never import from src/lib/retell.ts here.
    call-table.tsx    The call table. Caller numbers start hidden.
    call-recording.tsx  Player and transcript. Click a line to jump to it.
    field-groups.tsx  The 37 fields, grouped. Names and numbers start hidden.
    recap-panel.tsx   Did this lead reach Daniel?
  lib/
    call-filters.ts   The quick filters. One definition each, shared.
    call-rows.ts      Turns a Retell call into a table row, in plain English.
    call-row.ts       The row type, and the CSV writer. Server and browser.
    call-detail.ts    One call turned into groups, warnings, speeds and costs.
    reports.ts        The counting behind Reports. Buckets always add back up.
    service-categories.ts  Keyword rules guessing what work was wanted.
    fields.ts         The 37 analysis fields: plain label, group, how to read.
    correlate.ts      Matches a call to its n8n run, by call id, never by time.
    password-hash.mjs Hashing. Shared with both npm scripts. Plain JS for that.
    retell.ts         Retell client. server-only. Read-only allow-list.
    n8n.ts            n8n client. server-only. Read-only allow-list.
    agents.ts         The two agents. Ids only, never a version number.
    plain.ts          Every code turned into plain English. Change wording HERE.
    stats.ts          Counting rules. "unknown" is always its own bucket.
    format.ts         Dates and numbers, always in California time.
    chart-theme.ts    Resolves CSS colour tokens for Recharts.
    login-setup.ts    Reads the sign-in settings. Forgives a bad paste.
  middleware.ts       Blocks every route for a signed-out visitor.
```

### Two rules that are easy to break

**Plain English.** Nothing on screen shows a raw code in Simple mode. Every
code goes through `src/lib/plain.ts`. Every big number carries a sentence that
says what it means.

**Theme tokens.** No hex colour in a component. Use the CSS variables in
`src/app/globals.css`. Every view must be readable in light and in dark.

### Chart colours are not a matter of taste

`--chart-1` to `--chart-8` were chosen by running every possible ordering
through a colour-blindness check and keeping the one where neighbouring slots
stay furthest apart. Light and dark are separate sets, not a flip: the old dark
values were too pale and washed into each other.

Worst adjacent pair: 13.6 apart in light, 12.6 in dark, against a target of 8.

**Before changing or reordering a chart colour, re-run the check.** Also true:
colour follows the answer, never its position, so a filter or a re-sort never
repaints a chart; "never said" and "not recorded" always take the same grey;
and every chart carries a legend and a table, because colour is never allowed
to be the only signal.
