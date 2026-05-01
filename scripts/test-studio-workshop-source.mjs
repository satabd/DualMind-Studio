import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const vite = readFileSync(resolve('vite.config.ts'), 'utf8');
const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');
const studioHtmlPath = resolve('src/studio.html');
const studioTsPath = resolve('src/studio.ts');
const studioCssPath = resolve('src/studio.css');

assert.ok(existsSync(studioHtmlPath), 'studio.html must exist as the workshop tab entry');
assert.ok(existsSync(studioTsPath), 'studio.ts must drive the workshop tab');
assert.ok(existsSync(studioCssPath), 'studio.css must style the workshop tab');

const studioHtml = readFileSync(studioHtmlPath, 'utf8');
const studioTs = readFileSync(studioTsPath, 'utf8');
const studioCss = readFileSync(studioCssPath, 'utf8');

assert.match(vite, /studio:\s*resolve\(__dirname,\s*'src\/studio\.html'\)/, 'Vite must build studio.html');
assert.match(panelHtml, /id="openWorkshopBtn"/, 'side panel must expose an Open Workshop button');
assert.match(panelTs, /openWorkshopBtn/, 'panel script must bind the Open Workshop button');
assert.match(panelTs, /createTab\('studio\.html'\)/, 'panel must open the workshop tab manually');

assert.match(studioHtml, /id="studioLeftRail"/, 'workshop must have a left rail');
assert.match(studioHtml, /id="agentAColumn"/, 'workshop must have an Agent A transcript column');
assert.match(studioHtml, /id="agentBColumn"/, 'workshop must have an Agent B transcript column');
assert.match(studioHtml, /id="studioInterventionComposer"/, 'workshop must have a persistent intervention composer');
assert.match(studioHtml, /id="pauseLoopBtn"/, 'workshop must expose pause control');
assert.match(studioHtml, /id="resumeWithCommentBtn"/, 'workshop must expose resume with comment control');

assert.match(studioTs, /pauseBrainstorm/, 'workshop must reuse existing pause mechanic');
assert.match(studioTs, /resumeBrainstorm/, 'workshop must reuse existing resume mechanic');
assert.match(studioTs, /getBrainstormState/, 'workshop must read background state');
assert.match(studioTs, /getSession/, 'workshop must read the active session');
assert.match(studioTs, /document\.visibilityState/, 'workshop polling must be visibility-gated');
assert.match(studioTs, /Ctrl\+Period/, 'workshop must document the intervention hotkey in code');

assert.match(studioCss, /\.studio-shell/, 'workshop layout shell must be styled');
assert.match(studioCss, /grid-template-columns/, 'workshop must use a three-zone grid layout');
assert.match(studioCss, /@media \(max-width: 900px\)/, 'workshop must respond at narrow widths');

console.log('studio workshop source tests passed');
