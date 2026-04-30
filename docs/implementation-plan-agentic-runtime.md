# Agentic Runtime Implementation Plan

## Goal

Establish the first typed agentic runtime slice: prompt blueprint types, a pure composer, and Agent Workshop integration.

## Architecture

Keep orchestration and browser automation in `src/background.ts`. Add `src/promptBlueprint.ts` as a pure module that converts agent identity, operating style, session context, memory, and turn task into a rendered prompt. Extend `src/types.ts` with shared runtime types.

## Tasks

### Task 1: Prompt Blueprint Types And Composer

Files:

- Modify `src/types.ts`
- Create `src/promptBlueprint.ts`
- Create `scripts/test-prompt-blueprint.mjs`

Steps:

1. Write a failing runtime test that imports `dist/promptBlueprint.js`.
2. Add shared types for prompt layers.
3. Implement default discussion protocol, identity, style, blueprint builder, and renderer.
4. Build and run the test.

### Task 2: Agent Workshop Prompt Migration

Files:

- Modify `src/background.ts`

Steps:

1. Replace the hard-coded `DISCUSSION` role prompt builders with calls to the composer.
2. Preserve existing phase guidance, convergence controls, repair, fallback, and escalation behavior.
3. Run type-check, build, and prompt composer test.

### Task 3: Memory Schema Slice

Files:

- Modify `src/types.ts`
- Modify `src/db.ts`
- Modify `src/background.ts`

Steps:

1. Add `SessionMemory` and `MemoryEntry` types.
2. Store memory on `BrainstormSession`.
3. Populate initial memory from checkpoints and moderator decisions.
4. Include selected memory in composed Agent Workshop prompts.

### Task 4: UI Transparency Slice

Files:

- Modify `src/panel.html`
- Modify `src/panel.ts`
- Modify `src/panel.css`
- Modify `src/i18n.ts`

Steps:

1. Add an advanced setup section for identity/style/memory mode.
2. Show active prompt layers or memory preview in the live session area.
3. Keep English and Arabic strings aligned.

## Verification

- `npx tsc --noEmit`
- `npm run build`
- `node scripts/test-prompt-blueprint.mjs`

## First Slice Boundary

This pass will complete Task 1 and the minimum viable part of Task 2. Memory and UI controls are documented but should be implemented as separate follow-up slices after the composer is stable.

## Progress Log

### 2026-04-30

- Completed Task 1: added prompt blueprint types, pure composer, Vite entry, and focused composer test.
- Completed Task 2: Agent Workshop prompt construction now flows through `src/promptBlueprint.ts`; the old `DISCUSSION` prompt block was removed from `ROLE_PROMPTS` so the blueprint composer is the single source of truth.
- Completed the first Task 3 memory slice: added pure session memory helpers, initialized session memory, persisted checkpoint and moderator-decision memory entries, selected compact memory for prompts, and carried compact memory into checkpoint branches.
- Added Arabic documentation in `docs/agentic-runtime-ar.md` explaining the approach, design justification, completed work, current limits, and next steps.
- Started Task 4 with a read-only memory transparency slice: the side panel now shows session memory count and the latest compact memory entries before destructive prune/clear controls are introduced.
- Extended Task 4 with confirmed clear/prune controls for session memory. The background service worker owns the memory mutations, while the panel only requests `clearSessionMemory` and `pruneSessionMemoryEntry` after confirmation.
- Added Prompt-Used Memory preview in the side panel. This uses the same `selectPromptMemory()` helper as the runtime, so users can see the difference between all stored memory and the compact subset selected for the next Agent Workshop prompt.
- Added bilingual English/Arabic comments in the new runtime code where they clarify architectural intent.
- Verification evidence:
  - `node scripts/test-prompt-blueprint.mjs` printed `prompt blueprint tests passed`.
  - `node scripts/test-session-memory.mjs` printed `session memory tests passed`.
  - `node scripts/test-memory-ui.mjs` printed `memory UI tests passed`.
  - `npm exec tsc -- --noEmit` completed and printed `TSC_DONE` when wrapped with an explicit completion marker.
  - `npm exec vite -- build` reached Vite success output: `built in 351ms`.
