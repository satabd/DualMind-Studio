# Studio Workshop Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-page Studio Workshop tab that complements the side panel with a larger transcript, memory, checkpoint, and intervention workspace.

**Architecture:** Keep the background service worker as the single source of truth. Add a new Vite HTML entry for `studio.html` with dedicated `studio.ts` and `studio.css`, while adding one side-panel launcher button that opens the workshop tab.

**Tech Stack:** Chromium extension MV3, Vite multi-entry build, TypeScript, existing `extensionApi.ts` preview-safe adapters.

---

### Task 1: Lock Phase 1 Source Contract

**Files:**
- Create: `scripts/test-studio-workshop-source.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const vite = readFileSync(resolve('vite.config.ts'), 'utf8');
const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');
const studioHtml = readFileSync(resolve('src/studio.html'), 'utf8');
const studioTs = readFileSync(resolve('src/studio.ts'), 'utf8');
const studioCss = readFileSync(resolve('src/studio.css'), 'utf8');

assert.match(vite, /studio:\s*resolve\(__dirname,\s*'src\/studio\.html'\)/);
assert.match(panelHtml, /id="openWorkshopBtn"/);
assert.match(panelTs, /openWorkshopBtn/);
assert.match(panelTs, /createTab\('studio\.html'\)/);
assert.match(studioHtml, /id="studioLeftRail"/);
assert.match(studioHtml, /id="agentAColumn"/);
assert.match(studioHtml, /id="agentBColumn"/);
assert.match(studioHtml, /id="studioInterventionComposer"/);
assert.match(studioTs, /pauseBrainstorm/);
assert.match(studioTs, /resumeBrainstorm/);
assert.match(studioTs, /getBrainstormState/);
assert.match(studioTs, /getSession/);
assert.match(studioTs, /document\.visibilityState/);
assert.match(studioCss, /\.studio-shell/);
assert.match(studioCss, /grid-template-columns/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-studio-workshop-source.mjs`

Expected: FAIL because `src/studio.html` does not exist yet.

### Task 2: Add Workshop Entry And Launcher

**Files:**
- Create: `src/studio.html`
- Create: `src/studio.ts`
- Create: `src/studio.css`
- Modify: `vite.config.ts`
- Modify: `src/panel.html`
- Modify: `src/panel.ts`

- [ ] **Step 1: Add the Vite entry**

Add `studio: resolve(__dirname, 'src/studio.html')` to the Rollup input map.

- [ ] **Step 2: Add panel launcher**

Add `<button id="openWorkshopBtn" class="btn secondary" type="button">Open Workshop</button>` to the panel header controls and wire it to `createTab('studio.html')`.

- [ ] **Step 3: Add workshop skeleton**

Create a three-zone page: left rail, center transcript columns, right intervention dock.

### Task 3: Wire Live State And Composer

**Files:**
- Modify: `src/studio.ts`

- [ ] **Step 1: Poll state**

Use `sendRuntimeMessage({ action: "getBrainstormState" }, idleState)` and fetch the active session by `sessionId`.

- [ ] **Step 2: Render seat columns**

Render transcript cards into Agent A and Agent B columns using session `firstSpeaker` and alternating round order. System/User entries render in a shared stream.

- [ ] **Step 3: Wire intervention**

Pause button sends `{ action: "pauseBrainstorm" }`; resume button sends `{ action: "resumeBrainstorm", feedback }`; silent resume sends an empty feedback value.

- [ ] **Step 4: Gate polling by visibility**

Only poll every 2 seconds while `document.visibilityState === 'visible'`.

### Task 4: Verify

**Files:**
- Test: all `scripts/test-*.mjs`

- [ ] **Step 1: Run source tests**

Run: `Get-ChildItem scripts\test-*.mjs | ForEach-Object { node $_.FullName }`

Expected: all scripts pass.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 3: Build**

Run: `npx vite build`

Expected: exit 0 and `studio.html` emitted into `dist/`.
