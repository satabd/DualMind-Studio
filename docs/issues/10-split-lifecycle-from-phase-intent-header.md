# P0: Split lifecycle status from phase/intent in Workshop header

**GitHub:** [#4](https://github.com/satabd/DualMind-Studio/issues/4)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** Medium

## Problem

The Studio Workshop header in `src/studio/components/Header.tsx` glues four
orthogonal axes of state into one breadcrumb:

```
Idle · Round 4/7 · FINALIZE · critique
```

After the convergence-driven early stop in `runBrainstormLoop`, the engine
state freezes with `currentPhase = "FINALIZE"` and a stale `currentIntent`,
while the actual transcript shows mostly `DIVERGE` entries. The result is
that the header contradicts the timeline.

The four axes mean different things:

- `active`/`isPaused`/`awaitingHumanDecision` → lifecycle status
- `currentRound`/`rounds` → progress
- `currentPhase` → which phase the engine *would* use for the next turn
- `currentIntent` → which move the engine *would* make next

After the loop ends, `currentPhase` and `currentIntent` are not meaningful
and should not be shown.

## Proposed fix

### Status model

```
Lifecycle status: Idle | Running | Paused | Finished
Round progress:   N of M (only when active or finished)
Session phase:    Explore | Narrow | Finalize (derived from last completed turn's phase)
Next move:        Expand | Critique | Verify | Combine | Narrow | Conclude (only while Running)
```

### Header implementation

In `Header.tsx`, replace the single breadcrumb with three or four small
fields:

```
Status: Running       (badge variant runs/pauses)
Round:  3 of 7
Phase:  Narrow
Move:   Verify
```

When `Idle` or `Finished`, omit "Move". When deriving "Phase" for a
finished session, take it from the last completed transcript entry's
`phase`, not from `state.currentPhase`.

### Friendly labels

Use the friendly names, not the enum strings:

- `DIVERGE → Explore`
- `CONVERGE → Narrow`
- `FINALIZE → Finalize`
- `expand → Expand`, `critique → Critique`, `verify → Verify`,
  `combine → Combine`, `narrow → Narrow`, `conclude → Conclude`,
  `escalate → Escalation`, `synthesize → Synthesize`,
  `moderate → Moderator`

## Acceptance criteria

- After early stop on round 4 of 7 with all entries `DIVERGE`, the header
  reads `Finished · 4 of 7 · Phase: Explore` (no "Move", no "FINALIZE",
  no "critique").
- While running, the header reads `Running · Round 3 of 7 · Phase: Narrow · Move: Verify`.
- When idle (no run started), only `Idle · No active session` shows.
- The breadcrumb DOM ID `studioBreadcrumb` is preserved (the
  `test-studio-workshop-source.mjs` test depends on it).

## Files

- `src/studio/components/Header.tsx`
- `src/studio/store/workshop.ts` (optional helper: derive `lastTurnPhase`
  from the selected session)
- `src/i18n.ts` (add friendly-name translations if missing for both en/ar)

## Risk

Low. Pure presentation change once the derivation helper is added. The
underlying `BrainstormState` shape does not need to change — but optionally
adding `BrainstormState.lifecycleStatus: 'idle' | 'running' | 'paused' | 'finished'`
would make the derivation cleaner and reusable from the panel.

## Related

- Audit finding F6 (2026-05-03 audit).
- Audit's recommended copy table (section 9) covers the friendly-label
  rename across the rest of the UI.
