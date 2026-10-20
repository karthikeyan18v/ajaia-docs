# Ajaia Docs design system

**Scene:** a teammate drafting a planning doc at a laptop in a bright office mid-afternoon, then
checking the same doc on a phone on the commute. Light theme, paper-like writing surface.

**Color strategy: Restrained.** Cool-tinted neutrals (hue 250, chroma ≤ 0.012), near-black ink for
primary actions, and one highlighter accent (marigold) used only for active, selected and
"you" states. Never decorative. Errors use a separate red with an icon and text, never color alone.

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | oklch(0.975 0.004 250) | app background |
| `--color-paper` | oklch(0.995 0.002 250) | document page, inputs, dialogs |
| `--color-panel` | oklch(0.955 0.006 250) | toolbar, header, hover rows |
| `--color-line` | oklch(0.89 0.008 250) | borders, dividers |
| `--color-ink` | oklch(0.22 0.012 250) | text, primary buttons |
| `--color-ink-soft` | oklch(0.45 0.012 250) | secondary text |
| `--color-ink-faint` | oklch(0.60 0.01 250) | placeholders, meta |
| `--color-mark` | oklch(0.86 0.15 88) | highlighter: active toolbar, selected tab, "you" |
| `--color-mark-soft` | oklch(0.95 0.06 92) | subtle highlight backgrounds |
| `--color-danger` | oklch(0.52 0.19 27) | errors, destructive actions |
| `--color-ok` | oklch(0.52 0.11 155) | saved state |

**Type:** Geist Sans for all UI (14/15px base, 1.2 ratio). Source Serif 4 for document body (17px,
line-height 1.7, max 70ch) and document titles. Inputs are 16px minimum so iOS never zooms.

**Shape and space:** radius 6px controls, 10px panels. Spacing on a 4px grid; vertical rhythm
varies (tight inside groups, generous between sections). Hit targets ≥ 44px on touch.

**Motion:** 150–200ms ease-out-quart, state changes only.

**Primitives:** Button (primary ink, secondary outline, ghost, danger), TextField with label and
inline error, Avatar (initial on a hue derived from the user id), Chip (role / ownership),
Notice (inline aria-live status, no toast library).
