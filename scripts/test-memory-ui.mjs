import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Memory UI moved out of the side panel and into the Workshop in v0.2.2
// (issue #18 item 1).  This test asserts the new shape: the Workshop's
// MemoryTab owns the clear/prune controls, panel.html no longer hosts the
// memory preview, and the runtime-message contracts (clearSessionMemory,
// pruneSessionMemoryEntry) are wired through the studio extension wrapper.

const memoryTabSource = readFileSync(resolve('src/studio/tabs/MemoryTab.tsx'), 'utf8');
const studioExtension = readFileSync(resolve('src/studio/lib/extension.ts'), 'utf8');
const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');
const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');
const i18n = readFileSync(resolve('src/i18n.ts'), 'utf8');

// ---------------------------------------------------------------------------
// Workshop owns memory clear + prune.
// ---------------------------------------------------------------------------
assert.match(memoryTabSource, /id="clearMemoryBtn"/, 'MemoryTab must keep the stable clearMemoryBtn DOM id');
assert.match(memoryTabSource, /clearSessionMemory\(/, 'MemoryTab must call the clearSessionMemory wrapper');
assert.match(memoryTabSource, /pruneSessionMemoryEntry\(/, 'MemoryTab must call the pruneSessionMemoryEntry wrapper');
assert.match(memoryTabSource, /memory-entry-actions/, 'MemoryTab must keep the per-entry actions container class');

assert.match(studioExtension, /export async function clearSessionMemory/, 'studio extension wrapper must export clearSessionMemory');
assert.match(studioExtension, /export async function pruneSessionMemoryEntry/, 'studio extension wrapper must export pruneSessionMemoryEntry');
assert.match(studioExtension, /action: 'clearSessionMemory'/, 'clearSessionMemory wrapper must use the existing background message');
assert.match(studioExtension, /action: 'pruneSessionMemoryEntry'/, 'pruneSessionMemoryEntry wrapper must use the existing background message');

// ---------------------------------------------------------------------------
// Background still handles the runtime messages (kept independent of UI).
// ---------------------------------------------------------------------------
assert.match(backgroundSource, /action === "clearSessionMemory"/, 'background must still handle clearSessionMemory messages');
assert.match(backgroundSource, /action === "pruneSessionMemoryEntry"/, 'background must still handle pruneSessionMemoryEntry messages');

// ---------------------------------------------------------------------------
// Side panel must NOT carry the memory previews any more.
// ---------------------------------------------------------------------------
assert.doesNotMatch(panelHtml, /id="memoryPreviewCard"/, 'panel.html must not host memoryPreviewCard (moved to Workshop)');
assert.doesNotMatch(panelHtml, /id="memoryPreviewList"/, 'panel.html must not host memoryPreviewList (moved to Workshop)');
assert.doesNotMatch(panelHtml, /id="promptMemoryList"/, 'panel.html must not host promptMemoryList (moved to Workshop)');
assert.doesNotMatch(panelTs, /function renderMemoryPreview/, 'panel.ts must not render memory preview');
assert.doesNotMatch(panelTs, /function renderPromptMemoryPreview/, 'panel.ts must not render prompt-used memory preview');

// ---------------------------------------------------------------------------
// i18n keeps the legacy memory keys (orphan strings; safe to keep) so AR
// translations remain available if/when memory copy is reused.
// ---------------------------------------------------------------------------
assert.match(i18n, /"ذاكرة الجلسة"/);
assert.match(i18n, /"ذاكرة المطالبة"/);

console.log('memory UI tests passed');
