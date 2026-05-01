import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dbSource = readFileSync(resolve('src/db.ts'), 'utf8');
const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');
const contentSource = readFileSync(resolve('src/content.ts'), 'utf8');
const panelSource = readFileSync(resolve('src/panel.ts'), 'utf8');
const transcriptSource = readFileSync(resolve('src/transcript.ts'), 'utf8');

assert.match(dbSource, /mutateSession/, 'session mutations must use one readwrite transaction');
assert.doesNotMatch(
  dbSource,
  /export async function updateSession[\s\S]*?await getSession/,
  'updateSession must not do read in one transaction and write in another'
);
assert.doesNotMatch(
  dbSource,
  /export async function appendCheckpoint[\s\S]*?await getSession/,
  'appendCheckpoint must not do read in one transaction and write in another'
);

assert.match(backgroundSource, /activeRunId/, 'background loop must track a single active run owner');
assert.match(backgroundSource, /function beginRun/, 'start and continue must acquire an atomic run guard');
assert.match(backgroundSource, /runBrainstormLoop\(runId/, 'loop must receive its owner token');
assert.match(backgroundSource, /activeRunId === runId/, 'loop must stop when it loses ownership');
assert.match(backgroundSource, /SAVE_STATE_DEBOUNCE_MS/, 'status logging must debounce chrome.storage.local writes');
assert.match(backgroundSource, /immediate:\s*true/, 'lifecycle transitions must be able to flush state immediately');
assert.match(backgroundSource, /getRoundSpeakers/, 'discussion loop must alternate transport order by round');
assert.match(backgroundSource, /consecutiveConvergenceSignals/, 'discussion loop must react to repeated convergence signals');
assert.match(backgroundSource, /brainstormState\.currentRound--/, 'escalation should not consume a paid round');
assert.match(backgroundSource, /agent: systemFallback \? 'System' : speaker/, 'forced discussion repair fallback must be stored as System output');
assert.match(backgroundSource, /structural discussion guard/i, 'discussion guard should be structural, not broad phrase filtering');
assert.doesNotMatch(backgroundSource, /"let me know"/, 'discussion guard should not ban common substrings globally');
assert.doesNotMatch(backgroundSource, /"for you"/, 'discussion guard should not ban common substrings globally');
assert.doesNotMatch(backgroundSource, /"i recommend"/, 'discussion guard should allow role-appropriate recommendations');

assert.doesNotMatch(contentSource, /innerHTML\s*=\s*`<p>\$\{text\}<\/p>`/, 'Gemini prompt insertion must not parse prompts as HTML');
assert.doesNotMatch(contentSource, /aria-label\*="bfe"/, 'Gemini send selector must not depend on obfuscated label fragments');
assert.match(contentSource, /minUserTurnCount/, 'waitForIdle must wait for the newly submitted user turn');
assert.match(contentSource, /minResponseTurnCount/, 'waitForIdle must wait for a new model response before sampling text');
assert.match(contentSource, /status:\s*'error'/, 'runPrompt must report missing input/send failures to the background');

assert.match(panelSource, /refreshActiveSessionToken/, 'panel polling must ignore stale refresh responses');
assert.match(panelSource, /refreshToken !== refreshActiveSessionToken/, 'older panel refreshes must not overwrite newer state');
assert.match(panelSource, /function getSelectedMode\(\): SessionMode/, 'panel mode reads must validate the DOM value');
assert.doesNotMatch(panelSource, /function isGeminiUrl[\s\S]*?\|\| !!tab\.pendingUrl/, 'Gemini URL parsing should not rely on ambiguous operator precedence');

assert.match(transcriptSource, /DOMPurify\.sanitize/, 'transcript HTML must be sanitized after markdown rendering');
assert.doesNotMatch(transcriptSource, /marked\.parse\(sanitizeMarkdownInput\(markdown\)\)/, 'transcript markdown must not be escaped before parsing');

console.log('runtime regression source tests passed');
