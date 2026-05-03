# P1: Add prompt inspector for rendered blueprint

**GitHub:** [#7](https://github.com/satabd/DualMind-Studio/issues/7)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** Medium

## Problem

The layered prompt blueprint exists (`renderPromptBlueprint` in
`src/promptBlueprint.ts`) and is used for DISCUSSION mode, but the
rendered prompt is not inspectable from the UI. There is no way for the
user to:

- see exactly what was sent for a given turn,
- verify that memory entries were included,
- verify that the protocol/output-contract rules were applied,
- debug why an agent drifted.

This makes the layered architecture invisible to its users.

## Proposed fix

### 1. Persist the rendered prompt per turn

Add to `TranscriptEntry`:

```ts
promptSnapshot?: string;
```

Set it in `src/background.ts` `executeAgentTurn` when the prompt is built,
before sending it to the tab. Skip persistence for repair/regenerate
prompts (those are not the canonical turn prompt).

### 2. Workshop inspector affordance

In `src/studio/components/Timeline.tsx`, add a small "Show prompt" button
to each turn card. Clicking it opens a modal or expandable panel that
displays the `promptSnapshot` in a `<pre>` block with the six labelled
sections:

```
[SYSTEM PROTOCOL] …
[IDENTITY] …
[ROLE DIRECTIVE] …
[OPERATING STYLE] …
[MEMORY] …
[SESSION ANCHOR] …
[SESSION CONTEXT] …
[TURN TASK] …
[OUTPUT CONTRACT] …
```

(`renderPromptBlueprint` already produces this structure.)

### 3. Treat as Debug

Hide the affordance behind a "Show debug info" toggle or place the
inspector behind the same gate the audit recommends for raw repair status,
raw intent/phase, etc. Most users do not need it; power users do.

## Acceptance criteria

- New turns persist `promptSnapshot`.
- The Workshop has a per-turn "Show prompt" affordance, gated behind a
  Debug toggle.
- Clicking it shows the canonical layered prompt structure for that turn.
- Storage cost is bounded — consider truncation or compression for very
  long memory dumps.

## Files

- `src/types.ts`
- `src/background.ts` (`executeAgentTurn`)
- `src/studio/components/Timeline.tsx`
- a new `src/studio/components/PromptInspector.tsx` (modal/expander)
- `src/i18n.ts`

## Risk

Low–Medium. Storage cost is the main concern; rendered prompts can be
several KB each. Mitigation: truncate to ~16KB or store only the layer
labels + memory-entry IDs and re-render on demand from the entry's
`promptMemorySnapshot` (issue 12) plus the session's framing.

## Related

- Audit finding F1 part of "no prompt inspection from the UI" gap
  (2026-05-03 audit).
- Issue 12 (memory snapshot) is upstream.
