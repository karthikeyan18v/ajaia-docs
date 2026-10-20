# Ajaia Docs — Build Plan

A lightweight collaborative document editor (Google Docs–inspired), built in a 4–6h timebox.
This plan is the merged output of two multi-agent design reviews (rubric, architecture/security,
UX, schedule, live tech verification; then editor, sharing, versioning and presence designers
fitted to the clock). Decisions here are final unless a gate fails.

## Scope

**In**
- Real email + password auth (signup + login, scrypt-hashed, signed httpOnly cookie) **plus** seeded
  demo users alice / bob / carol with one-click login so reviewers can test sharing in seconds.
- Create, rename, edit, autosave, reopen. Bold / italic / underline, P·H1·H2·H3, bullet + numbered
  lists, undo / redo.
- Optimistic concurrency: every save carries `baseRevision`; a stale save gets 409 and a conflict
  banner that never silently loses anyone's text.
- Sharing: owner grants **viewer** (default) or **editor** by email; owner can change role / revoke.
  Dashboard distinguishes *Owned by me* vs *Shared with me*.
- Import `.txt`, `.md`, `.docx` (≤ 2 MB) into a new editable document; sanitized server-side.
- **Original is protected:** every author's editing session is kept as a version; v1 is frozen.
- Supabase Postgres (hosted) + Vercel; daily cron keeps the free DB from pausing.

**Stretch queue** (pulled in this order only while ahead of the clock)
1. **S1 Version history screen** — owner/editors browse versions; owner restores (restore = new version).
2. **S2 Link access** — *Restricted* or *Anyone signed in with the link can view*.
3. **S3 Request edit access** — viewer requests, owner approves/denies.
4. **S4 Version watch** — "Bob saved changes · Reload" via a light poll (the honest, serverless-friendly
   cut of presence).

