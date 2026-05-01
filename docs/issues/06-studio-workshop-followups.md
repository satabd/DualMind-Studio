# Studio Workshop Follow-ups

Phase 1 adds the full Studio Workshop tab as a companion to the side panel. These follow-ups are intentionally deferred so Phase 1 can ship as a focused UX layer over the existing runtime state.

## 1. Workshop i18n

- Add `openWorkshop` to `src/i18n.ts`.
- Add `data-i18n="openWorkshop"` to the side-panel launcher button.
- Localize the hardcoded Workshop tab labels, empty states, buttons, and composer copy.

## 2. Persist Reasoning Seat Per Turn

- Add `seat?: AgentSeat` to `TranscriptEntry`.
- Stamp the active seat when `background.ts` persists each Gemini/ChatGPT turn.
- Update `studio.ts` to read `entry.seat` instead of deriving seat placement from round math.
- Keep fallback derivation only for older sessions that do not have seat metadata.

This should land before push-event Phase 2 so all UI surfaces agree on turn placement from persisted state.
