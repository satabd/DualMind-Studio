import { useEffect, useState } from 'react';
import { Button } from '../ui/button.js';

const STORAGE_KEY = 'dualMindThrottlingNoticeDismissed';

// Chrome throttles hidden tabs at the renderer-process level — JS timers are
// clamped to 1Hz, SSE/WebSocket heartbeats can be dropped, and DOM commits get
// deferred.  This affects ChatGPT and Gemini exactly the same way it affects
// every other web app, and no in-page workaround (Page Visibility override,
// MutationObserver polling, requestAnimationFrame tricks) fully beats it.
//
// The official, browser-supported fix is to add the agent domains to Chrome's
// "Always keep these sites active" exclusion list at chrome://settings/performance,
// which disables throttling for those origins.  We surface that instruction
// here as a one-time, dismissible banner.

export function ThrottlingNotice() {
    // Default to dismissed=true so the banner does NOT flash visible while we
    // read the persisted state.  Switch to false only if storage says so.
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        try {
            chrome.storage?.local?.get([STORAGE_KEY], (result) => {
                setDismissed(!!result?.[STORAGE_KEY]);
            });
        } catch {
            const fromLocal = window.localStorage?.getItem(STORAGE_KEY);
            setDismissed(fromLocal === '1');
        }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try {
            chrome.storage?.local?.set({ [STORAGE_KEY]: true });
        } catch {
            window.localStorage?.setItem(STORAGE_KEY, '1');
        }
    };

    if (dismissed) return null;

    const openPerformanceSettings = async () => {
        try {
            await chrome.tabs.create({ url: 'chrome://settings/performance', active: true });
        } catch {
            window.open('chrome://settings/performance', '_blank');
        }
    };

    return (
        <div
            id="throttlingNotice"
            className="mx-3 mt-2 sm:mx-5 rounded-md border border-warning/40 bg-warning-soft p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
        >
            <div className="flex flex-col gap-1 text-xs leading-snug">
                <strong className="text-fg text-sm">Background tabs may pause mid-response</strong>
                <span className="text-fg-muted">
                    Chrome throttles hidden tabs, which can stall ChatGPT and Gemini streams when the
                    Workshop is in the foreground. To fix this once and for all, open
                    {' '}<code className="font-mono">chrome://settings/performance</code>{' '}
                    and add <code className="font-mono">chatgpt.com</code>,
                    {' '}<code className="font-mono">chat.openai.com</code> and
                    {' '}<code className="font-mono">gemini.google.com</code> to
                    {' '}<em>"Always keep these sites active"</em>.
                </span>
            </div>
            <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="primary" onClick={openPerformanceSettings}>
                    Open settings
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>
                    Got it
                </Button>
            </div>
        </div>
    );
}
