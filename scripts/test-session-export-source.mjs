import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const panelSource = readFileSync(resolve('src/panel.ts'), 'utf8');
const transcriptSource = readFileSync(resolve('src/transcript.ts'), 'utf8');
const sessionExportSource = readFileSync(resolve('src/sessionExport.ts'), 'utf8');

assert.match(sessionExportSource, /export function buildSessionMarkdown/, 'session export builder must be shared');
assert.match(sessionExportSource, /export function buildLastResponseMarkdown/, 'last-response export must use session data');
assert.match(panelSource, /buildSessionMarkdown\(session\)/, 'full export must use clean Studio session transcript');
assert.match(panelSource, /buildLastResponseMarkdown\(session\)/, 'last-response export must use clean Studio session transcript');
assert.match(transcriptSource, /buildSessionMarkdown\(session\)/, 'live transcript monitor must use shared clean exporter');
assert.doesNotMatch(panelSource, /scrapeConversation/, 'panel exports must not scrape raw model tabs');
assert.doesNotMatch(panelSource, /getLastResponse/, 'panel exports must not scrape raw model tab responses');
assert.doesNotMatch(panelSource, /chrome\.tabs\.sendMessage\(targetTabId/, 'panel exports must not read raw chat DOM');

console.log('session export source tests passed');
