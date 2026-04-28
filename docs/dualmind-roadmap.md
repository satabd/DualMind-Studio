# DualMind Studio Architecture Notes

## Core Prompt Layers

Each agent should eventually compose its turn from:

1. System Protocol
2. Identity
3. Operating Style
4. Memory
5. Session Context
6. Turn Task

## Why This Repo Exists

The original LLM Orchestrator repo is optimized around browser orchestration.
This repo exists to explore the next layer of agent design: memory, deeper identity, and more stable internal collaboration behavior.

## Constraints

- Keep the browser-based no-API-key workflow
- Preserve compatibility with signed-in ChatGPT and Gemini tabs
- Prefer local-first storage and explainability
- Avoid personality cosmetics unless they improve reasoning quality
