# GitHub Milestone: v0.2.1

## Title

v0.2.1 — Workshop Clarity and Drift Control

## Goal

Make the Studio Workshop trustworthy as a daily working surface: stop label
drift, stop bad memory, give the user a status header they can read at a
glance, and finish the panel-vs-workshop responsibility split.

## Why this milestone exists

The v0.2.0 work landed the layered prompt blueprint, structured session
memory, and the React Studio Workshop. The audit in 2026-05-03 (saved in
session memory) confirmed the architecture is moving in the right direction
but found that the UI exposes too many internal concepts at once and that
memory entries are not clean enough to be trusted by the user or re-injected
into prompts. v0.2.1 closes those gaps so v0.3 can build on a stable base.

## Scope

### Must Have (P0)

- Stable `Agent A` / `Agent B` labels in any language (no Arabic drift to
  "العميل").
- Memory-quality validation that rejects placeholder fragments, markdown
  headings, and short stubs before they enter `SessionMemory`.
- `AgentSeat` persisted on every `TranscriptEntry` so the workshop timeline
  never recomputes seat from index. (Already drafted as item 2 of
  `06-studio-workshop-followups.md` — finish it.)
- Status header in the Workshop that separates lifecycle status, round
  progress, session phase, and current move into orthogonal fields.

### Should Have (P1)

- Side Panel becomes the launcher + history; Workshop becomes the operating
  room. All live monitoring + intervention surfaces move to the Workshop.
- Per-turn snapshot of the memory actually sent to the agent, persisted on
  `TranscriptEntry`. UI reads from the snapshot, not a recomputation.
- Prompt inspector inside the Workshop that lets the user view the rendered
  blueprint that produced any given turn.

### Not Yet (P2 / later)

- Migrate `PING_PONG` from `ROLE_PROMPTS` to a sibling `PromptBlueprint`.
- Per-session identity / operating-style overrides (the Agents tab today is
  read-only by design).

## Tracking Issues

1. [#1](https://github.com/satabd/DualMind-Studio/issues/1) — P0: Stabilize Agent A/B labels in multilingual Agent Workshop
2. [#2](https://github.com/satabd/DualMind-Studio/issues/2) — P0: Add memory quality validation before saving checkpoint memory
3. [#3](https://github.com/satabd/DualMind-Studio/issues/3) — P0: Persist AgentSeat on TranscriptEntry and fix workshop speaker mapping
4. [#4](https://github.com/satabd/DualMind-Studio/issues/4) — P0: Split lifecycle status from phase/intent in Workshop header
5. [#5](https://github.com/satabd/DualMind-Studio/issues/5) — P1: Redesign Side Panel as launcher and Workshop as operating room
6. [#6](https://github.com/satabd/DualMind-Studio/issues/6) — P1: Persist actually-sent prompt memory snapshot per turn
7. [#7](https://github.com/satabd/DualMind-Studio/issues/7) — P1: Add prompt inspector for rendered blueprint
8. [#8](https://github.com/satabd/DualMind-Studio/issues/8) — P2: Migrate PING_PONG from ROLE_PROMPTS to PromptBlueprint

## Recommended execution order

1. P0-1 Arabic Agent A/B drift
2. P0-2 Memory quality validation
3. P0-3 Persist AgentSeat on TranscriptEntry
4. P0-4 Status header model
5. P1-5 Panel/Workshop responsibility split
6. P1-6 Per-turn memory snapshot
7. P1-7 Prompt inspector
8. P2-8 PING_PONG migration

The P0 set is ordered before any UI redesign on purpose: a cleaner UI that
still surfaces drifted labels and junk memory entries does not move the
trust needle.

## Exit Criteria

- Discussion-mode runs in Arabic produce literal `Agent A` / `Agent B` in
  every turn; repair detection catches drift if it happens.
- No memory entry is shorter than the validator floor, and no entry equals
  a known placeholder fragment. Existing test fixtures pass.
- The Workshop timeline never shows the same model labelled both A and B in
  one round, including after escalation+resume.
- The Workshop header reads `Finished · 4/7 · Phase: Explore` after early
  stop on round 4 of 7 with all entries in DIVERGE — never the conflated
  `Idle · Round 4/7 · FINALIZE · critique`.
- The Side Panel no longer renders the live timeline, memory previews, or
  composer; the Workshop owns those surfaces.