**Out (documented in ARCHITECTURE.md)** — realtime co-editing / live cursors (needs websockets + CRDT;
Vercel can't host them), suggestion mode (≈2 days), OTP / email verification / password reset
(free-tier email delivery would block reviewers), comments, folders, images/tables in docs,
drag-and-drop upload, Markdown export, Supabase Auth / RLS policies.

## Architecture

**Stack (pinned exact):** Next.js 16.4.2 (App Router, `proxy.ts`, async `params`/`cookies()`),
React 19, Tailwind 4, Tiptap 3.32.0 (all `@tiptap/*` same version), Drizzle 0.45.4 + drizzle-kit
0.31.11, postgres 3.4.9, jose 6, zod 4, mammoth, marked, sanitize-html, Vitest 5.

**Database connections**
- `DATABASE_URL` — Supabase **transaction pooler** (6543), runtime, `prepare: false`, one client per instance.
- `DIRECT_URL` — Supabase **session pooler** (5432), migrations + seed only.
- Direct `db.<ref>.supabase.co` is never used (IPv6-only on free tier).
- Supabase Data API **disabled** and RLS **enabled with no policies** on every table: the app connects
  as the table owner, so nothing is reachable through the public REST API.

**Layout**
```
src/
  proxy.ts                         redirect-only guard for pages (APIs check sessions themselves)
  app/(auth)/login, signup         app/(app)/page.tsx dashboard, app/(app)/d/[id] editor
  app/api/...                      thin route handlers -> server services
  server/  db/ auth/ docs/ sharing/ import/ http/     ('server-only'; services take db)
  lib/access/policy.ts             pure resolveRole() + can()      <- unit-tested exhaustively
  lib/autosave/machine.ts          pure save state machine          <- fake-timer tests
  lib/history/decideSnapshot.ts    pure snapshot policy             <- table tests
  lib/editor/extensions.ts         single Tiptap schema (client, server validation, import)
```

**Schema**
```
users(id uuid pk, email text unique (lower-cased), name, password_hash, created_at)
rate_limits(key text pk, window_start timestamptz, count int)            -- login + share
documents(id uuid pk, owner_id fk, title 1..200, content jsonb, revision int,
          link_access 'restricted'|'link_view', created_at, updated_at, updated_by fk)
document_members(document_id, user_id) pk, role 'editor'|'viewer', granted_by, created_at
document_versions(id, document_id, version_no, kind 'created'|'imported'|'edit'|'restore',
          content jsonb, author_id, restored_from, save_count, revision, created_at, updated_at)
          unique(document_id, version_no)
access_requests  (S3 only, separate migration)
```
Invariant: the newest `document_versions` row equals `documents.content`; every save/restore writes
both in one transaction.

**Permission matrix** (`lib/access/policy.ts`; handler order: 401 → resolve role → 404 if none → 403 → 400/422 → mutate)

| Action | Owner | Editor | Viewer | Link viewer (S2) | None |
|---|---|---|---|---|---|
| Read | ✓ | ✓ | ✓ | ✓ | 404 |
| Edit content / rename | ✓ | ✓ | 403 | 403 | 404 |
| Delete | ✓ | 403 | 403 | 403 | 404 |
| Share / change role / revoke / link setting | ✓ | 403 | 403 | 403 | 404 |
| View history (S1) | ✓ | ✓ | 403 | 403 | 404 |
| Restore version (S1) | ✓ | 403 | 403 | 403 | 404 |
| Request edit (S3) | 400 | 400 | ✓ | ✓ | 404 |

Strangers get **404, not 403**, so the API never confirms a document exists.

**Save path (one transaction)**: `UPDATE documents SET content, revision=revision+1 … WHERE id=$id AND
revision=$base RETURNING …` → `decideSnapshot` (new row if author changed / >10 min idle / >30 min
session / last row was created|imported|restore; else update latest) → no row updated ⇒ 404 or 409
`{current:{revision, updatedAt, updatedBy}}`.

**Autosave**: debounce 1.5 s, maxWait 10 s, one save in flight (latest content queued), one retry
then "Couldn't save · Retry", flush on Ctrl/Cmd+S, tab hide, pagehide (keepalive ≤ 60 KB), Back.

## Phases and gates

Every phase ends with: `pnpm typecheck && pnpm test` green → deploy → smoke on the live URL
(superpowers: verification-before-completion). A failed gate goes through systematic-debugging.

| # | Phase | Box | Done when |
|---|---|---|---|
| 0 | Foundation: repo, deps, env, Drizzle schema + migration (RLS on), db client, `/api/health`, Tiptap-in-Node check, doc skeletons, first Vercel deploy | 25m | Live URL `/api/health` returns `{db:"ok"}` |
| 1 | Auth: signup, login, logout, scrypt, jose session, rate limit, one-click demo users, seed (alice/bob/carol, Welcome doc v1+v2 shared bob=editor, carol=viewer) | 30m | Log in as each user on the live URL |
| 2a | Docs core: policy.ts (TDD), routes, dashboard (All / Owned / Shared tabs, role chips, "edited … by …"), editor with toolbar, rename, owner delete, viewer read-only | 30m | Acceptance 1, 2, 5 |
| 2b | Autosave machine (TDD) + SaveStatus + ConflictBanner | 15m | Acceptance 3, 4, 6, 7 |
| 2c | Snapshot write path (decideSnapshot TDD) | 8m | bob's save inserts v2, never overwrites v1 |
| 3 | Sharing: ShareDialog (add by email, role select, remove, copy link) | 25m | Shared doc appears/disappears for the grantee |
| 4 | Import .txt/.md/.docx ≤ 2 MB → new doc (+ /samples files) | 20m | Each type imports with formatting; bad type 415, too big 413 |
| 5 | Hardening: cron keepalive, phone pass, error/empty states, code review pass | 10m | Phone smoke as alice/bob/carol |
| 6 | Deliverables: README, ARCHITECTURE.md, AI_WORKFLOW.md, SUBMISSION.md, VIDEO_URL.txt, screenshots | 20m | All files present, links filled |
| — | Stretch S1 → S4 | — | Only while ahead |

**Checkpoint:** if Phase 2 is not deployed by ~1:45 into the build, apply cut lines 1–3 immediately and drop the stretch queue.

**Cut lines (in order):** 1 delete · 2 .docx import · 3 "Keep mine" button · 4 role select in people list ·
5 status-pill polish · 6 keepalive > 60 KB path.

**Never cut:** revision-checked save, one-save-in-flight + flush on hide, 409 banner, `can()` +
autosave tests, Owned vs Shared distinction, snapshot write path, phone smoke, deploy every phase.

## Acceptance (Phase 2)
1. alice sees Welcome under Owned; bob and carol under Shared with Editor / Viewer chips.
2. New doc → headings, B/I/U, both lists → "Saved" within 2 s → reload → identical formatting.
3. 25 s of continuous typing produces ≥ 2 saves, never two in flight.
4. Type then immediately switch tabs → reload → text persisted.
5. carol has no toolbar; a direct PATCH as carol → 403; a stranger → 404.
6. Two tabs: save in A, edit in B → banner; both buttons work.
7. At 375 px nothing scrolls sideways; tapping **B** keeps the keyboard open.

## Top risks
1. Aggressive estimates → the checkpoint and cut lines are mandatory.
2. Tiptap schema / `generateJSON` in Node → checked in Phase 0; fallback is browser-side conversion + server schema check.
3. Autosave data loss → pure machine with tests, `visibilitychange` as primary flush.
4. Supabase prod → pooler `prepare:false`, Data API off, cron keepalive, Node runtime on DB routes, region match.
5. iOS editing → 17 px body, mousedown-preventDefault toolbar, real-phone check at end of Phase 2.

## Process
- `AI_LOG.md` gets a line whenever AI output is accepted with changes or rejected (feeds AI_WORKFLOW.md).
- README / ARCHITECTURE / SUBMISSION skeletons grow at every gate, not at the end.
- No `git push` without explicit permission each time; deploys go through the Vercel CLI.
