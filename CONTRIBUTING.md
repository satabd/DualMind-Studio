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
