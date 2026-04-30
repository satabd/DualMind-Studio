# Agentic Runtime Architecture

## Current State

The extension already has the right shell:

- `src/background.ts` owns orchestration state and turn execution.
- `src/types.ts` defines sessions, transcript entries, phases, intents, checkpoints, escalations, and profiles.
- `src/db.ts` persists sessions in IndexedDB.
- `src/panel.ts` and `src/panel.html` expose setup, live state, intervention, outputs, history, and profiles.

The architectural gap is that prompt policy, identity, style, memory, session context, and task are not first-class runtime objects.

## Target Model

Each agent turn should be built from a `PromptBlueprint`:

- `protocol`: non-negotiable rules, audience discipline, evidence policy, escalation contract, output boundaries.
- `identity`: who this agent is in the session.
- `style`: how this agent reasons and communicates.
- `memory`: selected structured carry-forward facts, decisions, rejected options, risks, and open questions.
- `context`: current phase, intent, counterpart, objective, constraints, success criteria, and latest input.
- `task`: the specific move this turn must perform.

The composer renders those layers in a stable order. That gives the system a single place to inspect, test, and later preview the actual prompt.

## Runtime Boundaries

- `src/types.ts`: shared type model.
- `src/promptBlueprint.ts`: pure prompt blueprint construction and rendering.
- `src/background.ts`: orchestration, browser tab execution, state updates, repair, escalation, persistence.
- `src/db.ts`: local persistence.
- `src/panel.*`: controls and visibility.

The first slice keeps browser execution unchanged. It only changes how prompts are assembled before they are sent.

## Guardrail Stack

1. Protocol layer: tells the agent what is forbidden and what output contract is required.
2. Turn task layer: restricts each turn to one move such as critique, verify, narrow, conclude, or escalate.
3. Runtime validator: checks for discussion violations and escalation blocks.
4. Repair prompt: asks the same model to rewrite invalid output.
5. Regeneration prompt: requests a fresh valid reply if repair fails.
6. Forced fallback: inserts a safe response when model output remains invalid.
7. Human escalation: pauses when the agent needs a decision.

## Agent Personality Model

Personality is represented through identity and operating style:

- Identity defines role and responsibility, such as Systems Architect or Skeptical Verifier.
- Style defines reasoning behavior, such as falsification-first, synthesis-heavy, or evidence-seeking.
- Neither layer should create decorative persona text unless it improves work quality.

## Memory Model Direction

Memory will be a structured session object, not a transcript dump. Future slices should store entries like:

- established fact
- decision
- open question
- rejected option
- risk
- assumption

The composer can then include only relevant entries for the current turn.

## Migration Strategy

1. Add types and composer.
2. Migrate Agent Workshop prompts to the composer.
3. Add session memory schema and update checkpoints/resumes to write memory.
4. Add advanced setup controls for identity, style, and memory mode.
5. Add memory preview and pruning controls.
