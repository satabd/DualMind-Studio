import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panelSource = readFileSync(new URL('../src/panel.ts', import.meta.url), 'utf8');
const i18nSource = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf8');

assert.doesNotMatch(i18nSource, /chrome\.storage\.local/, 'i18n must not crash in file:// preview when chrome.storage is unavailable');
assert.doesNotMatch(panelSource, /chrome\.runtime\.sendMessage/, 'panel runtime messages should go through preview-safe adapter');
assert.doesNotMatch(panelSource, /chrome\.storage\.local/, 'panel storage should go through preview-safe adapter');
assert.doesNotMatch(panelSource, /chrome\.tabs\.query/, 'panel tab discovery should go through preview-safe adapter');
assert.doesNotMatch(panelSource, /chrome\.scripting\.executeScript/, 'panel script injection should go through preview-safe adapter');

assert.match(panelSource, /formatPhase/, 'dynamic phase labels must be localized');
assert.match(panelSource, /formatIntent/, 'dynamic intent labels must be localized');
assert.match(panelSource, /formatRepairStatus/, 'dynamic repair labels must be localized');
assert.match(panelSource, /refreshTabs\(\);/, 'language toggles must re-render dynamic tab empty states');
assert.match(i18nSource, /phaseDiverge/, 'phase translations must exist');
assert.match(i18nSource, /memoryKindRejectedOption/, 'memory kind translations must exist');

console.log('panel preview safety tests passed');
