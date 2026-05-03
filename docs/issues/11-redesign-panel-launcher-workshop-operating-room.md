# P1: Redesign Side Panel as launcher and Workshop as operating room

**GitHub:** [#5](https://github.com/satabd/DualMind-Studio/issues/5)
**Milestone:** v0.2.1 — Workshop Clarity and Drift Control
**Severity:** High (UX) / Medium (eng)

## Problem

The Side Panel and the Studio Workshop currently overlap heavily:

| Surface | Pause/Resume/Stop | Live timeline | Memory | Prompt-used memory | Checkpoints | Composer | Escalation card | Setup | Profiles | Outputs/Finales | Branches | History |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Side Panel | yes | yes | yes | yes | yes | yes (via Moderator Override) | yes | yes | yes | yes | yes | yes |
| Workshop | yes | yes | yes | no  | indirectly | yes (Composer) | yes | no  | no  | no  | no  | no  |

The user cannot tell which surface owns what. First-time users get hit
with ~25 affordances on the panel's Active Run tab alone.

## Target product model

```
Side Panel:
  Define Session → Start Run → Quick Monitor → Generate Outputs → History

Workshop Window:
  Observe → Understand → Steer → Resume → Narrow/Finalize → Inspect Memory/Decisions
```

## Proposed fix

### Keep in the Side Panel (Basic)

- Session Type
- Speaking Order (First Agent + Flip; remove the disabled second-agent select)
- Tab selectors for Gemini and ChatGPT (with green-dot when both detected)
- Working Style chips (rename of "Creative Direction Presets")
- Topic
- Rounds
- Start / Stop / Pause (small inline)
- Open Workshop CTA
- Compact live status (status badge + last 1–2 turns)
- Generate Output (rename of "Finales")
- History list

### Side Panel "More options" (Advanced, collapsible)

- Custom system prompts
- Saved Profiles
- Goal Framing (objective/constraints/success criteria)
- Full Collaboration Style dropdown
- Continue Session (additional rounds)

### Move to the Workshop

- Live timeline (full)
- Memory tab
- Prompt-used memory snapshot view (see issue 12)
- Checkpoint cards
- Branch picker
- Moderator Composer
- Escalation card
- Detailed phase/intent/repair status

### Auto-open Workshop on Start Run

When the user clicks Start Run, open the Workshop window automatically so
the live monitoring surface is in front. Keep a visible "Open Workshop"
button in the panel for users who closed it.

### Copy changes

Apply the friendly-label table from the 2026-05-03 audit (section 9): rename
"Creative Direction Presets" → "Working Style"; "Prompt-Used Memory" →
"Memory sent to agents this turn"; "Repair: forced" → "Forced fallback";
"Intervention Dock" → "Steering"; etc.

## Acceptance criteria

- Side Panel `panel.html` structural markup shrinks below ~150 lines.
- The Workshop is the only surface with Composer, EscalationCard, full
  Timeline, MemoryTab, and CheckpointCards.
- A first-time user can complete the loop *Define Session → Start Run →
  Monitor in Workshop → Generate Output → Review History* without seeing
  duplicated controls between panel and workshop.
- The friendly-label rename is applied across both surfaces.

## Files

- `src/panel.html`, `src/panel.ts`, `src/panel.css`
- `src/studio/App.tsx` (no structural change, but absorb sections moved
  from the panel as needed)
- `src/i18n.ts` (rename keys + ar/en strings)

## Risk

Medium. Power users will lose one-click pause from the panel — keep a
small Pause/Resume button in the panel header so the muscle-memory action
still works. Profiles/branches getting hidden behind "More options" needs
a clear collapsible affordance, otherwise users assume they are gone.

## Why after P0

This redesign is gated on:

- Issue 8 (memory quality) — otherwise the Workshop's Memory tab still
  shows junk entries after redesign.
- Issue 10 (header status model) — otherwise the Workshop's header still
  contradicts the timeline.

## Related

- Audit findings F1 and F2 (2026-05-03 audit).
- Audit section 7 (Recommended UX Model) and section 9 (Proposed Copy
  Changes).
