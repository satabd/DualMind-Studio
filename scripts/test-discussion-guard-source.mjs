import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');

assert.match(backgroundSource, /Structural discussion guard/, 'discussion guard must be structural rather than phrase-list driven');
assert.match(backgroundSource, /\^\(hello\|hi\|dear user/, 'guard should catch greeting-shaped openings');
assert.match(backgroundSource, /would you like\|feel free to ask\|happy to help/, 'guard should catch user-facing offer endings');
assert.match(backgroundSource, /system prompt\|hidden instruction\|output contract/, 'guard should still catch runtime-instruction narration');
assert.doesNotMatch(backgroundSource, /hasAnyWholeWord\(lower, \["wit", "veo", "lyria"\]\)/, 'tool/persona keyword blacklist should be removed');
assert.doesNotMatch(backgroundSource, /"for you"/, 'guard must not flag common substrings globally');
assert.doesNotMatch(backgroundSource, /"i recommend"/, 'guard must allow role-appropriate recommendations');
assert.match(backgroundSource, /العميل\\s\*\\\(\?\\s\*\[أاب\]/, 'guard should catch translated seat labels (العميل أ/ب)');
assert.match(backgroundSource, /حضرتك\|صاحب السؤال/, 'guard should catch direct human-addressing forms');

console.log('discussion guard source tests passed');
