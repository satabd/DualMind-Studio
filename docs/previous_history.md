# LLM Orchestrator / Ping-Pong Project History

This document contains a compilation of important historical context and previous work done on this extension, extracted from the Antigravity Brain History.

---

## 1. LLM Orchestrator Side Panel Migration (Session: 64a9a61a)

**Goal:**
Replace the popup UX with a native Side Panel experience (Chrome + Edge) to allow persistent orchestration without the popup closing. Fix state persistence bugs to ensure the orchestrator doesn't auto-restart appropriately.

### Changes Implemented
*   **Side Panel UI (`src/panel.html`, `src/panel.ts`)**
    *   **Persistent Interface**: The side panel allows monitoring the conversation without blocking the web page.
    *   **Tab Detection**: Automatically detects open "Gemini" and "ChatGPT" tabs.
    *   **Controls**: Rounds (1-20), Modes (Ping Pong, Gemini Only, ChatGPT Only), Seed Prompt, Start/Stop.
    *   **Logs**: Real-time status updates visible in the panel.
    *   **Export**: Buttons to export the last response or full transcript to Markdown.
*   **Service Worker (`src/background.ts`)**
    *   **Central State**: State (active, rounds, logs) managed centrally in the service worker and persisted to `chrome.storage.local`.
    *   **Bug Fix**: Addressed "auto-restart" active state bug by ensuring `active` is set to `false` (Idle) upon initialization and completion.
    *   **Messaging**: Implemented a robust `START`/`STOP`/`STATUS` protocol.
*   **Content Script (`src/content.ts`)**
    *   **Reactive Executor**: Refactored to be a passive executor that responds to commands (`runPrompt`, `waitForDone`, `scrapeConversation`).
    *   **Clean**: Removed legacy auto-copy timers that caused interference.
*   **Manifest (`manifest.json`)**
    *   Added `side_panel` permission and configuration.
    *   Configured the toolbar action to open the Side Panel.

---

## 2. Refine Brainstorm Logic & Vibe Coding (Session: 0e605ff6)

**Goal:**
Fix a reported bug where Gemini receives the "start phrase" (initial prompt) after a ping-pong exchange due to a logical error in the brainstorm loop reusing the initial prompt in subsequent rounds. Additionally, create a Vibe Coding Master Prompt/Guide.

### Changes Implemented
*   **Refactored `runBrainstormLoop` in `src/background.ts`**
    *   *Old Logic:* Sent Initial Prompt to Gemini -> Gemini Output to ChatGPT -> ChatGPT Output to Gemini.
    *   *New Logic:* 
        *   Initialization: Send initial `prompt` to Gemini and store `currentGeminiResponse`.
        *   Loop (Rounds): Send `currentGeminiResponse` to ChatGPT (as Critic) -> Store `currentChatGPTResponse` -> Send `currentChatGPTResponse` back to Gemini (as Refiner) -> Update `currentGeminiResponse`.
    *   This ensures the conversation evolves naturally in a Debate format and doesn't reset to the start phrase.
*   **Tab Selection Robustness**
    *   Ensured background tabs rely strictly on the `id` captured at start instead of active tab focus, handling cases where `focus()` is soft-blocked.
*   **Vibe Coding Artifact**
    *   Created `docs/vibe_coding_workflow.md` synthesizing user text into a clear guide/master prompt.
