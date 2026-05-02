import type { BrainstormSession, BrainstormState } from '../../types.js';

// Thin wrapper around chrome.runtime.sendMessage with a fallback for preview
// or file:// contexts where chrome.runtime is not available.
function isExtensionRuntime(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id && !!chrome.runtime.sendMessage;
}

export function sendRuntimeMessage<T>(message: unknown, fallback: T): Promise<T> {
    if (!isExtensionRuntime()) return Promise.resolve(fallback);
    return new Promise(resolve => {
        try {
            chrome.runtime.sendMessage(message, (response: T) => {
                if (chrome.runtime.lastError || response === undefined) {
                    resolve(fallback);
                    return;
                }
                resolve(response);
            });
        } catch {
            resolve(fallback);
        }
    });
}

export async function fetchBrainstormState(fallback: BrainstormState): Promise<BrainstormState> {
    return sendRuntimeMessage<BrainstormState>({ action: 'getBrainstormState' }, fallback);
}

export async function fetchSession(id: string): Promise<BrainstormSession | null> {
    return sendRuntimeMessage<BrainstormSession | null>({ action: 'getSession', id }, null);
}

export async function fetchAllSessions(): Promise<BrainstormSession[]> {
    return sendRuntimeMessage<BrainstormSession[]>({ action: 'getAllSessions' }, []);
}

export async function pauseBrainstorm() {
    return sendRuntimeMessage({ action: 'pauseBrainstorm' }, null);
}

export async function resumeBrainstorm(feedback?: string) {
    return sendRuntimeMessage({ action: 'resumeBrainstorm', feedback: feedback || '' }, null);
}

export async function stopBrainstorm() {
    return sendRuntimeMessage({ action: 'stopBrainstorm' }, null);
}
