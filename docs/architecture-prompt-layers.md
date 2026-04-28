# Prompt Layer Architecture

## Goal

DualMind Studio should stop treating prompts as one flat block and instead compose each turn from stable layers with distinct responsibilities.

## Prompt Blueprint

Each agent turn should be composed from six layers:

1. System Protocol
2. Identity
3. Operating Style
4. Memory
5. Session Context
6. Turn Task

## Layer Responsibilities

### 1. System Protocol

Non-negotiable rules.

Examples:
- audience discipline
- escalation schema
- evidence and uncertainty rules
- output boundaries
- safety constraints

### 2. Identity

Who the agent is in the system.

Examples:
- strategic synthesizer
- skeptical verifier
- systems architect
- exploratory framer

Identity should remain stable across turns within a session unless the user intentionally changes it.

### 3. Operating Style

How the agent reasons, not just how it sounds.

Examples:
- terse and falsification-first
- option-oriented and synthesis-heavy
- methodical and evidence-seeking
- exploratory but constraint-aware

This is the closest place for what users may call “soul”, but it should improve reasoning behavior rather than cosmetic tone.

### 4. Memory

Structured carry-forward context.

Examples:
- established facts
- unresolved questions
- rejected options
- moderator decisions
- branch lineage
- prior checkpoint summaries

Memory should be selective and structured. Avoid dumping raw transcript history by default.

### 5. Session Context

Current run state.

Examples:
- mode
- phase
- active checkpoint
- last speaker
- current escalation state
- branch origin

### 6. Turn Task

What this turn must do right now.

Examples:
- critique one proposal
- narrow from three options to two
- verify one assumption
- conclude or escalate

## Suggested Types

A future shared type model should likely include:

- PromptBlueprint
- AgentIdentity
- AgentStyle
- SessionMemory
- MemoryEntry
- TurnTask
- ProtocolProfile

## Memory Rules

Memory should be:

- local-first
- inspectable
- user-clearable
- scoped by session and optionally by branch
- compact enough to avoid prompt bloat

## UX Principles

- show users what memory is being used
- let users disable or prune memory
- keep basic mode simple
- move identity/style/memory editing into an advanced section

## Anti-Patterns

Avoid:

- personality cosmetics with no reasoning benefit
- giant unstructured memory dumps
- hidden prompt mutations users cannot inspect
- ambiguous overlap between identity and task
