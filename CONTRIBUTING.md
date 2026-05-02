# Contributing

Thanks for contributing to DualMind Studio.

## Before You Start

- Read the README first so the current product model and privacy behavior are clear.
- Keep changes focused. Small, reviewable pull requests are preferred over large mixed refactors.
- If you change product behavior, update `README.md` under `Project Evolution`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Run a type check:

```bash
npx tsc --noEmit
```

3. Build the extension:

```bash
npm run build
```

4. Load the unpacked extension from `dist/` in a Chromium browser.

## Development Notes

- This project automates the browser versions of ChatGPT and Gemini.
- No API keys are required by the repo itself.
- The extension stores prompts, transcripts, escalations, moderator input, and session metadata locally unless cleared.
- DOM selectors for ChatGPT and Gemini are brittle by nature. If a flow breaks, verify the target site changed before redesigning the orchestration logic.

## Code Expectations

- Preserve the distinction between `Collaborative Exchange` and `Agent Workshop` unless you are intentionally changing product behavior.
- Keep discussion-mode changes strict about audience discipline, escalation behavior, and convergence control.
- Prefer shared types in `src/types.ts` over duplicate local interfaces.
- When editing UI behavior, keep English and Arabic strings in sync in `src/i18n.ts`.
- When adding a meaningful feature or behavior change, document it in the README.

## Scope Discipline (read before opening a PR)

PRs that mix surfaces are the most common cause of large reverts. Keep them split:

- A **Workshop PR** touches `src/studio.tsx`, `src/studio/`, `src/studio.css`,
  `src/studio.html`, `tailwind.config.ts`, `postcss.config.cjs`, and
  `scripts/test-studio-workshop-source.mjs` — and nothing else.
- An **orchestrator PR** touches `src/background.ts`, `src/content.ts`,
  `src/db.ts`, `public/manifest.json`, or
  `scripts/test-runtime-regressions-source.mjs` — and nothing else.
- A **prompt PR** touches `src/promptBlueprint.ts` and `src/sessionMemory.ts`.

If a single change genuinely needs to span surfaces, land each surface
in its own commit on the same branch so a partial revert is possible.

### Orchestrator hard rules

- The orchestrator must never call `chrome.windows.create`,
  `chrome.tabs.move`, or `chrome.windows.update({focused: true})`.
  Agent tabs are pre-opened by the user.
- Hidden-tab throttling on ChatGPT and Gemini is a Chrome browser
  feature. The fix is the user-side allowlist at
  `chrome://settings/performance` (surfaced by the Workshop's
  `ThrottlingNotice`). Do not add Page Visibility API overrides or
  MAIN-world keep-alive scripts to "fix" it inside the extension.

These rules are enforced by `scripts/test-runtime-regressions-source.mjs`.

## Workshop UI Notes

- Stack: React 19 + Tailwind v3 (NOT v4) + Radix primitives + shadcn-style
  components copied into `src/studio/ui/` + Zustand. See
  [docs/architecture-studio-workshop.md](./docs/architecture-studio-workshop.md).
- All colors come from CSS variables in `src/studio.css`. Components
  consume Tailwind utilities like `bg-seat-a-soft` — never hex codes.
- Markdown bodies render through `marked` then `DOMPurify`, in that order.
- Use `dir="auto"` on any wrapper that displays user-supplied or
  agent-generated text so RTL paragraphs flip correctly.
- Stable DOM IDs are locked by the test suite. If you need to rename
  one, update both the component and the assertions in
  `scripts/test-studio-workshop-source.mjs`.

## Security And Privacy

- Never commit secrets, tokens, `.env` files, keys, certificates, or personal local data.
- Be careful with transcript rendering and any use of `innerHTML`.
- If you add new local persistence, make sure users can understand what is stored and how to clear it.

## Pull Requests

Good pull requests usually include:

- a short problem statement
- the smallest practical fix or feature scope
- verification notes
- screenshots or screen recordings for meaningful UI changes
- any privacy or migration impact

## Issues

- Use the bug report template for breakages, regressions, and site automation failures.
- Use the feature request template for UX, orchestration, and workflow ideas.
