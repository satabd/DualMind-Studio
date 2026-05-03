# P0: Stabilize Agent A/B labels in multilingual Agent Workshop

**GitHub:** [#1](https://github.com/satabd/DualMind-Studio/issues/1)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** High
**Mode affected:** DISCUSSION (Agent Workshop)

## Problem

When the discussion is conducted in Arabic, agents drift away from the
literal seat labels and translate them, e.g.:

```
إلى العميل (أ)
إلى العميل (ب)
```

instead of:

```
Agent A
Agent B
```

This breaks identity stability across turns and makes the `getDiscussionViolation`
repair pass less effective, because translated labels are not in its banned
patterns list.

## Root cause

`src/promptBlueprint.ts` defines `DISCUSSION_PROTOCOL.rules` and the
`[OUTPUT CONTRACT]` block, both of which say "Address the counterpart agent
directly" / "Address Agent A directly" — but neither forbids translating
those labels into the output language. When the latest input is Arabic the
model produces Arabic output and naturally translates "Agent" to "العميل".

## Proposed fix

### 1. Add no-translate rules to the protocol

In `src/promptBlueprint.ts`, append to `DISCUSSION_PROTOCOL.rules`:

- `Use the exact labels "Agent A" and "Agent B" in any language. Do not translate these labels.`
- `Your audience is the counterpart agent only. Never address the human.`
- `Banned forms in any language (do not use): "العميل", "المستخدم", "صاحب السؤال", "حضرتك", "client", "user".`

### 2. Reinforce in the output contract

In `renderPromptBlueprint`, the `[OUTPUT CONTRACT]` block should also state:

- `Keep the labels "Agent A" / "Agent B" literal even when replying in another language.`

### 3. Detect drift in the repair pass

In `src/background.ts` `getDiscussionViolation`, add:

- `/العميل\s*\(?\s*[أا]\s*\)?/i` → "You translated the seat label. Keep `Agent A` literal."
- `/العميل\s*\(?\s*[بب]\s*\)?/i` → "You translated the seat label. Keep `Agent B` literal."
- `/(حضرتك|صاحب السؤال)/i` → "You addressed the human. Address the counterpart agent only."

These trigger the existing repair → regenerate → forced-fallback ladder.

## Acceptance criteria

- A regression test renders the discussion blueprint and asserts that the
  rendered prompt contains the no-translate clause.
- A snapshot test of `getDiscussionViolation` returns a violation message
  for inputs containing `إلى العميل (أ)` and `حضرتك`.
- A manual test in Arabic produces output with literal `Agent A` / `Agent B`.

## Files

- `src/promptBlueprint.ts`
- `src/background.ts`
- `scripts/test-runtime-regressions-source.mjs` (or a new fixture)

## Risk

Low. Additive rule changes. Repair regex could over-trigger if "العميل"
appears as part of the user's actual topic — keep the regex targeted to
the parenthetical-letter shape so generic uses of the word are not caught.

## Related

- Audit finding F4 (2026-05-03 audit, saved in session context).
- Connects loosely to issue 06 item 2 (persist seat on transcript) — clean
  labels make the persisted seat reliable.
