// AI Executor Content Script
// Handles DOM interactions for Gemini and ChatGPT
import TurndownService from 'turndown';

// --- Platform Detection ---
const isGemini = (): boolean => window.location.hostname.includes('gemini.google.com');
const isChatGPT = (): boolean => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('openai.com');

// --- Main Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'runPrompt':
            handleRunPrompt(request.text).then(() => sendResponse({ status: 'done' }));
            return true;

        case 'waitForDone':
            waitForIdle().then(() => sendResponse({ status: 'complete' }));
            return true;

        case 'getLastResponse':
            const text = getLastResponseText();
            sendResponse({ text });
            break;

        case 'getUserTurnCount':
            sendResponse({ count: getUserMessageCount() });
            break;

        case 'scrapeConversation':
            sendResponse({ text: mainScrape() });
            break;
    }
    return false;
});

// --- Action Implementations ---

async function handleRunPrompt(text: string) {
    const inputArea = findInputArea();
    if (!inputArea) return;

    // inputArea.focus(); 

    // Set text
    if (isGemini()) {
        const richTextEditor = document.querySelector('.ql-editor');
        if (richTextEditor) {
            (richTextEditor as HTMLElement).innerHTML = `<p>${text}</p>`;
            richTextEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        } else {
            setTextInEditable(inputArea, text);
        }
    } else {
        setTextInEditable(inputArea, text);
    }

    await new Promise(r => setTimeout(r, 500));

    // Click Send
    const sendBtn = findSendButton();
    if (sendBtn) {
        sendBtn.click();
    } else {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13,
            bubbles: true, composed: true
        });
        inputArea.dispatchEvent(event);
    }
}

function setTextInEditable(el: HTMLElement, text: string) {
    if (el.tagName === 'TEXTAREA') {
        (el as HTMLTextAreaElement).value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        el.focus();
        document.execCommand('selectAll', false, undefined);
        document.execCommand('insertText', false, text);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
}

// --- Status & Waiting ---

function getUserMessageCount(): number {
    if (isGemini()) return document.querySelectorAll('user-query, [data-test-id="user-query"]').length;
    if (isChatGPT()) return document.querySelectorAll('[data-message-author-role="user"]').length;
    return 0;
}

function findInputArea(): HTMLElement | null {
    if (isGemini()) {
        return document.querySelector('div[contenteditable="true"][role="textbox"], .ql-editor, textarea') as HTMLElement;
    }
    if (isChatGPT()) {
        return document.querySelector('#prompt-textarea') as HTMLElement;
    }
    return null;
}

function findSendButton(): HTMLElement | null {
    if (isGemini()) {
        return document.querySelector('.send-button, button[aria-label*="Send"], button[aria-label*="bfe"]') as HTMLElement;
    }
    if (isChatGPT()) {
        return document.querySelector('button[data-testid="send-button"]') as HTMLElement;
    }
    return null;
}

function isStopButtonVisible(): boolean {
    if (isGemini()) {
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    if (isChatGPT()) {
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    return false;
}

async function waitForIdle(): Promise<void> {
    return new Promise(resolve => {
        // 1. Give the UI time to register the click, make the network request, and show the Stop button
        setTimeout(() => {
            if (isStopButtonVisible()) {
                // Wait for stop button to disappear
                const observer = new MutationObserver(() => {
                    if (!isStopButtonVisible()) {
                        observer.disconnect();
                        checkTextStabilization();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true, attributes: true });
            } else {
                checkTextStabilization();
            }
        }, 2000);

        function checkTextStabilization() {
            let lastText = getLastResponseText();
            let stableCount = 0;
            let totalChecks = 0;

            const checkInterval = setInterval(() => {
                totalChecks++;
                const currentText = getLastResponseText();

                // Auto-scroll to bottom to let the chats stream and be generated properly
                window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                document.querySelectorAll('main, .overflow-y-auto').forEach(el => {
                    el.scrollTop = el.scrollHeight;
                });

                // If text hasn't changed
                if (currentText === lastText) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastText = currentText;
                }

                // Consider stable if no changes for 2.5 seconds (5 ticks)
                // If it's completely empty, wait up to 10 seconds (20 ticks) before giving up
                const isStable = stableCount >= 5;
                const canResolve = currentText.length > 0 ? isStable : (isStable && totalChecks > 20);

                if (canResolve) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Absolute maximum timeout (3 minutes)
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 180000);
        }
    });
}

// --- Data Extraction ---

function getLastResponseText(): string {
    let node: Element | null = null;

    if (isGemini()) {
        const nodes = document.querySelectorAll('model-response, .model-response');
        if (nodes.length) node = nodes[nodes.length - 1];
    } else {
        const nodes = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (nodes.length) node = nodes[nodes.length - 1];
    }

    return node ? htmlToMarkdown(node as HTMLElement) : "";
}

function mainScrape(): string {
    let out = `# Conversation Export\n\n`;

    if (isGemini()) {
        const turns = document.querySelectorAll('user-query, model-response');
        turns.forEach(t => {
            const role = t.tagName.toLowerCase().includes('user') ? 'User' : 'DeepMind';
            out += `## ${role}\n\n${htmlToMarkdown(t as HTMLElement)}\n\n`;
        });
    } else {
        const turns = document.querySelectorAll('[data-message-author-role]');
        turns.forEach(t => {
            const role = t.getAttribute('data-message-author-role') === 'user' ? 'User' : 'Assistant';
            out += `## ${role}\n\n${htmlToMarkdown(t as HTMLElement)}\n\n`;
        });
    }
    return out;
}

function htmlToMarkdown(root: HTMLElement): string {
    const clone = root.cloneNode(true) as HTMLElement;
    
    // Remove common action buttons
    const buttons = clone.querySelectorAll('button, .action-buttons, .copy-button');
    buttons.forEach(b => b.remove());
    
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });
    
    let text = turndownService.turndown(clone);
    // Basic cleanup just in case
    text = text.replace(/Show drafts/g, '').replace(/Regenerate/g, '');
    return text.trim();
}
