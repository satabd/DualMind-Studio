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
const { buildDiscussionBlueprint, buildPingPongBlueprint, renderPromptBlueprint } = await import(moduleUrl);

const blueprint = buildDiscussionBlueprint({
  speaker: 'Gemini',
  seat: 'Agent B',
  isOpeningTurn: false,
  role: 'CRITIC',
  rootTopic: 'RumailaHub is a field-operations platform. First task: run a fresh repo tree inspection before editing code.',
  topicOrInput: 'Agent A recommends landing/leads/shell first and asks whether PA and Docs should stay placeholders.',
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
const chatGptOpening = renderPromptBlueprint(buildDiscussionBlueprint({
  speaker: 'ChatGPT',
  seat: 'Agent A',
  isOpeningTurn: true,
  role: 'ARCHITECT',
  rootTopic: 'Design the agentic loop.',
  topicOrInput: 'Design the agentic loop.',
  phase: 'DIVERGE',
  intent: 'combine'
}));
const backgroundSource = readFileSync(resolve('src/background.ts'), 'utf8');

assert.match(rendered, /SYSTEM PROTOCOL/);
assert.match(rendered, /IDENTITY/);
assert.match(rendered, /OPERATING STYLE/);
assert.match(rendered, /MEMORY/);
assert.match(rendered, /SESSION CONTEXT/);
assert.match(rendered, /TURN TASK/);
assert.match(rendered, /Address Agent A directly/);
assert.match(rendered, /Do not translate these labels/, 'protocol must forbid translating the seat labels');
assert.match(rendered, /Banned forms in any language/, 'protocol must list banned human-addressing forms');
assert.match(rendered, /Keep the labels "Agent A" and "Agent B" literal/, 'output contract must reinforce literal labels');
assert.match(rendered, /Memory must be clearable by the user/);
assert.match(rendered, /RumailaHub is a field-operations platform/);
assert.match(rendered, /SESSION ANCHOR/);
assert.match(rendered, /Stay anchored to the session anchor/);
assert.match(rendered, /If the requested next step requires external repo inspection/);
assert.match(rendered, /Agent A recommends landing/);
assert.match(rendered, /ROLE DIRECTIVE/);
assert.match(rendered, /Stress-test claims and reject weak assumptions/);
assert.match(rendered, /Ground memory entries as constraints/);
assert.match(rendered, /Transport: Gemini/);
assert.match(rendered, /Reasoning seat: Agent B/);
assert.match(rendered, /You are Agent B: Skeptical Verifier/);
assert.match(chatGptOpening, /Transport: ChatGPT/);
assert.match(chatGptOpening, /Reasoning seat: Agent A/);
assert.match(chatGptOpening, /You are Agent A: Synthesis Architect/);
assert.match(chatGptOpening, /Shape the conversation into product, system, and implementation tradeoffs/);
assert.doesNotMatch(rendered, /undefined|null/);
assert.doesNotMatch(
  backgroundSource,
  /\bDISCUSSION\s*:\s*\{/,
  'Discussion mode prompts must come from promptBlueprint.ts, not ROLE_PROMPTS'
);
assert.match(backgroundSource, /Legacy PING_PONG prompt path/);
assert.match(backgroundSource, /structural discussion guard/i);
assert.doesNotMatch(backgroundSource, /"i recommend"/, 'role prompts must be allowed to recommend, reject, or stress-test');
assert.match(backgroundSource, /agent: systemFallback \? 'System' : speaker/, 'forced repair fallback must persist as a System note');
assert.doesNotMatch(backgroundSource, /return \{ text: buildForcedDiscussionReply\(counterpart\), status: "forced" \}/);

// PING_PONG migration (issue #8) — both modes now flow through promptBlueprint.
assert.match(backgroundSource, /buildPingPongBlueprint/, 'PING_PONG must render via buildPingPongBlueprint');
assert.match(backgroundSource, /import \{[\s\S]*?buildPingPongBlueprint[\s\S]*?\} from '.\/promptBlueprint\.js'/, 'background.ts must import buildPingPongBlueprint from promptBlueprint');

const pingPongRendered = renderPromptBlueprint(buildPingPongBlueprint({
  speaker: 'Gemini',
  seat: 'Agent A',
  isOpeningTurn: true,
  role: 'EXPANDER',
  rootTopic: 'Design a friendlier onboarding for older users.',
  roleNarrative: 'Topic: "Design a friendlier onboarding for older users."\n\nProvide an initial creative concept for this topic. Keep it open-ended.',
  phase: 'DIVERGE',
  intent: 'expand',
  memory: {
    entries: [
      { id: 'm2', kind: 'fact', text: 'Memory must survive PING_PONG mode too.', createdAt: 1, source: 'checkpoint' }
    ]
  }
}));
assert.match(pingPongRendered, /SYSTEM PROTOCOL/);
assert.match(pingPongRendered, /Collaborative Exchange Protocol/, 'PING_PONG must use the Collaborative Exchange protocol label');
assert.match(pingPongRendered, /You are Agent A: Synthesis Architect/);
assert.match(pingPongRendered, /Memory must survive PING_PONG mode too\./, 'PING_PONG must include session memory in the rendered prompt');
assert.match(pingPongRendered, /Provide an initial creative concept/, 'PING_PONG must carry the role narrative as the latest input');
assert.match(pingPongRendered, /Build on the previous contribution/, 'PING_PONG output contract must be iterative, not agent-to-agent');
assert.doesNotMatch(pingPongRendered, /Output only the agent-to-agent reply/, 'PING_PONG must NOT use the discussion-mode output contract');

console.log('prompt blueprint tests passed');
