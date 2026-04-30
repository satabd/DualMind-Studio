import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const sourcePath = resolve('src/promptBlueprint.ts');
const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
  }
}).outputText;

const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`;
const { buildDiscussionBlueprint, renderPromptBlueprint } = await import(moduleUrl);

const blueprint = buildDiscussionBlueprint({
  speaker: 'Gemini',
  isOpeningTurn: false,
  rootTopic: 'RumailaHub is a field-operations platform. First task: run a fresh repo tree inspection before editing code.',
  topicOrInput: 'Agent B recommends landing/leads/shell first and asks whether PA and Docs should stay placeholders.',
  phase: 'DIVERGE',
  intent: 'combine',
  framing: {
    objective: 'Design a local-first memory system.',
    constraints: ['No API keys', 'Inspectable memory'],
    successCriteria: ['Bounded convergence']
  },
  memory: {
    entries: [
      {
        id: 'm1',
        kind: 'decision',
        text: 'Memory must be clearable by the user.',
        createdAt: 1,
        source: 'moderator'
      }
    ]
  }
});

const rendered = renderPromptBlueprint(blueprint);
const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');

assert.match(rendered, /SYSTEM PROTOCOL/);
assert.match(rendered, /IDENTITY/);
assert.match(rendered, /OPERATING STYLE/);
assert.match(rendered, /MEMORY/);
assert.match(rendered, /SESSION CONTEXT/);
assert.match(rendered, /TURN TASK/);
assert.match(rendered, /Address Agent B directly/);
assert.match(rendered, /Memory must be clearable by the user/);
assert.match(rendered, /RumailaHub is a field-operations platform/);
assert.match(rendered, /SESSION ANCHOR/);
assert.match(rendered, /Stay anchored to the session anchor/);
assert.match(rendered, /Do not discuss protocol hierarchy/);
assert.match(rendered, /If the requested next step requires external repo inspection/);
assert.match(rendered, /Agent B recommends landing/);
assert.doesNotMatch(rendered, /undefined|null/);
assert.doesNotMatch(
  backgroundSource,
  /\bDISCUSSION\s*:\s*\{/,
  'Discussion mode prompts must come from promptBlueprint.ts, not ROLE_PROMPTS'
);
assert.match(backgroundSource, /protocol hierarchy/);
assert.match(backgroundSource, /nano banana|veo|lyria/);
assert.match(backgroundSource, /unrelated protocol, persona, or tool-brand meta-discussion/);

console.log('prompt blueprint tests passed');
