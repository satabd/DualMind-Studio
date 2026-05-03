# P1: Persist actually-sent prompt memory snapshot per turn

**GitHub:** [#6](https://github.com/satabd/DualMind-Studio/issues/6)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** Medium

## Problem

The "Prompt-Used Memory" preview in the side panel is computed by calling
`selectPromptMemory(session.memory)` from `panel.ts` against the saved
session. The orchestrator independently calls `selectPromptMemory` from
`background.ts` `runBrainstormLoop` (line ~967) when actually building the
prompt for the next turn.

Two independent calls to the same function on the same data *should* match
— but they can drift if:

- the session memory changes between the two calls (moderator decision,
  new checkpoint),
- the parameters or priority weights diverge later,
- a future selector becomes context-aware (e.g. "select memory relevant to
  the current intent").

The user is shown a "Prompt-Used Memory" panel that is not authoritative.

## Proposed fix

### 1. Snapshot at write time

When `executeAgentTurn` builds a turn, the result of
`selectPromptMemory(session.memory)` for that turn is already known.
Persist it on the entry.

In `src/types.ts`:

```ts
export interface TranscriptEntry {
    // ... existing fields
    promptMemorySnapshot?: MemoryEntry[];
}
```

In `src/background.ts` `executeAgentTurn` / `persistTurn`, set
`promptMemorySnapshot` to the `memory.entries` array that was actually
included in the rendered blueprint for this turn.

### 2. Read from the snapshot

Update the side panel and the Workshop to read the latest entry's
`promptMemorySnapshot` instead of recomputing. If the most recent agent
turn has no snapshot (legacy data), fall back to the current recomputation
so old sessions still render.

### 3. Optional: persist the rendered prompt too

Out of scope for this issue but a natural follow-up: `promptSnapshot?: string`
on the entry, captured from `renderPromptBlueprint(...)`. Issue 13 (prompt
inspector) depends on having this.

## Acceptance criteria

- Every new agent turn carries a `promptMemorySnapshot` reflecting exactly
  what was sent.
- The side panel's "Memory sent to agents this turn" view reads from the
  latest entry's snapshot.
- The Workshop optionally surfaces "memory sent for this turn" on each
  timeline card (hover or expandable).
- Storage cost stays small: cap at 8 entries (matches `selectPromptMemory`
  default limit).

## Files

- `src/types.ts`
- `src/background.ts` (`executeAgentTurn`, `persistTurn`)
- `src/panel.ts` (replace recomputation with snapshot read)
- `src/studio/components/Timeline.tsx` (optional per-turn snapshot view)

## Risk

Low. Storage delta is small (~8 entries × few hundred bytes per turn).

## Related

- Audit finding 6.E (2026-05-03 audit).
- Issue 8 (memory quality validation) is upstream; cleaner memory makes
  the snapshot more useful.
- Issue 13 (prompt inspector) builds on this — once memory snapshot is
  persisted, the next step is persisting the rendered prompt.
