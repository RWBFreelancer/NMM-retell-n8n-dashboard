# Ninja Ops Dashboard

## Sources (checked 2026-11-24)

- **Live:** `C:\Projects\NMM-retell-n8n-dashboard`, branch `main`. Old copy (do not use): `C:\Projects\ninja_mobile_mechanics_phase_1\dashboard`, blocked by the old-copy hook.
- **Runs today:** Next.js app in `src/` (`npm run dev`, `npm run build`), helper scripts in `scripts/`. Deployed on Vercel.
- **Frozen:** None.
- **Rule:** see `C:\Projects\AGENTS.md`, "Sources". New copy, branch or frozen file: add it to `~/.claude/old-copies.json` and to this block in the same step.

A read-only web dashboard over the two Retell agents and the n8n recap
workflow. Next.js on Vercel. Login protected. Built by Rey.

Every AI tool reads this file. `CLAUDE.md` only imports it.

This folder is self-contained. It is pushed to its own **public** GitHub repo.

## Git rules (standard)

Set by Rey on 2026-11-28. The same block is in every repo under `C:\Projects`.
Change it in all repos at once, never in one repo only.

- Repo type: code
- Deploy branch: `main` (each push deploys to Vercel production)

1. Run `git pull --rebase` before you start.
2. Commit when a change is done. Write a short, plain message that says what changed.
3. Push:
   - **notes** repo: push after each commit.
   - **code** repo: push after each commit. Before you push to the deploy branch, ask Rey.
   - **client-data** repo: commit and push only when Rey asks. When you finish, say what changed and stop.
4. Never force push. Never rewrite commits that are already pushed. On a conflict, stop and tell Rey.
5. Never commit secrets (`.env`, keys, tokens) or a file over 50 MB. Large files go to Google Drive.
6. To save and upload by hand, run `sync.bat`.

## Hard rules for this folder

1. **Read-only.** Never call `PATCH`, `PUT`, `POST /publish-*`, `POST
   /create-agent-version`, or any n8n write endpoint. The dashboard is a window,
   not a control panel. Retell and n8n writes stay in `tools/` in the parent
   repo, behind the approval ladder.
2. **The repo is public.** No API key, token, password, or `.env` value in any
   file. Secrets live in Vercel project settings and in local `.env.local` only.
3. **No personal data in git.** No caller name, phone number, address, or real
   `call_id` transcript in a fixture, a test, a screenshot, or a comment. Use
   fake data. (parent `AGENTS.md`, hard rule 6)
4. **Every API call goes through a server route** in `src/app/api/`. The browser
   never sees a key. `src/lib/retell.ts` and `src/lib/n8n.ts` are server-only.
5. **Never hardcode a live agent version.** Pull it from `GET /get-agent/{id}`.
   (parent `AGENTS.md`: never trust a version written in a file)
6. **Plain English on screen.** No raw field name, no raw code, in Simple mode.
   Everything user-facing goes through `src/lib/plain.ts`.
7. **Theme tokens only.** No hex value in a component. Use the CSS variables in
   `src/app/globals.css`. Every view must work in light and in dark.

## Parent repo

The agents, the flows, the n8n workflow, and the Python tools live one level up.
Read `../AGENTS.md` before touching anything outside this folder.
If this folder is not inside the parent repo (for example a standalone clone at
`C:\Projects\NMM-retell-n8n-dashboard`), the parent repo is
`RWBFreelancer/ninja_mobile_mechanics_phase_1`. Local copy:
`C:\Projects\ninja_mobile_mechanics_phase_1`. Read its `AGENTS.md` there.
The build plan for this dashboard is in the parent repo's plan file.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- client-comms-rules:start -->
## Client communication rules
Follow these rules for every message, reply, brief or summary written for Rey or for a client.
@client-comms-rules.md
<!-- client-comms-rules:end -->
