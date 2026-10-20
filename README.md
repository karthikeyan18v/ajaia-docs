# Ajaia Docs

A lightweight collaborative document editor: write rich-text documents, share them with the right
people at the right permission level, and never lose the original.

**Live:** https://ajaia-docs-eight-drab.vercel.app

## Demo accounts

All three use the password **`ajaia-demo-2026`**. The sign-in page also has one-click buttons for them.

| Account | Starting state |
|---|---|
| `alice@ajaia.dev` | Owns **Welcome to Ajaia Docs**. Has view access to Bob's *Q4 roadmap notes* |
| `bob@ajaia.dev` | **Editor** on Welcome. Owns *Q4 roadmap notes* |
| `carol@ajaia.dev` | **Viewer** on Welcome |

You can also create your own account on the sign-up page.

## A two-minute review path

1. **Sign in as Bob.** Open *Welcome* and type a sentence. "Saving…" turns to "Saved" by itself.
2. **Switch user to Carol.** Welcome is under *Shared with me* and marked *View only*. The toolbar is
   gone. Click **Request edit access**.
3. **Switch to Alice.** Welcome shows a badge on **Share**. Open it and click **Allow editing** for
   Carol. Try "Anyone with the link can view".
4. As Alice, open **History**. *v1 · Original* is Alice's first text, and Bob's edit is its own
   version. Open v1 and **Restore this version**. The current text stays in history.
5. On the dashboard, use **Import file** with [`sample.docx`](public/samples/sample.docx) (also
   available as `.md` and `.txt` in `public/samples/`).
6. **Conflict check:** open the same doc as Bob in two tabs, edit in one, then edit in the other. The
   second tab explains that someone saved a newer version and lets you load theirs or keep yours.

To reset the demo data after a review session, run `pnpm db:seed`.

## Features

| Area | What works |
|---|---|
| Documents | Create, rename (click the title), edit, autosave, reopen, owner-only delete |
| Formatting | Bold, italic, underline, normal text / H1 / H2 / H3, bulleted and numbered lists, undo/redo, keyboard shortcuts |
| Pages & PDF | **Page** in the toolbar (or Ctrl/Cmd+Enter) starts a new page, shown as a separate sheet. **PDF** opens the print dialog with a clean print layout (just the title and pages, each page break a real PDF page); choose *Save as PDF* |
| Saving | Saves 1.5 s after you stop typing, at least every 10 s while you type, and when you switch tabs, close the page or press Ctrl/Cmd+S. One retry, then "Couldn't save · Retry" |
| Concurrency | Every save carries the revision it was based on. A stale save gets 409 and a conflict banner, never a silent overwrite |
| Sharing | Owner adds people by email as **Can view** (default) or **Can edit**, changes roles, removes access. Dashboard tabs: *All / Owned by me / Shared with me* |
| Edit requests | Viewers request edit access. The owner allows or denies it from the Share dialog |
| Link access | *Restricted* (default) or *Anyone signed in with the link can view*. Link viewers can never edit |
| Version history | One version per author editing session. v1 (the original) is frozen. Owners and editors can browse; only the owner restores, and a restore adds a new version instead of deleting anything |
| Import | **`.txt`, `.md`, `.docx` only, up to 2 MB.** Each becomes a new editable document. Images aren't imported and tables become plain text; the UI warns when that happens |
| Auth | Email + password sign-up and login, scrypt-hashed passwords, signed httpOnly session cookie, rate-limited login |

## Run locally

Requirements: Node 22, pnpm 10, a Postgres database. A free Supabase project works, and so does any
local Postgres.

```bash
pnpm install
cp .env.example .env.local      # then fill in the values
pnpm db:migrate                 # creates the tables
pnpm db:seed                    # demo accounts + documents
pnpm dev                        # http://localhost:3000
```

`.env.local`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Runtime connection. For Supabase, the **Transaction pooler** URI (port 6543) |
| `DIRECT_URL` | Migrations and seed. For Supabase, the **Session pooler** URI (port 5432). For local Postgres, use the same URL as `DATABASE_URL` |
| `SESSION_SECRET` | Any random string of 32+ characters |
| `CRON_SECRET` | Optional, any random string |

Quick local Postgres with Docker:
`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17`, then use
`postgresql://postgres:postgres@localhost:5432/postgres` for both URLs.

## Tests

```bash
pnpm test        # 86 unit tests (Vitest)
pnpm typecheck
```

- **`tests/policy.test.ts`**: the full permission matrix (4 roles × 8 actions) and how a role is
  resolved (owner, member, link, none).
- **`tests/autosave.test.ts`**: autosave timing with fake timers: debounce, max-wait, never two saves
  in flight, retry-once, 409 conflict, 403, flush, dispose.
- **`tests/decideSnapshot.test.ts`**: when an edit starts a new version and when it extends the
  current one.
- **`tests/pageBreak.test.ts`**: page breaks are valid in the shared schema and round-trip through HTML.
- **`tests/import.test.ts`**: `.txt` / `.md` / real `.docx` conversion, script and image stripping,
  heading clamping, type spoofing, size and empty-file errors.

## Project layout

```
src/app/            pages (login, dashboard, editor) and thin API route handlers
src/server/         server-only layer: db, auth, docs (service, history, requests), import, http errors
src/lib/            pure, tested logic: access policy, autosave engine, snapshot rule, editor schema
src/components/     UI: editor (toolbar, autosave, conflict, history), share dialog, dashboard
drizzle/            SQL migrations
scripts/seed.ts     idempotent demo seed
docs/PLAN.md        the build plan
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for decisions and trade-offs, and
[AI_WORKFLOW.md](AI_WORKFLOW.md) for how AI tools were used.
