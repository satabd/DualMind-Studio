import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');
const promptBlueprintSource = readFileSync(resolve('src/promptBlueprint.ts'), 'utf8');

assert.match(backgroundSource, /function buildSeedAnchoredInput/);
assert.match(backgroundSource, /\[SESSION SEED PROMPT \/ TOPIC\]/);
assert.match(backgroundSource, /\[LATEST COLLABORATOR INPUT\]/);
assert.match(backgroundSource, /Use the seed prompt as the shared context/);
assert.match(backgroundSource, /buildSeedAnchoredInput\(sessionSeed,\s*basePrompt,\s*isOpeningTurn\)/);
assert.match(backgroundSource, /agent\.loopPrompt\(roleConfig,\s*anchoredBasePrompt\)/);
assert.match(promptBlueprintSource, /\[SESSION ANCHOR\]/);
assert.match(promptBlueprintSource, /rootTopic/);

console.log('seed anchor tests passed');
