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
