# DualMind Studio - Side Panel Guide

This extension now uses a **Side Panel** for the main orchestration interface, replacing the old popup.

## How to Open
1. Click the extension icon in the toolbar.
2. Select **"Open Side Panel"** (if not opened automatically).
3. Alternatively, right-click the extension icon and choose "Open Side Panel".

## Features

### 1. Tab Detection
The panel automatically detects your open **Gemini** and **ChatGPT** tabs.
- Ensure you have both sites open.
- Use the dropdowns to select the specific tabs if you have multiple open.

### 2. Modes
- **Ping Pong**: Gemini and ChatGPT debate each other.
- **Gemini Only**: Only Gemini responds to prompts (for testing).
- **ChatGPT Only**: Only ChatGPT responds.

### 3. Controls
- **Rounds**: Set the number of turns (e.g., 3).
- **Topic**: Enter the initial prompt.
- **Start**: Begins the orchestration loop.
- **Stop**: Halts the loop immediately. Use this to cancel a run.

### 4. Persistence
The state of the orchestrator is saved. You can close the side panel and reopen it to see the current status or logs.
**Note**: If you close the browser, the runner resets to "Idle".

### 5. Export
- **Last Response**: Saves the most recent assistant reply as Markdown.
- **Full Transcript**: Scrapes the full visible conversation from the selected chat tab.

## Troubleshooting
- **"No tabs found"**: Refresh the extension or the web pages.
- **"Idle" after restart**: This is intended behavior. Start a new run.
