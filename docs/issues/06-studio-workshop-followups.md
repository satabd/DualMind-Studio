# Studio Workshop Follow-ups

Phase 1 adds the full Studio Workshop tab as a companion to the side panel. These follow-ups are intentionally deferred so Phase 1 can ship as a focused UX layer over the existing runtime state.

## 1. Workshop i18n

- Add `openWorkshop` to `src/i18n.ts`.
- Add `data-i18n="openWorkshop"` to the side-panel launcher button.
- Localize the hardcoded Workshop tab labels, empty states, buttons, and composer copy.
- Update the intervention preview so it either shows the real moderator wrapper from `background.ts` or is explicitly labeled as an abbreviated preview.

## 2. Persist Reasoning Seat Per Turn

- Add `seat?: AgentSeat` to `TranscriptEntry`.
- Stamp the active seat when `background.ts` persists each Gemini/ChatGPT turn.
- Stamp forced-fallback `System` turns with the seat of the agent whose output failed repair, not the next agent's seat. In `executeAgentTurn`, this is the `seat` argument for the speaker that just failed.
- Update `studio.ts` to read `entry.seat` instead of deriving seat placement from round math.
- Keep fallback derivation only for older sessions that do not have seat metadata: `entry.seat ?? deriveLegacySeat(entry, ...)`.

This should land before push-event Phase 2 so all UI surfaces agree on turn placement from persisted state.

## 3. Push Event Broadcasting

- Broadcast only `state-changed` for `brainstormState` updates and `turn-persisted` with `{ sessionId }` for session transcript changes.
- Treat broadcasts as fire-and-forget latency hints. Do not await acknowledgements or add retry logic when no receiver is active.
- Keep a 10s heartbeat poll as the source-of-truth recovery path for tabs that load late or miss runtime messages.
