# Architecture note

## What I prioritized, and why

The brief rewards depth on a coherent slice over breadth, so I spent the time on the three things a
reviewer actually touches: **editing that never loses work**, **sharing whose rules are enforced on
the server and visible in the UI**, and **a deployed build with seeded accounts** so sharing can be
tested in two minutes.

In order:
1. **Correct access control.** One pure policy function decides every permission, and every route
   goes through it.
2. **Safe saving.** Autosave, optimistic concurrency, and version history, so neither a slow
   network nor a second editor can silently destroy text.
3. **Sharing as a product flow.** Roles, an owned vs shared split, edit requests, link access.
4. **Import** as the upload feature, because turning an existing file into an editable doc is the
   most product-relevant option.

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router) on Vercel | One deploy for UI + API; same-origin cookies, no CORS |
| Editor | Tiptap 3 (ProseMirror) | Every required format is a built-in extension; content is structured JSON |
| Database | Supabase Postgres via Drizzle ORM | Free hosted Postgres; relational data (owners, members, requests) fits SQL |
| Auth | Own email/password, scrypt + signed JWT cookie (jose) | Real auth with no email dependency that could block reviewers |
| Tests | Vitest | Fast unit tests for the pure logic |

**Not Vercel's filesystem.** SQLite or JSON files would be wiped between serverless invocations, so
data lives in hosted Postgres.

## Structure

```
Browser ──fetch──▶ app/api/*/route.ts   thin: parse + validate (zod), call a service, map errors
                        │
                        ▼
              server/docs/service.ts    getDocWithAccess → assertCan → transactional write
              server/docs/history.ts    versions list / preview / restore
              server/docs/requests.ts   link access + edit requests
                        │                       uses
                        ▼                         ▼
              Postgres (Drizzle)        lib/access/policy.ts   pure resolveRole() + can()
                                        lib/history/decideSnapshot.ts
                                        lib/editor/extensions.ts (one schema everywhere)
```

- The route handlers are thin. Every service starts with `getDocWithAccess`, which resolves the
  caller's role, then `assertCan(access, action)`.
- The permission logic is a pure function, which is why it can be tested exhaustively without a
  database or HTTP.
- `proxy.ts` (Next 16's middleware) only redirects signed-out visitors. It is never the
  authorization layer.

## Data model

```
users              id, email (unique, lower-cased), name, password_hash
documents          id, owner_id, title, content jsonb, revision, link_access, updated_by, timestamps
document_members   (document_id, user_id) pk, role editor|viewer, granted_by
document_versions  document_id, version_no, kind created|imported|edit|restore, content, author, save_count, revision
access_requests    document_id, requester_id, status pending|approved|denied  (one pending per person)
rate_limits        key, window_start, count
```

- **Content is Tiptap JSON in `jsonb`**, so formatting round-trips exactly.
- **Every save is validated against the editor schema** (`Node.fromJSON(...).check()`). Unknown
  node types are rejected with 422, so stored content is always renderable and can't carry HTML.

## Key decisions

**Permissions.** Owner > member role > link access > none.

| | Read | Edit / rename | Delete / share / restore | View history | Request edit |
|---|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ | — |
| Editor | ✓ | ✓ | — | ✓ | — |
| Viewer (member or link) | ✓ | — | — | — | ✓ |
| No access | 404 | 404 | 404 | 404 | 404 |

- **Strangers get 404, not 403**, so the API never confirms a document exists.
- **New shares default to view only.** Nobody edits unless the owner says so.

**Concurrency: optimistic, not realtime.**
- Real-time co-editing needs websockets and a CRDT (Yjs). Vercel's serverless functions can't hold
  websockets, and it would have consumed the timebox.
- Instead, each save is
  `UPDATE … SET revision = revision + 1 WHERE id = $id AND revision = $base`.
  - If nobody else saved, it succeeds.
  - Otherwise the client gets 409 with who saved and when.
- The conflict banner offers **Load their version** (your text is copied to the clipboard first) or
  **Keep mine**. Their save is already in version history, so neither choice loses work.

**Version history protects the original.**
- Version 1 is frozen at creation or import.
- Each author's editing session is one version: a new row when the author changes, after 10
  minutes idle, or after 30 minutes. This keeps history readable instead of one row per keystroke.
- The row lock from the save's `UPDATE` serializes the version bookkeeping.
- **Restore copies an old version on top** as a new `restore` version and bumps the revision, so
  other open tabs get a 409 instead of overwriting the restore.

**Autosave** is a framework-free engine (`lib/autosave/engine.ts`) wrapped by a React hook:
- 1.5 s debounce, 10 s max-wait while typing.
- Exactly one save in flight; edits made during a save go out right after it.
- One retry on network or 5xx errors.
- Flushes on tab hide, pagehide, Ctrl/Cmd+S and Back. It uses `fetch keepalive` only under 60 KB,
  because browsers cap keepalive bodies at 64 KB.

**Import pipeline:**
1. Size check (2 MB).
2. Verify the extension matches the bytes: zip magic for `.docx`, valid UTF-8 for text.
3. Convert to HTML: mammoth (`.docx`), marked (`.md`), or escaped paragraphs (`.txt`).
4. Sanitize with sanitize-html, using an allowlist that matches the schema.
5. Tiptap `generateJSON`, then the schema check.
6. Becomes v1 of a new document, with kind `imported`.

**Security basics:**
- **Passwords:** scrypt hashes, and a constant-time dummy hash for unknown emails, so login timing
  doesn't reveal which accounts exist.
- **Login errors:** a generic message for both wrong password and unknown email.
- **Rate limits** on login, signup and sharing, stored in Postgres because in-memory limits don't
  survive across serverless instances.
- **Session cookie:** httpOnly, SameSite=Lax.
- **CSRF:** every mutating request must come from our own origin.
- **Supabase lockdown:** RLS is enabled with no policies on every table. The app connects as the
  table owner, so Supabase's public REST API can read nothing.

**Deployment:**
- Vercel functions are pinned to `hnd1` (Tokyo), the Supabase project's region, so every database
  round trip stays local.
- The runtime uses Supabase's transaction pooler (`prepare: false`); migrations use the session
  pooler.
- A daily Vercel cron hits `/api/health` so the free Supabase project doesn't pause after a week
  without activity.

## Deliberately out of scope

| Cut | Reason |
|---|---|
| Live cursors / presence | Needs websockets + CRDT; the 409 model is the honest serverless substitute |
| Suggestion mode / comments | Per-change tracking is days of work; version history covers "protect the original" |
| OTP / email verification / password reset | Free-tier email delivery would block reviewers from testing sharing |
| Visual diff between versions | Preview + restore was the core need; a word diff is next |
| Export to Markdown / PDF | Lower value than history and requests for this brief |
| Images, tables, links in documents | Smaller XSS surface and schema; imports say what was dropped |
| Integration tests against a real database | Unit tests cover the pure logic. The SQL paths were verified with scripted end-to-end checks (50+ API calls) against the real database (roles, 404/403/409/422, sharing, requests, link access, restore) |

## What I'd build next (2–4 hours)

1. **Live "Bob saved changes" notice.** Poll a cheap `/meta` endpoint every 20 s, so conflicts are
   seen before they happen.
2. **A word-level diff** in the history panel.
3. **Integration tests** for the save, restore and sharing transactions, run against an ephemeral
   Postgres (PGlite) in CI.
4. **Email invites** for people without an account, and OTP sign-in via Resend once a domain is
   verified.
5. **Real-time co-editing** with Yjs + Hocuspocus on a stateful host, if the product needs it.
