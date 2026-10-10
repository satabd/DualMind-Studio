// AI Executor Content Script
// Handles DOM interactions for Gemini and ChatGPT
import TurndownService from 'turndown';

// --- Platform Detection ---
const isGemini = (): boolean => window.location.hostname.includes('gemini.google.com');
const isChatGPT = (): boolean => window.location.hostname.includes('chatgpt.com') || window.location.hostname.includes('openai.com');

// --- ChatGPT selectors ---
// EN: ChatGPT changed its page in 2026. The first selector in each list was checked on the
//     live site on 2026-10-09. The older selectors stay as fallbacks for older layouts.
// AR: غيّر ChatGPT بنية الصفحة في 2026. المحدِّد الأول في كل قائمة تم التحقق منه على الموقع
//     الحي بتاريخ 2026-10-09، والمحدِّدات القديمة تبقى كبدائل.
const CHATGPT_USER = '[data-user-message-bubble], [data-message-author-role="user"]';
const CHATGPT_ASSISTANT = '[data-markdown-text-style="assistant-message"], [data-message-author-role="assistant"]';
const CHATGPT_INPUT = 'form[data-chatgpt-composer] div[contenteditable="true"][role="textbox"], #prompt-textarea, div.ProseMirror[contenteditable="true"]';

// --- Main Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'runPrompt':
            handleRunPrompt(request.text)
                .then(success => sendResponse(success
                    ? { status: 'done' }
                    : { status: 'error', error: 'Unable to find input or send control.' }))
                .catch(error => sendResponse({ status: 'error', error: error?.message || 'Prompt send failed.' }));
            return true;

        case 'waitForDone':
            waitForIdle({
                minUserTurnCount: request.minUserTurnCount,
                minResponseTurnCount: request.minResponseTurnCount
            }).then(() => sendResponse({ status: 'complete' }));
            return true;

        case 'getLastResponse':
            const text = getLastResponseText();
            sendResponse({ text });
            break;

        case 'getUserTurnCount':
            sendResponse({ count: getUserMessageCount() });
            break;

        case 'getTurnCounts':
            sendResponse({ user: getUserMessageCount(), response: getResponseMessageCount() });
            break;

        case 'scrapeConversation':
            sendResponse({ text: mainScrape() });
            break;
    }
    return false;
});

// --- Action Implementations ---

async function handleRunPrompt(text: string): Promise<boolean> {
    const inputArea = findInputArea();
    if (!inputArea) return false;

    // inputArea.focus(); 

    // Set text
    setTextInEditable(inputArea, text);

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

    return true;
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
    if (isChatGPT()) return document.querySelectorAll(CHATGPT_USER).length;
    return 0;
}

function getResponseMessageCount(): number {
    if (isGemini()) return document.querySelectorAll('model-response, .model-response').length;
    if (isChatGPT()) return document.querySelectorAll(CHATGPT_ASSISTANT).length;
    return 0;
}

function findInputArea(): HTMLElement | null {
    if (isGemini()) {
        return document.querySelector('div[contenteditable="true"][role="textbox"], .ql-editor, textarea') as HTMLElement;
    }
    if (isChatGPT()) {
        return document.querySelector(CHATGPT_INPUT) as HTMLElement;
    }
    return null;
}

function findSendButton(): HTMLElement | null {
    if (isGemini()) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>('button[aria-label], button.send-button, .send-button'));
        return candidates.find(isSendControl) || null;
    }
    if (isChatGPT()) {
        // EN: The composer has one submit button. Its label is "Send", and "Stop" while an
        //     answer is streaming. isSendControl() refuses the Stop state, so a prompt can
        //     never cancel a running answer by mistake.
        // AR: زر الإرسال نفسه يتحول إلى "Stop" أثناء توليد الإجابة، و isSendControl ترفض هذه الحالة.
        const candidates = [
            document.querySelector<HTMLElement>('form[data-chatgpt-composer] button[type="submit"]'),
            document.querySelector<HTMLElement>('button[data-testid="send-button"]'),
            ...Array.from(document.querySelectorAll<HTMLElement>('button[aria-label^="Send"]'))
        ];
        return candidates.find(el => !!el && isSendControl(el)) || null;
    }
    return null;
}

