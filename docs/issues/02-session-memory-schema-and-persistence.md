# [Feature] Session memory schema and persistence

## Problem

The system has transcripts and checkpoints, but no explicit memory model for carrying forward established facts, rejected options, decisions, or open questions.

## Proposed Change

Add a local-first session memory schema and persistence layer.

## Why It Matters

Without structured memory, the new repo cannot deliver better continuity than the original project.

## Initial Scope

- define SessionMemory and MemoryEntry types
- store memory in IndexedDB alongside sessions
- support updates from checkpoints, conclusions, and moderator decisions

## Acceptance Criteria

- memory is structured, inspectable, and clearable
- memory is scoped by session
- memory updates do not require raw transcript replay every time
