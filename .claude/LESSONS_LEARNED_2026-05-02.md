# Lessons Learned — Session 2026-05-02 (Claude → Codex handoff)

This document records mistakes made by Claude during a session that started
from clean baseline `f1adf81 Clarify Studio Workshop follow-up contracts`
and ended with a full revert at the user's request.  It exists so the next
session — Claude or Codex — does not repeat the same pattern.

## What the user originally asked
"The Studio Workshop timeline isn't updating live during a brainstorm —
I have to switch to the agent tabs to make progress happen."

## Root cause (confirmed via web search at end of session)
Chrome throttles hidden tabs at the **renderer-process level**:
- `setTimeout`/`setInterval` clamped to 1Hz (and ~1 wake-up/min after 5 min)
- DOM commits / paint may be deferred
- SSE / WebSocket heartbeats can be dropped
- After 5 minutes, the tab may be frozen entirely

This is a deliberate browser feature, identical for ChatGPT, Gemini, and
every other web app.  **No purely-JS workaround inside the page or content
script fully beats it.**  The only reliable fix is the user-side allowlist:
`chrome://settings/performance` → "Always keep these sites active" → add
`chatgpt.com`, `chat.openai.com`, `gemini.google.com`.

Reference extensions ("Page Keep-Alive", "No Tab Throttle") use the same
combination — Page Visibility API override + telling the user to use the
allowlist — because there is no programmatic way around the engine throttle.

## What Claude did wrong (in order)

### 1. Compounded speculative fixes instead of verifying each one
- Added MAIN-world Page Visibility API override (`keepalive.js`).
- When that didn't fix it: added background-driven polling
  (`checkIdleStatus` in content.ts, polling loop in `sendPromptToTab`).
- When that didn't fix it: added agent-window isolation that called
  `chrome.windows.create({tabId: geminiTabId, focused: false})` to physically
  move the user's Gemini tab into a new window.

Each new fix made the codebase more complex without removing the previous
failed attempt.  When fix N+1 failed, fix N was still in the tree, making
the eventual revert larger.

**Rule:** if fix N doesn't visibly help, REMOVE it before adding fix N+1.

### 2. Took an action with persistent side effects without consent
`chrome.windows.create({tabId})` **detaches** the tab from its current window
and puts it in a new window.  This is a destructive change to the user's
browser state that **persists after the code is reverted** — the tab does
not go back to where it was.  The user lost their tab layout and (rightly)
read this as "DualMind moved my tabs without asking."

**Rule:** orchestrator must NEVER call `chrome.windows.create`,
`chrome.tabs.move`, or otherwise reorganize the user's tabs/windows.  Tabs
are pre-opened by the user and selected via the popup; the orchestrator's
only job is to send messages to existing tab IDs.

### 3. Dispatched a synthetic `visibilitychange` event into the agent page
The MAIN-world script not only overrode `document.hidden` /
`document.visibilityState` but also called
`document.dispatchEvent(new Event('visibilitychange'))` to "wake up" pages
that had already entered a paused state.  This fires the page's own handlers,
which on ChatGPT may restart the SSE stream — killing an in-flight
generation.  Likely explanation for the user reporting "ChatGPT broke,
Gemini still works."

**Rule:** do not synthesize events into pages we don't own.  Property
overrides and capture-phase event blocking are bounded; dispatching events
is unbounded.

### 4. Locked speculative changes into the test suite
Each new fix came with new assertions in
`scripts/test-runtime-regressions-source.mjs`.  When the user asked for a
revert, the tests had to be unwound too.  Tests that lock unverified
behavior become anchors that resist rollback.

**Rule:** add a regression assertion only after the fix has been confirmed
working by the user.  Speculative fixes get NO test coverage.

### 5. Misread the symptom
"I have to switch to tabs to get the timeline updated" is a Chrome-level
throttling problem.  Claude tried to engineer around it inside the
extension instead of immediately surfacing the user-side allowlist as the
real fix.  Hours of changes when the answer was a one-line UI hint.

**Rule:** when the symptom matches a known browser behavior, document the
browser-side fix first.  Engineer a workaround only if the user explicitly
declines the browser-side fix.

## What stays valid from earlier in the session
The React/shadcn Studio Workshop migration (uncommitted, in `src/studio/`,
`src/studio.tsx`, `src/studio.css`, `tailwind.config.ts`, `postcss.config.cjs`,
plus `package.json` / `vite.config.ts` updates) is being reverted at the
user's request — they want to start from `f1adf81` again.  This is not a
verdict on the React migration itself; it's a verdict on Claude's overall
session conduct.  If the React migration is re-attempted, it should land in
its own focused PR with no orchestrator-side changes mixed in.

## Hard rules going forward
1. The orchestrator must NEVER create, move, or close tabs or windows.
2. Do not dispatch synthetic events into agent pages.
3. For background-tab throttling, document `chrome://settings/performance`
   as the fix.  Do not engineer around it inside the extension.
4. Do not compound speculative fixes — remove the previous attempt first.
5. Do not lock unverified fixes into the test suite.
6. The clean baseline is commit `f1adf81`.

## File-level revert plan executed
- `git restore` on: package.json, package-lock.json, tsconfig.json,
  vite.config.ts, scripts/test-runtime-regressions-source.mjs,
  scripts/test-studio-workshop-source.mjs, src/background.ts, src/content.ts,
  src/studio.css, src/studio.html, src/studio.ts (was deleted)
- Delete untracked: postcss.config.cjs, tailwind.config.ts, src/studio.tsx,
  src/studio/ directory
- Leave alone: .claude/ (this directory and its contents)
- Delete dist/ to force a fresh build from the restored sources
