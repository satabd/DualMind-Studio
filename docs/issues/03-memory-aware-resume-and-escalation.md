# [Feature] Memory-aware resume and escalation

## Problem

Resume flow currently depends mostly on immediate context and raw feedback. It should become smarter once structured memory exists.

## Proposed Change

Use session memory and moderator decisions when resuming from pauses, escalations, and branch continuations.

## Why It Matters

This is where memory becomes operational instead of just stored metadata.

## Initial Scope

- include relevant memory in escalation resolution prompts
- include accepted moderator decisions in resume context
- ensure branch resumes inherit the right subset of memory

## Acceptance Criteria

- resumed sessions retain important context without transcript flooding
- discussion mode stays disciplined while using memory
- moderator decisions are reflected in later agent behavior
