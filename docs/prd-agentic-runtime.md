# PRD: Agentic Runtime Foundations

## Problem

DualMind Studio inherited a useful browser orchestration loop from LLM Orchestrator, but the core behavior is still mostly prompt ping-pong. The current Agent Workshop mode has guardrails, repair prompts, convergence checks, checkpoints, and escalation blocks, but those controls are embedded as large strings inside `src/background.ts`.

This makes it hard to evolve the system into productive agents with stable identity, operating style, memory, and disciplined thinking. The next product step is to make the agent model explicit and inspectable.

## Goal

Build a local-first agent runtime that composes each model turn from typed layers:

1. System Protocol
2. Identity
3. Operating Style
4. Memory
5. Session Context
6. Turn Task

The product should move from endless exchange toward bounded working sessions that can explore, critique, converge, escalate, and produce artifacts.

## Users

- Builders who want ChatGPT and Gemini to pressure-test ideas without manually copying context.
- Product and architecture thinkers who want productive disagreement instead of generic chat.
- Power users who want to tune agent identity, style, memory, and guardrails.

## Success Criteria

- Prompt construction is explicit in code, not hidden inside ad hoc string templates.
- Each turn has a declared agent identity, style, phase, intent, and output contract.
- Agent Workshop remains agent-to-agent, not user-facing assistant chat.
- The system limits looping by using phases, convergence checks, memory, checkpoints, and escalation.
- Advanced configuration is inspectable without making the default setup complex.

## Non-Goals For The First Slice

- No backend service.
- No API keys.
- No cloud memory.
- No generic provider plugin framework.
- No full UI redesign before the runtime model exists.

## Product Principles

- Productive personality means reasoning behavior, not cosmetic tone.
- The human is moderator and decision owner, not the audience of every agent turn.
- Memory must be selective, local-first, inspectable, and clearable.
- Guardrails must be layered: instruction, validation, repair, forced fallback, and escalation.
- Default mode stays simple; advanced identity/style/memory controls sit behind an advanced section.

## First Build Slice

The first implementation slice creates a typed prompt blueprint and composer. It will not replace every role prompt immediately. It establishes the architecture and migrates the Agent Workshop prompt path first, because that is where agentic behavior matters most.
