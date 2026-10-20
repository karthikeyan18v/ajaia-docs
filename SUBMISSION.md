# Submission: Ajaia Docs

**Candidate:** Karthikeyan V (karthikeyan18v@gmail.com)
**Live product:** https://ajaia-docs-eight-drab.vercel.app
**Walkthrough video:** see `VIDEO_URL.txt`

## Test accounts

Password for all three: **`ajaia-demo-2026`** (one-click buttons on the sign-in page).

| Account | Role on "Welcome to Ajaia Docs" |
|---|---|
| alice@ajaia.dev | Owner |
| bob@ajaia.dev | Editor |
| carol@ajaia.dev | Viewer |

A two-minute review path is in `README.md`. You can also sign up with any email.

## What's included

| Item | Location |
|---|---|
| Source code | this folder (`src/`, `tests/`, `drizzle/`, `scripts/`, `public/samples/`) |
| Setup and run instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| Build plan | `docs/PLAN.md`; raw AI notes kept during the build in `AI_LOG.md` |
| Automated tests | `tests/` (86 Vitest unit tests: `pnpm test`) |
| Sample files for import | `public/samples/sample.docx`, `sample.md`, `sample.txt` |
| Video link | `VIDEO_URL.txt` |
| Environment template | `.env.example` |

## Status

**Working end to end** (deployed, Supabase Postgres):
- Sign-up and login, plus seeded demo accounts.
- Create, rename, edit, autosave and reopen documents, with bold, italic, underline, H1–H3, and
  bulleted and numbered lists.
- Conflict protection on concurrent saves (409 + banner).
- Sharing as viewer or editor, change role, remove, with Owned / Shared tabs.
- Edit-access requests (approve / deny), and "anyone with the link can view".
- Version history with a protected original and owner restore.
- Multi-page documents (page breaks), and PDF download through the browser's Save as PDF.
- Import of `.txt`, `.md`, `.docx` (up to 2 MB) into new documents.
- Validation and error handling on every endpoint.

**Stretch items delivered:** version history, export to PDF, and role-based sharing beyond basic access (viewer vs
editor, edit requests, link access).

**Incomplete or not built:**
- Live presence and real-time co-editing (replaced by conflict detection).
- Visual diff between versions.
- Markdown export.
- OTP / email verification.
- Integration tests against a database (the SQL paths were verified with scripted end-to-end
  checks; unit tests cover the logic).
- No manual pass on a physical phone.

**Next 2–4 hours:** a "someone saved changes" live notice via polling, a word diff in history,
PGlite-backed integration tests in CI, email invites for people without an account. Details are in
`ARCHITECTURE.md`.
