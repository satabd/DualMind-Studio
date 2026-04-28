# [Feature] Prompt blueprint and layered composer

## Problem

The current orchestration still depends mainly on flat role prompts. That makes it harder to control protocol, identity, style, memory, and turn tasks independently.

## Proposed Change

Introduce a shared Prompt Blueprint model and a prompt composer that builds each agent turn from explicit layers:

- protocol
- identity
- style
- memory
- session context
- turn task

## Why It Matters

This is the core architectural shift that separates DualMind Studio from the original orchestrator and makes future memory and identity work coherent instead of incremental prompt sprawl.

## Initial Scope

- add shared types in src/types.ts
- add composition helpers in background.ts
- migrate at least one session type to the new layered flow

## Acceptance Criteria

- prompt construction is explicit in code
- each layer has a distinct responsibility
- existing session behavior remains functional during migration
