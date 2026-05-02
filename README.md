# DualMind Studio

DualMind Studio is a browser-based Chromium extension for running structured collaboration between ChatGPT and Gemini directly from signed-in tabs, while evolving toward layered prompt architecture, memory, identity, and deeper agent operating models.

## No API Keys Required

This repository does not require OpenAI API keys or Gemini API keys.

- It works by automating the browser versions of ChatGPT and Gemini in tabs where you are already signed in.
- There is no built-in backend proxy or server-side secret exchange in this repository.
- Your browser session with those services is what powers the workflow.

## Repo Metadata

Suggested GitHub description:

> Browser-based multi-agent studio for ChatGPT and Gemini with no API keys, evolving toward memory, identity, and layered prompting.

Suggested About text:

> DualMind Studio is the successor to LLM Orchestrator: a Chromium side-panel workspace that coordinates ChatGPT and Gemini directly through signed-in browser tabs. The roadmap focuses on memory, prompt layers, identity, operating style, and stronger session continuity without requiring API keys.

## Positioning

DualMind Studio starts from the proven browser-orchestration base of the original project, but this repo is intended to grow into a more advanced system with:

- memory
- layered prompt architecture
- explicit system protocol
- identity and operating style per agent
- richer moderation and escalation behavior
- stronger session continuity

## Pinned Roadmap

### Phase 1: Agent Foundations

- separate protocol, identity, style, memory, context, and turn-task prompt layers
- define a shared prompt blueprint model in code
- make prompt construction explicit and inspectable

### Phase 2: Memory And Continuity

- add local-first memory primitives
- carry forward session conclusions, decisions, and open questions
- support memory-aware resumes and branch continuity

### Phase 3: Studio UX

- expose identity and operating style as first-class UI concepts
- show memory usage and prompt composition transparently
- make agent architecture easier to configure without leaking too much complexity
- add a full Studio Workshop tab for deep session inspection and intervention, while keeping the side panel as the compact live launcher and monitor

### Phase 4: Reliability

- improve drift resistance
- improve evidence labeling and uncertainty handling
- reduce repetitive loops with stronger convergence controls

## v0.2.0 Milestone Focus

The first major milestone should establish the architectural core for DualMind Studio:

- Prompt Blueprint model
- layered prompt composer
- local memory schema
- memory-aware resume flow
- advanced setup UI for identity/style/memory controls

See [docs/github-milestone-v0.2.0.md](./docs/github-milestone-v0.2.0.md).

## Architecture

- [Prompt Layer Architecture](./docs/architecture-prompt-layers.md)
- [DualMind Roadmap](./docs/dualmind-roadmap.md)
- [Issue Drafts](./docs/issues)

## Current Base

This repo was bootstrapped from LLM Orchestrator and currently retains:

- browser-based ChatGPT + Gemini tab orchestration
- collaborative exchange and agent workshop flows
- escalation handling
- checkpoints, branches, and transcript export
- local session history

## Studio Workshop Direction

DualMind Studio should keep both surfaces:

- **Side panel**: compact launcher, status monitor, quick pause/resume, and "Open Workshop" entry point.
- **Studio Workshop tab**: full workspace for transcript review, memory inspection, checkpoints, settings, escalation review, and moderator intervention.

The workshop tab is planned as a companion surface, not a side-panel replacement. The side panel remains useful because it can stay visible while Gemini and ChatGPT tabs are generating. The workshop tab is for deeper work when the user wants more space.

### Workshop UI (React + Tailwind)

The Studio Workshop ships as a React 19 app under `src/studio/`, built
with Tailwind v3, Radix primitives, shadcn-style components, and Zustand
for local UI state. The full architectural reference, design tokens,
file layout, and the hard constraints around the orchestrator are in
[docs/architecture-studio-workshop.md](./docs/architecture-studio-workshop.md).

Headline pieces:

- **Header** — sticky, state badge + breadcrumb + Pause/Resume/Stop/Refresh
- **ThrottlingNotice** — one-time dismissible banner that points users at
  Chrome's `chrome://settings/performance` "Always keep these sites
  active" allowlist (the only reliable fix for hidden-tab streaming
  stalls on ChatGPT and Gemini)
- **Sessions tab** — session list + vertical timeline (3-col grid:
  meta | seat-coloured node-on-rail | seat-tinted markdown card) +
  moderator composer + escalation card. Auto-scrolls to bottom unless
  the user scrolled up; "Move to last ↓" button restores autofollow.
- **Memory tab** — kind-grouped entries, filter chips, search,
  tombstone count.
- **Decisions tab** — decision memory, moderator interventions, final
  outputs.
- **Agents tab** — Synthesis (Agent A) and Skeptic (Agent B) identity
  cards (read-only placeholder; per-session overrides land later).

Markdown bodies render through `marked → DOMPurify` (in that order) and
use `dir="auto"` plus CSS logical properties so Arabic/Hebrew turns
flow right-to-left without any script detection.

### Hard rule: Workshop changes are UI-only

Any change to `src/background.ts`, `src/content.ts`, `src/db.ts`, or
`public/manifest.json` does **not** belong in a workshop PR. The
orchestrator never moves, creates, or focuses tabs/windows — agent
tabs are pre-opened by the user and selected via the popup. Hidden-tab
throttling is a Chrome browser feature and is solved with the
user-side allowlist surfaced by `ThrottlingNotice`, not with
JavaScript workarounds. See
[docs/architecture-studio-workshop.md](./docs/architecture-studio-workshop.md#hard-constraints-read-before-changing)
for the full list and the lessons that produced these rules.

### Deferred workshop work

- background push events for live state updates (currently 2s polling)
- rendered prompt blueprint inspection per turn
- repair journey and memory diff per turn
- side-by-side branch comparison
- per-target moderator notes
- per-session identity / operating-style overrides in the Agents tab
- localize Workshop strings (currently English only)
- persist `seat` directly on `TranscriptEntry` so the Timeline does
  not have to derive it

## Development

Install dependencies:

```bash
npm install
```

Type-check:

```bash
npx tsc --noEmit
```

Run the regression source tests (cheap, no runtime needed):

```bash
node scripts/test-runtime-regressions-source.mjs   # orchestrator contracts
node scripts/test-studio-workshop-source.mjs       # workshop UI contracts
```

Build:

```bash
npm run build
```

Load the unpacked extension from `dist/` in a Chromium browser.

## Privacy Note

Prompts, transcripts, escalations, and session metadata are stored locally in the browser unless cleared. Review exported content before sharing it.
