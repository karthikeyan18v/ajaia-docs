# AI log

Running notes on where AI helped, what I changed or rejected, and how I checked it.
This feeds `AI_WORKFLOW.md`.

## Planning

- **Multi-agent plan review (Claude Code workflows).** Five reviewers critiqued my draft plan in
  parallel: rubric, architecture/security, UX, schedule, and a live version check against npm and
  the vendor docs. A synthesizer and a completeness critic followed. A second run designed the
  editor, sharing, versioning and presence features and fitted them to the clock.
- **Caught by the review, adopted:**
  - Next 16 renamed `middleware.ts` to `proxy.ts`.
  - The Supabase direct DB host is IPv6-only on the free tier, so I use separate pooler URLs for
    runtime and migrations.
  - The transaction pooler needs `prepare: false`.
  - Every `@tiptap/*` package has to be pinned to one exact version.
  - `fetch keepalive` caps the body at 64 KB.
  - Supabase's auto-generated REST API exposes tables with RLS off. I disabled it and enabled RLS
    with no policies.
- **Rejected or overridden:**
  - The first AI plan had no signup, only seeded users. I wanted real auth, so it's email +
    password signup/login, with the seeded users kept for reviewers.
  - I first wanted email OTP. The AI analysis showed free-tier email delivery would block reviewers
    from testing sharing, so I agreed to defer it.
  - The AI suggested batching git push approvals. Rejected: I approve each push.
  - The feature designs summed to ~13h against ~3h of clock. I cut them to a core plus an ordered
    stretch queue (`docs/PLAN.md`).
- **AI assumption corrected by checking:** the plan assumed the database was in US East. A probe
  script found the Supabase project in Tokyo (`ap-northeast-1`), so Vercel functions are pinned to
  `hnd1` and every DB call stays in the same region.

## Build

- **Verified before relying on it:** a throwaway Node script confirmed `@tiptap/html/server`
  `generateJSON` runs on the server, keeps B/I/U/headings/lists, drops `<script>`/`<img>`, and that
  `Node.fromJSON(...).check()` rejects unknown node types. Server-side validation and import depend
  on all of this.
