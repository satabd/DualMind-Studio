import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');
const panelCss = readFileSync(resolve('src/panel.css'), 'utf8');
const i18n = readFileSync(resolve('src/i18n.ts'), 'utf8');

assert.match(panelHtml, /id="memoryPreviewCard"/);
assert.match(panelHtml, /id="memoryPreviewList"/);
assert.match(panelHtml, /id="promptMemoryList"/);
assert.match(panelHtml, /id="clearMemoryBtn"/);
assert.match(panelTs, /memoryPreviewCard/);
assert.match(panelTs, /function renderMemoryPreview/);
assert.match(panelTs, /function renderPromptMemoryPreview/);
assert.match(panelTs, /renderMemoryPreview\(\)/);
assert.match(panelTs, /renderPromptMemoryPreview\(\)/);
assert.match(panelTs, /function clearSessionMemory/);
assert.match(panelTs, /function pruneSessionMemoryEntry/);
assert.match(panelTs, /action: "clearSessionMemory"/);
assert.match(panelTs, /action: "pruneSessionMemoryEntry"/);
assert.match(panelTs, /clearMemoryBtn/);
assert.match(panelCss, /\.memory-preview/);
assert.match(panelCss, /\.memory-entry-actions/);
assert.match(i18n, /"memoryPreview"/);
assert.match(i18n, /"promptMemoryPreview"/);
assert.match(i18n, /"clearMemory"/);
assert.match(i18n, /"pruneMemoryEntry"/);
assert.match(i18n, /"ذاكرة الجلسة"/);
assert.match(i18n, /"ذاكرة المطالبة"/);

console.log('memory UI tests passed');
