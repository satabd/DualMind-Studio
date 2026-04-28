# [Feature] Memory transparency and controls

## Problem

If memory is added without visibility and control, users will not trust it and debugging will become harder.

## Proposed Change

Expose what memory is currently stored and what subset is being used for the current run.

## Why It Matters

Transparency is necessary for privacy, trust, and prompt debugging.

## Initial Scope

- show session memory in the UI
- allow clearing memory per session
- allow pruning selected memory entries
- document memory behavior clearly

## Acceptance Criteria

- users can inspect memory state
- users can delete or prune stored memory
- README and UI explain memory usage plainly
