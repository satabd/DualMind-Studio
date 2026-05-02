# Studio Workshop Architecture

The Studio Workshop is the full-page React companion to the side panel.
It exists for deep session work — transcript review, memory inspection,
moderator intervention, and decision auditing — while the side panel
keeps its compact monitor + launcher role.

## Stack

- **React 19** with `createRoot`. Works inside an MV3 extension page.
- **Tailwind CSS v3** (NOT v4). v3 has stable extension-context support.
- **Radix UI primitives** for accessible behaviors:
  `@radix-ui/react-tabs`. Pull more in (scroll-area, tooltip, dialog) as
  the surface grows.
- **shadcn-style components** copied into `src/studio/ui/`. CVA variants
  + a `cn` utility. No runtime CLI dependency, no CDN — the extension
  stays self-contained.
- **Zustand** for local UI state. The store guards against stale refresh
  responses with a `refreshToken` counter.
- **marked → DOMPurify** in that order for markdown rendering. Escaping
  source before parsing breaks fences and tables; we sanitize the
  rendered HTML instead.
- **`dir="auto"`** on every body wrapper so Arabic/Hebrew turns flip
  per paragraph without script detection. CSS uses logical properties
  (`padding-inline-start`, `border-inline-start`) so lists/blockquotes
  flip correctly.

## Build pipeline

- `@vitejs/plugin-react@^4.3.0` (compatible with Vite 5).
- `postcss.config.cjs` — the `.cjs` extension matters; a plain `.js`
  postcss config triggers a MODULE_TYPELESS_PACKAGE_JSON warning when
  Chrome loads the service worker.
- `tailwind.config.ts` bridges the CSS variables in `src/studio.css` to
  Tailwind utilities (`bg-bg`, `text-fg-muted`, `border-seat-a/50`).
  Components consume semantic tokens only.
- `tsconfig.json` enables `"jsx": "react-jsx"` and adds `"DOM.Iterable"`.

## Design tokens

All tokens live as CSS variables on `:root` in `src/studio.css`, with a
full `prefers-color-scheme: dark` block for dark mode. Tokens are
intentionally inline so `panel.css` and `transcript.css` can adopt the
same scale by copying the `:root` block.

Token groups:
- **Color** — neutral slate base, narrow saturation, plus seat-identity
  accents:
  - `--color-seat-a` (purple, `hsl(263 65% 52%)`) — Synthesis seat
  - `--color-seat-b` (teal, `hsl(186 75% 36%)`) — Skeptic seat
  - `--color-system` (amber) — Orchestrator messages
  - State accents `--color-success`, `--color-warning`, `--color-danger`
- **Spacing** — multiples of 4 (`--space-1` … `--space-12`)
- **Type** — 13px base for ops density (`--text-xs: 11px` …
  `--text-2xl: 22px`), `--font-sans` and `--font-mono`
- **Radius / shadow / motion** — subtle, real depth via border not shadow

Each token is exposed to Tailwind in `tailwind.config.ts`, so utilities
like `bg-seat-a-soft` and `text-fg-muted` work everywhere.

## Layout shell

```
┌─────────────────────────────────────────────────────┐
│ Header (sticky)                                     │
│   ◆ Studio Workshop · breadcrumb · state badge      │
│   [Pause] [Resume] [Stop] [Refresh]                 │
├─────────────────────────────────────────────────────┤
│ ThrottlingNotice (dismissible, one-time)            │
├─────────────────────────────────────────────────────┤
│ Tabs: Sessions | Memory | Decisions | Agents        │
│  [active tab content]                               │
└─────────────────────────────────────────────────────┘
```

## Tabs

1. **Sessions** — sessions list (left) + Timeline (centre/right) +
   Composer below + EscalationCard when `awaitingHumanDecision`. A
   "viewing saved session" notice appears when the selected session is
   not the currently active one.
2. **Memory** — kind-grouped entries (fact, decision, question, etc.)
   with filter chips, search, and tombstone count.
3. **Decisions** — three sections stacked: Decision memory, Moderator
   interventions, Final outputs.
4. **Agents** — Synthesis (Agent A) and Skeptic (Agent B) identity
   cards. Read-only placeholder showing defaults from
   `src/promptBlueprint.ts`. Per-session identity overrides land in a
   future PR.

Tab triggers show small inline indicators: a red dot on Sessions when
escalation is pending, and `(N)` count chips on Memory and Decisions.

## Vertical timeline (the centerpiece)

3-column CSS grid: `grid-cols-[80px_36px_1fr]` — meta column | rail
node | content card.

```
80px            36px            1fr
─────           ────            ───
14:32:07        ●─── (rail)     ┌──────────────────────┐
expand                          │ Gemini · Synthesis    │
DIVERGE                         │ ─────────────────     │
                                │ markdown body…        │
                                │ [repair: forced]      │
                                └──────────────────────┘
```

- **Left column (meta)** — timestamp (mono, fg-muted), intent
  (uppercase 10px), phase (10px). Right-aligned.
