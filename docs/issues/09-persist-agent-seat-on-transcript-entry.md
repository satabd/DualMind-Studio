# P0: Persist AgentSeat on TranscriptEntry and fix workshop speaker mapping

**GitHub:** [#3](https://github.com/satabd/DualMind-Studio/issues/3)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** High

## Problem

`TranscriptEntry` does not carry `AgentSeat`. Both the side-panel timeline
and the Studio Workshop timeline recompute seat from `agentTurnIndex`,
assuming strict alternation:

- Round 1: first speaker = Agent A, second speaker = Agent B
- Round 2: first speaker (now the other model) = Agent A, etc.

That assumption breaks after escalation+resume. In `runBrainstormLoop`,
when the first turn of a round emits `[ESCALATION_REQUIRED]`, the loop
decrements `currentRound` and `continue`s — but the first turn has already
been persisted. On resume, the same first speaker speaks again, producing
two same-agent transcript entries inside what the orchestrator considers
a single round. The recomputing UI then labels the second one as Agent B.

Result: the same model appears as both Agent A and Agent B in one round.

## Existing draft

`docs/issues/06-studio-workshop-followups.md` item 2 ("Persist Reasoning
Seat Per Turn") already drafted the persistence work. Use it as the
starting point. This issue extends it with the escalation/resume edge
case.

## Proposed fix

### 1. Persist seat on every turn

Per issue 06 item 2:

- Add `seat?: AgentSeat` to `TranscriptEntry` in `src/types.ts`.
- Stamp `seat` when `background.ts` `persistTurn` writes a Gemini/ChatGPT turn.
- For forced-fallback System turns, stamp the seat of the agent whose output failed repair.
- Update the workshop timeline (`src/studio/components/Timeline.tsx`) and the panel timeline to read `entry.seat ?? deriveLegacySeat(entry, ...)`.

### 2. Fix the escalation/resume reentry

The cleanest fix is to *not* let the same speaker take two transcript
slots in one round. Two viable approaches:

- **A (preferred):** when `firstTurn.escalated`, do not decrement
  `currentRound`. On resume, jump straight to the second-speaker turn for
  the same round, with `resumeContext` folded into its prompt. The first
  turn keeps its seat A; the second keeps its seat B.
- **B (fallback):** keep the decrement, but on the next iteration force the
  seat of the re-running first speaker to whatever it was before, *and*
  skip persisting a duplicate transcript entry for it.

Approach A removes the duplicate entirely.

## Acceptance criteria

- `TranscriptEntry.seat` is populated for every new turn.
- Workshop and panel timelines read `entry.seat` first; recompute is
  fallback only.
- Regression: trigger an escalation on the first turn of round 2, resume
  with feedback, and verify the timeline does not show the same model
  labelled both A and B in round 2.
- Old sessions saved before this change still render seats correctly via
  the legacy recompute fallback.

## Files

- `src/types.ts`
- `src/background.ts` (`executeAgentTurn`, `persistTurn`, `runBrainstormLoop`)
- `src/studio/components/Timeline.tsx`
- `src/panel.ts` (legacy timeline rendering, if still present after the
  panel/workshop split lands)
- `scripts/test-runtime-regressions-source.mjs`

## Risk

Medium. Persisted shape changes; old sessions need the recompute
fallback. The escalation/resume change must not break the existing
"escalation block in transcript" UX.

## Related

- Audit finding F5 (2026-05-03 audit).
- Issue `06-studio-workshop-followups.md` item 2 — supersede or close once
  this lands.
