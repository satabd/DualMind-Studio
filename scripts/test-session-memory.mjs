import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const sourcePath = resolve('src/sessionMemory.ts');
const source = readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove
  }
}).outputText;

const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(transpiled)}`;
const {
  createEmptySessionMemory,
  isPlaceholderMemoryText,
  memoryEntriesFromCheckpoint,
  memoryEntryFromModeratorDecision,
  mergeSessionMemory,
  selectPromptMemory
} = await import(moduleUrl);

const checkpoint = {
  id: 'cp1',
  turn: 4,
  phase: 'CONVERGE',
  label: 'Narrow Checkpoint 4',
  createdAt: 1000,
  transcriptCount: 5,
  promptSnapshot: 'Latest working prompt',
  summary: 'Objective: pick local-first memory with clear controls.',
  artifactSnapshot: {
    highlights: ['Local-first memory is the core direction.'],
    ideas: ['Store memory alongside sessions.'],
    risks: ['Raw transcript replay causes prompt bloat.'],
    questions: ['How should branch memory inheritance work?'],
    decisions: ['Memory must be inspectable and clearable.'],
    synthesis: 'Use structured session memory instead of transcript dumps.'
  }
};

const checkpointEntries = memoryEntriesFromCheckpoint(checkpoint);
assert.equal(checkpointEntries.length, 5);
assert.equal(checkpointEntries[0].kind, 'fact');
assert.equal(checkpointEntries[0].source, 'checkpoint');
assert.match(checkpointEntries.map(entry => entry.text).join('\n'), /Memory must be inspectable/);
assert.match(checkpointEntries.map(entry => entry.text).join('\n'), /prompt bloat/);

const moderatorEntry = memoryEntryFromModeratorDecision({
  timestamp: 2000,
  feedback: 'Prefer the conservative migration path.',
  linkedCheckpointId: 'cp1',
  linkedTurn: 4
});
assert.equal(moderatorEntry.kind, 'decision');
assert.equal(moderatorEntry.source, 'moderator');
assert.match(moderatorEntry.text, /conservative migration/);

const merged = mergeSessionMemory(createEmptySessionMemory(), [
  ...checkpointEntries,
  moderatorEntry,
  { ...moderatorEntry, id: 'duplicate' }
]);
assert.equal(merged.entries.length, 6);

const prunedMemory = mergeSessionMemory({
  entries: merged.entries.filter(entry => entry.id !== checkpointEntries[0].id),
  prunedEntryKeys: [`${checkpointEntries[0].kind}:${checkpointEntries[0].text.toLowerCase()}`]
}, [checkpointEntries[0]]);
assert.equal(
  prunedMemory.entries.some(entry => entry.id === checkpointEntries[0].id),
  false,
  'pruned memory entries must not be re-added by later checkpoints with the same text'
);

const selected = selectPromptMemory(merged, 3);
assert.equal(selected.entries.length, 3);
assert.equal(selected.entries[0].kind, 'decision');
assert.match(selected.entries.map(entry => entry.kind).join(','), /fact|risk|question/);

// Placeholder rejection — memory must not accept structural noise or label-only fragments.
assert.equal(isPlaceholderMemoryText(''), true, 'empty text is a placeholder');
assert.equal(isPlaceholderMemoryText('* risk_level'), true, 'banned placeholder must be rejected');
assert.equal(isPlaceholderMemoryText('## Gemini said'), true, 'markdown heading must be rejected');
assert.equal(isPlaceholderMemoryText('Unresolved Items:'), true, 'label-only line must be rejected');
assert.equal(isPlaceholderMemoryText('Risk:'), true, 'bare label must be rejected');
assert.equal(isPlaceholderMemoryText('- '), true, 'lone bullet must be rejected');
assert.equal(isPlaceholderMemoryText('short'), true, 'too-short text must be rejected');
assert.equal(
  isPlaceholderMemoryText('Memory must be inspectable and clearable.'),
  false,
  'real conclusion must pass'
);

const placeholderCheckpoint = {
  ...checkpoint,
  id: 'cp_placeholder',
  artifactSnapshot: {
    highlights: ['## Gemini said'],
    ideas: ['- '],
    risks: ['* risk_level'],
    questions: ['Unresolved Items:'],
    decisions: ['Risk:'],
    synthesis: ''
  },
  summary: ''
};
const placeholderEntries = memoryEntriesFromCheckpoint(placeholderCheckpoint);
assert.equal(
  placeholderEntries.length,
  0,
  'a checkpoint whose artifacts are all placeholders must produce zero memory entries'
);

console.log('session memory tests passed');
