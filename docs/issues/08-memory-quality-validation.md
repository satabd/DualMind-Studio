# P0: Add memory quality validation before saving checkpoint memory

**GitHub:** [#2](https://github.com/satabd/DualMind-Studio/issues/2)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** High

## Problem

Session memory is currently storing low-quality entries that look like raw
artifacts rather than facts:

```
Risk: * risk_level
Assumption: ## Gemini said
Question: Unresolved Items:
```

Users see these in the Workshop Memory tab and in the side-panel
"Session Memory" preview. Worse, they get re-injected into the next turn
via `selectPromptMemory` → `[MEMORY]` block, which pollutes the prompt.

## Root cause

Two layers feed each other:

1. `src/background.ts` `buildArtifacts` builds artifact buckets by
   substring-matching transcript lines against words like `risk`, `?`,
   `should`, `recommend`. It happily captures markdown headings, bullet
   markers, and template fragments verbatim.
2. `src/sessionMemory.ts` `memoryEntriesFromCheckpoint` then takes
   `artifacts.decisions[0]`, `artifacts.risks[0]`, `artifacts.questions[0]`,
   `artifacts.ideas[0] || artifacts.highlights[0]` — no validation, no
   minimum length, no rejection of placeholders.

The memory pipeline trusts whatever the artifact extractor produced.

## Proposed fix

### 1. Tighten `makeMemoryEntry` in `src/sessionMemory.ts`

Reject entries whose normalized text:

- is shorter than ~20 characters
- matches `/^(#{1,6}\s|[-*]\s*$|\d+\.\s*$)/` (markdown heading, lone bullet, lone numbered marker)
- equals or contains only a banned placeholder phrase. Suggested initial list:
  - `Unresolved Items`
  - `Established Facts`
  - `Unsupported Claims`
  - `Risks`
  - `Questions`
  - `Decisions`
  - `* risk_level`
  - `## Gemini said`
  - `## ChatGPT said`
- is wholly contained in a "label-only" pattern like `^[A-Z][a-z_]+:\s*$`

If rejected, return `null` so `appendEntry` skips it.

### 2. Tighten `buildArtifacts` in `src/background.ts`

Before pushing a line into a bucket:

- skip lines matching `/^#{1,6}\s/`
- skip lines that are only a bullet/number marker
- skip lines shorter than 20 characters of meaningful content
- prefer the second non-trivial line of a turn over a heading-style first line

### 3. Surface source on memory cards

The audit recommended showing source explicitly on each entry (checkpoint
turn N / moderator turn M / agent / system) so users can audit where each
fact came from. The data is already in `entry.source` and `entry.tags`;
just render it on the card.

## Acceptance criteria

- Unit test: `makeMemoryEntry("risk", "* risk_level", ...)` returns `null`.
- Unit test: `makeMemoryEntry("question", "Unresolved Items:", ...)` returns `null`.
- Unit test: `memoryEntriesFromCheckpoint` on a checkpoint whose artifact
  buckets contain only placeholders returns `[]`.
- Manual: existing live sessions stop accumulating obviously-junk entries.
- The Workshop Memory tab shows source on each card.

## Files

- `src/sessionMemory.ts`
- `src/background.ts` (`buildArtifacts`)
- `src/studio/tabs/MemoryTab.tsx` (render source)
- `scripts/test-runtime-regressions-source.mjs` (new memory validation tests)

## Risk

Medium. Overly strict filters could empty memory for short conclusions;
keep the threshold conservative and add a unit test fixture of legitimate
short conclusions that should pass.

## Why before UI redesign

The audit recommended doing this *before* the panel/workshop split.
Otherwise the cleaner UI still displays bad memory and the user's trust
problem doesn't move.

## Related

- Audit finding F7 (2026-05-03 audit).
- Connects to issue 11 (per-turn memory snapshot): once snapshots are stored
  per turn, having clean source memory matters even more.
