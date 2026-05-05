import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');
const i18n = readFileSync(resolve('src/i18n.ts'), 'utf8');

// v0.2.2 #18 item 1: Branch picker moved to the Workshop, so its data-i18n
// no longer exists in panel.html.  Keep coverage for keys still present.
const requiredHtmlKeys = [
  'studioSubtitle',
  'studioSetup',
  'studioSetupEyebrow',
  'sessionType',
  'pingPongDescription',
  'discussionDescription',
  'agentSetupHelp',
  'creativeDirectionPresets',
  'creativeDirectionPresetsHelp',
  'savedProfilesHelp',
  'liveSession',
  'interventionDock',
  'finalesHelp',
  'outputsHelp'
];

for (const key of requiredHtmlKeys) {
  assert.match(panelHtml, new RegExp(`data-i18n="${key}"`), `missing data-i18n for ${key}`);
  assert.match(i18n, new RegExp(`"${key}"`), `missing translation key ${key}`);
}

const presetRoles = [
  'EXPANDER',
  'CRITIC',
  'FIRST_PRINCIPLES',
  'ARCHITECT',
  'ELI5',
  'HISTORIAN_FUTURIST',
  'DEV_ADVOCATE'
];

for (const role of presetRoles) {
  assert.match(panelHtml, new RegExp(`data-role="${role}"[\\s\\S]*data-i18n=`), `preset ${role} needs translated label`);
}

const descriptiveKeys = [
  'presetExpanderHelp',
  'presetCriticHelp',
  'presetFirstPrinciplesHelp',
  'presetArchitectHelp',
  'presetEli5Help',
  'presetTimeJumpHelp',
  'presetDevilAdvocateHelp',
  'roleHelpCritic',
  'roleHelpExpander',
  'roleHelpArchitect',
  'roleHelpDevilAdvocate',
  'roleHelpFirstPrinciples',
  'roleHelpInterviewer',
  'roleHelpFiveWhys',
  'roleHelpTimeJump',
  'roleHelpEli5',
  'roleHelpCustom'
];

for (const key of descriptiveKeys) {
  assert.match(i18n, new RegExp(`"${key}"`), `missing descriptive translation ${key}`);
}

assert.match(panelTs, /function renderRoleHelp/);
assert.match(panelTs, /roleHelpText/);
assert.match(panelTs, /renderRoleHelp\(\)/);
assert.match(i18n, /ar:\s*\{/);
assert.match(i18n, /"اختر/);
assert.match(i18n, /"الملفات الشخصية المحفوظة"/);

console.log('i18n coverage tests passed');
