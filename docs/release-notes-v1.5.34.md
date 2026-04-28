# Release Notes: v1.5.34

## Summary

This release sharpens the product in three areas:

- clearer setup UX with first-agent / second-agent ordering and a flip control
- stronger public-repo hygiene and local-data controls
- safer transcript and panel rendering for saved session content

## Highlights

### No API Keys Required

LLM Orchestrator does not require OpenAI API keys or Gemini API keys.

- It works by automating the browser versions of ChatGPT and Gemini.
- You sign into those services in your own browser tabs.
- The extension coordinates those tabs locally from the side panel.

### Setup UX Improvements

- Added `First Agent` / `Second Agent` setup flow
- Added a centered `Flip` button to swap which model opens the run
- Updated the run loop so the selected opening speaker is respected
- Refreshed the panel palette to a cleaner neutral/blue style

### Agent Workshop Improvements

- Discussion sessions keep stronger agent-to-agent discipline
- Escalations remain structured and pause the loop for moderator input
- Turn flow and role behavior remain compatible with the current two-agent architecture

### Security And Privacy Hardening

- Transcript rendering now escapes raw HTML before Markdown rendering
- Panel rendering now escapes stored framing, timeline, and checkpoint content
- Added `Clear Local Data` in History to wipe:
  - saved sessions
  - profiles
  - cached transcript exports
  - stored orchestrator state
- Added a root `.gitignore` to block future accidental commits of:
  - `.env` files
  - key and certificate files
  - build output
  - release zip artifacts

## Repo Hygiene Review

- Recursive secret-pattern scan found no obvious keys, tokens, passwords, or private key material in repo text files
- Checked-in release zip contents were scanned and showed no secret-pattern hits
- Old release zip artifacts were removed from the repo root

## Notes

- Local prompts, transcripts, escalations, moderator input, and session metadata are stored in the browser unless cleared
- This extension depends on the DOM structure of ChatGPT and Gemini and may need maintenance if those sites change
