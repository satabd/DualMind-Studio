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

### Phase 1 Workshop Scope

The first workshop increment is now implemented:

- add `src/studio.html` and `src/studio.ts`
- register the new Vite entry
- add an "Open Workshop" button in the side panel header
- build a three-zone layout:
  - left rail: setup, profiles, memory, checkpoints
  - center: live transcript organized by Agent A / Agent B seats, with model transport badges
  - right rail: persistent intervention composer with pause/resume and escalation controls
- reuse existing background state, IndexedDB sessions, and pause/resume mechanics
- use polling initially, with push events deferred to a later phase

Tracked follow-ups:

- localize the side-panel "Open Workshop" launcher and workshop tab strings
- persist Agent A / Agent B seat metadata on transcript entries instead of deriving it in the workshop UI

Deferred workshop work:

- background push events for live state updates
- rendered prompt blueprint inspection per turn
- repair journey and memory diff per turn
- side-by-side branch comparison
- per-target moderator notes
- full PING_PONG prompt unification through the blueprint composer

## Development

Install dependencies:

```bash
npm install
```

Type-check:

```bash
npx tsc --noEmit
```

Build:

```bash
npm run build
```

Load the unpacked extension from `dist/` in a Chromium browser.

## Privacy Note

Prompts, transcripts, escalations, and session metadata are stored locally in the browser unless cleared. Review exported content before sharing it.