- **Middle column (rail)** — vertical gradient line absolutely
  positioned behind the nodes. Each turn has a circular node
  (9×9, rounded-full, 2px border, shadow-md) coloured by seat with the
  letter inside (A, B, !, U).
- **Right column (card)** — seat-tinted background (`bg-seat-a-soft`,
  `bg-seat-b-soft`, `bg-system-soft`, `bg-surface-muted` for User),
  border matching seat at 50% opacity. Header has agent name + seat
  label ("Synthesis" / "Skeptic" / "Orchestrator" / "You"). Body uses
  `MarkdownBody`. Repair badge when status ≠ clean.

### Round dividers

Sticky banner spanning all three columns. `R{n}` mono label in the
left column, accent dot on the rail, "Round {n}" + phase badge + thin
horizontal rule on the right. `position: sticky; top: 0` so the user
always knows which round they're scrolling in.

### Auto-scroll

- `useEffect` on `transcript.length` and `lastTimestamp` scrolls
  `bottomRef` into view smoothly.
- Disabled when the user has scrolled up more than 200px from bottom.
- Floating "Move to last ↓" button appears when disabled; clicking it
  re-enables auto-scroll.

## File layout

```
src/
  studio.tsx                     — React entry (createRoot)
  studio.css                     — design tokens + Tailwind layers
  studio.html                    — single mount div #studioMount
  studio/
    App.tsx                      — root with Tabs + Header + Notice
    store/
      workshop.ts                — Zustand store
    lib/
      extension.ts               — chrome.runtime.sendMessage wrappers
      utils.ts                   — cn, formatTimestamp
    ui/
      button.tsx                 — CVA variants
      badge.tsx                  — CVA variants (incl. seat-a, seat-b)
      card.tsx                   — Card / CardHeader / CardTitle / CardBody
      tabs.tsx                   — Radix Tabs wrapper
    components/
      Header.tsx
      ThrottlingNotice.tsx
      MarkdownBody.tsx
      Timeline.tsx
      SessionsList.tsx
      Composer.tsx
      EscalationCard.tsx
    tabs/
      SessionsTab.tsx
      MemoryTab.tsx
      DecisionsTab.tsx
      AgentsTab.tsx
```

## Stable DOM IDs

These IDs are locked by `scripts/test-studio-workshop-source.mjs` so
selectors used by panel.html / transcript.html / e2e tools keep working:

`studioMount`, `studioRoot`, `studioHeader`, `studioBreadcrumb`,
`studioTabs`, `tabTriggerSessions`, `tabTriggerMemory`,
`tabTriggerDecisions`, `tabTriggerAgents`, `globalStateBadge`,
`globalPauseBtn`, `globalResumeBtn`, `globalStopBtn`, `timelineScroll`,
`jumpToLastBtn`, `composerCard`, `composerTextarea`, `escalationCard`,
`sessionsList`, `throttlingNotice`, `agentsTabContent`,
`memoryTabContent`, `decisionsTabContent`, `sessionsTabContent`.

## Hard constraints (read before changing)

These rules came out of a session that broke the orchestrator and had
to be reverted. They are enforced by regression tests.

1. **The Workshop is UI only.** No changes to `src/background.ts`,
   `src/content.ts`, `src/db.ts`, or `public/manifest.json` belong in a
   workshop PR. Mixed PRs are the most reliable way to lose work.
2. **The orchestrator never moves, creates, or closes tabs/windows.**
   Agent tabs are pre-opened by the user and selected via the popup.
   Calling `chrome.windows.create({tabId})`, `chrome.tabs.move`, or
   `chrome.windows.update({focused: true})` is forbidden.
3. **Hidden-tab throttling is a Chrome browser feature, not a bug to
   engineer around.** ChatGPT and Gemini stalls when their tab is
   hidden are caused by Chrome's renderer-process throttling. The only
   reliable fix is the user-side allowlist at
   `chrome://settings/performance` → "Always keep these sites active".
   The `ThrottlingNotice` banner exposes this fix in the UI. Do not add
   Page Visibility API overrides, MAIN-world keep-alive scripts,
   synthetic `visibilitychange` events, or background polling tricks
   that pretend to fix it.
4. **MarkdownBody must call `marked.parse` then `DOMPurify.sanitize`,
   in that order.** Escaping markdown source before parsing breaks
   fences and tables.
5. **Stable DOM IDs above must not change** without updating
   `scripts/test-studio-workshop-source.mjs` and any panel/transcript
   selectors that depend on them.

## Tests that lock the design

`scripts/test-studio-workshop-source.mjs` covers:

- Build pipeline (vite plugin react, postcss `.cjs`, tailwind config,
  tsconfig `react-jsx`, required deps)
- File existence (every component listed in the file layout above)
- DOM ID stability
- MarkdownBody sanitisation order
- Timeline 3-col grid + seat-tinted backgrounds + Move-to-last button
- Composer Ctrl+Period hotkey + moderator wrapper preview
- Store refresh-token guard
- ThrottlingNotice points at `chrome://settings/performance`

`scripts/test-runtime-regressions-source.mjs` is unrelated to the
Workshop and locks the orchestrator's runtime contracts. Workshop work
must NOT modify it.
