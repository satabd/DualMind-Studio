# DualMind Studio

DualMind Studio is the successor track to LLM Orchestrator: a browser-based Chromium extension for running structured collaboration between ChatGPT and Gemini directly from signed-in tabs, while evolving toward layered prompt architecture, memory, identity, and deeper agent operating models.

## No API Keys Required

This repository does not require OpenAI API keys or Gemini API keys.

- It works by automating the browser versions of ChatGPT and Gemini in tabs where you are already signed in.
- There is no built-in backend proxy or server-side secret exchange in this repository.
- Your browser session with those services is what powers the workflow.

## Positioning

DualMind Studio starts from the proven browser-orchestration base of the original project, but this repo is intended to grow into a more advanced system with:

- memory
- layered prompt architecture
- explicit system protocol
- identity and operating style per agent
- richer moderation and escalation behavior
- stronger session continuity

## Near-Term Roadmap

1. Introduce a prompt-layer model with separate protocol, identity, style, memory, and turn-task composition.
2. Add memory primitives for local session recall and structured carry-forward context.
3. Rework session setup so agent personality and collaboration architecture are first-class concepts.
4. Preserve the no-API-key browser-based workflow while improving output reliability and session continuity.

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