function isSendControl(el: HTMLElement): boolean {
    if (el instanceof HTMLButtonElement && el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    if (label.includes('stop') || label.includes('voice') || label.includes('mic') || label.includes('audio')) return false;
    if (label === 'send message' || label === 'send' || label.includes('send message')) return true;
    const iconText = (el.querySelector('mat-icon, [data-icon-name], svg')?.textContent || '').toLowerCase();
    const iconName = (el.querySelector('[data-icon-name]')?.getAttribute('data-icon-name') || '').toLowerCase();
    return iconText.includes('send') || iconName.includes('send');
}

function isStopButtonVisible(): boolean {
    if (isGemini()) {
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    if (isChatGPT()) {
        // EN: Each turn carries its own state: "in_progress" while the answer streams.
        const states = document.querySelectorAll('[data-talvt-turn-state]');
        if (states.length && states[states.length - 1].getAttribute('data-talvt-turn-state') === 'in_progress') return true;
        return !!document.querySelector('button[aria-label*="Stop"]');
    }
    return false;
}

async function waitForIdle(options: { minUserTurnCount?: number; minResponseTurnCount?: number } = {}): Promise<void> {
    return new Promise(resolve => {
        // EN: One hard stop for the whole wait (3 minutes). Before, the wait had no limit while
        //     the Stop button stayed visible, so a stuck page could block the run forever.
        // AR: حد أقصى واحد لكامل الانتظار (3 دقائق) حتى لا يتوقف التشغيل إذا علقت الصفحة.
        let stopObserver: MutationObserver | null = null;
        let started = false;
        const hardStop = setTimeout(() => {
            stopObserver?.disconnect();
            resolve();
        }, 180000);

        // 1. Give the UI time to register the click, make the network request, and show the Stop button
        setTimeout(() => {
            if (isStopButtonVisible()) {
                // Wait for stop button to disappear
                stopObserver = new MutationObserver(() => {
                    if (!started && !isStopButtonVisible()) {
                        started = true;
                        stopObserver?.disconnect();
                        checkTextStabilization();
                    }
                });
                stopObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
            } else {
                started = true;
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
                const hasNewUserTurn = options.minUserTurnCount === undefined ||
                    getUserMessageCount() >= options.minUserTurnCount;
                const hasNewResponseTurn = options.minResponseTurnCount === undefined ||
                    getResponseMessageCount() >= options.minResponseTurnCount;

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
                const hasNewTurn = hasNewUserTurn && hasNewResponseTurn;
                const canResolve = hasNewTurn && (currentText.length > 0 ? isStable : (isStable && totalChecks > 20));

                if (canResolve) {
                    clearInterval(checkInterval);
                    clearTimeout(hardStop);
                    resolve();
                }
            }, 500);

            // Stop sampling when the hard stop of the whole wait fires (3 minutes in total).
            setTimeout(() => clearInterval(checkInterval), 180000);
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
        const nodes = document.querySelectorAll(CHATGPT_ASSISTANT);
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
        // EN: Known limit: ChatGPT keeps only the last few turns in the page and loads older
        //     ones on scroll. This export contains the turns that are in the page right now.
        // AR: قيد معروف: ChatGPT يبقي آخر الأدوار فقط في الصفحة، فيحتوي التصدير على الأدوار الظاهرة حالياً.
        const turns = document.querySelectorAll(`${CHATGPT_USER}, ${CHATGPT_ASSISTANT}`);
        turns.forEach(t => {
            const role = t.matches(CHATGPT_USER) ? 'User' : 'Assistant';
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
    // EN: Gemini adds hidden screen-reader labels ("You said", "Gemini said") inside each turn.
    //     They are not part of the message, so they must not reach the other agent.
    // AR: Gemini يضيف تسميات مخفية لقارئ الشاشة داخل كل دور، وهي ليست جزءاً من الرسالة.
    clone.querySelectorAll('.cdk-visually-hidden').forEach(n => n.remove());

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced'
    });
    // EN: ChatGPT now draws code blocks as an editor (one element per line), not as <pre>.
    //     Known limit: for very long blocks only the lines drawn in the page are available here.
    // AR: ChatGPT يعرض الشيفرة الآن كمحرر (عنصر لكل سطر) وليس <pre>، وفي الكتل الطويلة جداً تتوفر الأسطر المرسومة فقط.
    turndownService.addRule('chatgptCodeBlock', {
        filter: node => node instanceof HTMLElement && node.matches('[data-markdown-copy="code-block"]'),
        replacement: (_content, node) => {
            const el = node as HTMLElement;
            const header = el.querySelector('[data-markdown-copy="exclude"]');
            const lang = (header?.textContent || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
            const lines = Array.from(el.querySelectorAll('.cm-line')).map(line => line.textContent || '');
            const code = lines.length ? lines.join('\n') : (el.querySelector('code')?.textContent || '');
            return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        }
    });
    
    let text = turndownService.turndown(clone);
    // Basic cleanup just in case
    text = text.replace(/Show drafts/g, '').replace(/Regenerate/g, '');
    return text.trim();
}
