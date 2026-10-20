# AI workflow note

## Tools

- **Claude Code** (Claude Opus) in VS Code, as a pair programmer for planning, code and verification.
  - **Multi-agent workflows** for parallel plan reviews and for building the pure logic modules
    test-first.
  - **Skills (packaged prompt workflows)** for brainstorming, test-driven development,
    verification-before-completion, and a design pass (impeccable) that produced `PRODUCT.md` and
    `DESIGN.md`.
- **Next.js 16's bundled docs** (`node_modules/next/dist/docs`), read to check API changes instead
  of trusting model memory.

## Where AI materially sped things up

- **Plan review in parallel.** Five independent reviewers critiqued my first plan at once: the
  rubric, architecture/security, UX, schedule, and a live check of package versions against npm
  and the vendor docs. They caught issues that would each have cost 20+ minutes mid-build:
  - Next 16 renamed `middleware.ts` to `proxy.ts`.
  - Supabase's direct database host is IPv6-only on the free tier, so I use pooler URLs.
  - The transaction pooler needs `prepare: false`.
  - Browsers cap `fetch keepalive` bodies at 64 KB.
  - Supabase's auto-generated REST API exposes tables that don't have row-level security.
- **Test-first pure modules.** The permission policy, snapshot rule, autosave engine and import
  converter were specified as exact interfaces and built test-first, partly by parallel agents.
  That gave 84 unit tests that later caught regressions for free.
- **Boilerplate and API wiring:** Drizzle schema and migrations, route handlers, zod validation and
  UI states.

## What I changed or rejected

| AI output | What I did |
|---|---|
| First plan had seeded users only, no real auth | Overrode it: real email/password signup + login, keeping the seeded accounts for reviewers |
| My own idea of email OTP; AI analysis pushed back | Agreed to drop it: free-tier email delivery would block reviewers from testing sharing |
| Feature designs added up to ~13 hours | Cut to a core plus an ordered stretch queue; kept version history, edit requests and link access, dropped live presence |
| Suggested batching git push approvals | Rejected; I approve each push |
| Assumed the database was in US East | A probe script found the Supabase project in Tokyo, so I pinned Vercel functions to `hnd1` |
| Scaffold defaulted to Next's "Cache Components" mode, which broke the first deploy | Turned it off: every page is per-user, so there is nothing to cache statically |
| Raw mammoth warnings ("style ID Heading1 not defined") shown to users | Removed; users only see plain-language warnings about images and tables |
| A background agent run was interrupted mid-build | Checked which files had landed, kept the two finished modules and their tests, and wrote the autosave engine and import converter myself against the same specs |
| Test config aliased `server-only` to a path the package doesn't export | Replaced it with a local stub after the import tests failed to load |

## How I verified correctness, UX and reliability

- **Unit tests (86, Vitest)** on the logic most likely to be subtly wrong:
  - the full permission matrix
  - autosave timing with fake timers (debounce, max-wait, single flight, retry, conflict)
  - the version-snapshot rules
  - file conversion, including a real generated `.docx` and XSS stripping
- **Scripted end-to-end checks against the real Supabase database,** signed in as alice, bob,
  carol and a fresh stranger. Each asserted the exact status code and message:
  - owner/editor/viewer/stranger access (200/403/404)
  - stale saves (409 with who saved)
  - schema-invalid content (422)
  - share, unshare, re-share
  - edit request, approve, double approve (409), deny
  - link access on and off
  - restore, restoring the current version (400), and a stale save after a restore (409)
  - import of `.md`, `.txt`, `.docx`; a `.pdf` gets 415
- **Spot-checked risky assumptions with throwaway scripts** before building on them. For example,
  I confirmed `@tiptap/html/server` runs in Node and rejects unknown nodes before relying on it for
  server-side validation and import.
- **`pnpm typecheck` and a production `next build`** before deploying, plus a health check on the
  live URL.
- **UX:**
  - A design pass set the tokens and type, and wrote down the scene and anti-references.
  - Every state has copy: empty, loading, saving, error, conflict, view-only, lost access.
  - Inputs are 16 px so iOS doesn't zoom, and toolbar buttons don't steal focus, so the phone
    keyboard stays open.

**Not verified, stated honestly:** I didn't run a full manual pass on a physical phone. The layout
is built mobile-first, with 44 px touch targets and a sideways-scrolling toolbar.
