# P2: Migrate PING_PONG from ROLE_PROMPTS to PromptBlueprint

**GitHub:** [#8](https://github.com/satabd/DualMind-Studio/issues/8)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** Medium (architecture) / Low (user-visible)

## Problem

`PING_PONG` mode (Collaborative Exchange) still flows through the legacy
`ROLE_PROMPTS` table in `src/background.ts` (lines ~172–238). The comment
on line 171 acknowledges this: *"Legacy PING_PONG prompt path. DISCUSSION
prompts use promptBlueprint.ts; migrate this table after the drift-control
changes settle."*

Consequences:

- PING_PONG prompts have no `[SYSTEM PROTOCOL]`, no `[IDENTITY]`, no
  `[OPERATING STYLE]`, no `[MEMORY]`, no `[OUTPUT CONTRACT]`.
- Memory built up during a PING_PONG session is never read back into
  prompts.
- PING_PONG and DISCUSSION effectively behave like two different products.
- Future improvements to the protocol or output contract have to be
  duplicated in two places (or skipped for PING_PONG).

## Proposed fix

### 1. Add `buildPingPongBlueprint`

In `src/promptBlueprint.ts`, mirror `buildDiscussionBlueprint` with a
`buildPingPongBlueprint` that shares:

- `protocol` (PING_PONG-specific protocol allowing user-facing framing,
  since these turns are deliberately presentational)
- `identity` (Agent A / Agent B identities can stay; or define
  PING_PONG-specific ones if the role calls for it)
- `style` (DEFAULT_STYLE)
- `memory` (same `selectPromptMemory` flow)

Differs in:

- `task.instructions` — drawn from a small per-role task table that
  replaces the per-agent init/loop functions in `ROLE_PROMPTS`.

### 2. Wire it up

In `src/background.ts` `executeAgentTurn`, replace the
`isOpeningTurn ? agent.initPrompt(...) : agent.loopPrompt(...)` branch with
`renderPromptBlueprint(buildPingPongBlueprint(...))`.

Drop `addPhaseGuidance` once the blueprint includes phase guidance in its
session-context layer.

### 3. Delete `ROLE_PROMPTS` and `getAgentConfig` legacy bits

After verifying parity on a fixture set of topics + roles, remove the
legacy table.

### 4. Migrate any custom-prompt support

PING_PONG currently passes `customGeminiPrompt` / `customChatGPTPrompt`
straight into the role functions for the `CUSTOM` role. The blueprint
should accept these as part of `roleDirective` for the `CUSTOM` case so
the user's custom prompt becomes one layer rather than the whole prompt.

## Acceptance criteria

- PING_PONG turn prompts contain the canonical six layers when rendered.
- Session memory is read into PING_PONG prompts via `[MEMORY]`.
- A regression fixture (one topic × each existing role) produces output
  that is no worse than the legacy path on a small manual eval.
- `ROLE_PROMPTS` and the legacy code path are removed.

## Files

- `src/promptBlueprint.ts`
- `src/background.ts`
- `scripts/test-runtime-regressions-source.mjs`

## Risk

Medium. PING_PONG roles like `EXPANDER` ("Yes, And…") and
`HISTORIAN_FUTURIST` rely on very specific framings in the legacy prompts.
The blueprint will need to preserve those framings inside the role
directive layer to avoid regressing output quality.

## Why P2

Doing this before the P0 set risks destabilizing the one product surface
that mostly works (PING_PONG). The audit recommended polishing prompt
architecture *after* memory quality and UI clarity land.

## Related

- Audit finding F8 (2026-05-03 audit).
- Issue 12 (per-turn memory snapshot) and issue 13 (prompt inspector)
  become more useful once PING_PONG is on the blueprint.
