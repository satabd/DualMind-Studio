import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');

assert.match(backgroundSource, /function hasAnyWholeWord/, 'discussion guard must support whole-word matching');
assert.match(backgroundSource, /hasAnyWholeWord\(lower, \["wit", "veo", "lyria"\]\)/, 'tool/persona keywords must be boundary-aware');
assert.doesNotMatch(backgroundSource, /lower\.includes\("wit"\)/, 'guard must not flag normal words like "with" as wit');
assert.doesNotMatch(backgroundSource, /lower\.includes\("veo"\)/, 'tool brand checks should not use broad substring matching');
assert.doesNotMatch(backgroundSource, /lower\.includes\("lyria"\)/, 'tool brand checks should not use broad substring matching');

console.log('discussion guard source tests passed');
