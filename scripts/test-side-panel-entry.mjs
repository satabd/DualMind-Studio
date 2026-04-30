import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync(resolve('public/manifest.json'), 'utf8'));
const backgroundTs = readFileSync(resolve('src/background.ts'), 'utf8');

assert.equal(manifest.side_panel.default_path, 'panel.html');
assert.equal(manifest.background.service_worker, 'background.js');
assert.equal(manifest.background.type, 'module');
assert.ok(manifest.permissions.includes('sidePanel'));
assert.match(backgroundTs, /setPanelBehavior\(\{\s*openPanelOnActionClick:\s*true\s*\}\)/);
assert.match(backgroundTs, /chrome\.action\.onClicked\.addListener/);
assert.match(backgroundTs, /chrome\.sidePanel\.open\(\{\s*windowId:\s*tab\.windowId\s*\}\)/);
assert.match(backgroundTs, /chrome\.runtime\.onInstalled\.addListener\(configureSidePanelBehavior\)/);

console.log('side panel entry tests passed');
