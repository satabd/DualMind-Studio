type StorageShape = Record<string, unknown>;
type StorageKeys = string | string[] | StorageShape | null;

const PREVIEW_STORAGE_KEY = "__dualmind_studio_preview_storage__";

function hasChromeStorage() {
    return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export function isExtensionRuntime() {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id;
}

function readPreviewStorage(): StorageShape {
    try {
        const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
        return raw ? JSON.parse(raw) as StorageShape : {};
    } catch {
        return {};
    }
}

function writePreviewStorage(next: StorageShape) {
    try {
        window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Preview storage is best-effort only.
    }
}

function pickPreviewValues(keys: StorageKeys, store: StorageShape): StorageShape {
    if (keys === null) return { ...store };
    if (typeof keys === "string") return { [keys]: store[keys] };
    if (Array.isArray(keys)) {
        return keys.reduce<StorageShape>((picked, key) => {
            picked[key] = store[key];
            return picked;
        }, {});
    }
    return Object.entries(keys).reduce<StorageShape>((picked, [key, fallback]) => {
        picked[key] = store[key] ?? fallback;
        return picked;
    }, {});
}

export function storageGet<T extends StorageShape = StorageShape>(keys: StorageKeys): Promise<T> {
    if (!hasChromeStorage()) {
        return Promise.resolve(pickPreviewValues(keys, readPreviewStorage()) as T);
    }

    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(keys as string | string[] | StorageShape | null, (result) => {
                resolve(result as T);
            });
        } catch {
            resolve(pickPreviewValues(keys, readPreviewStorage()) as T);
        }
    });
}

export function storageSet(values: StorageShape): Promise<void> {
    if (!hasChromeStorage()) {
        writePreviewStorage({ ...readPreviewStorage(), ...values });
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            chrome.storage.local.set(values, resolve);
        } catch {
            writePreviewStorage({ ...readPreviewStorage(), ...values });
            resolve();
        }
    });
}

export function storageRemove(keys: string | string[]): Promise<void> {
    if (!hasChromeStorage()) {
        const store = readPreviewStorage();
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach(key => delete store[key]);
        writePreviewStorage(store);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            chrome.storage.local.remove(keys, resolve);
        } catch {
            resolve();
        }
    });
}

export function sendRuntimeMessage<T>(message: unknown, fallback: T): Promise<T> {
    if (!isExtensionRuntime() || !chrome.runtime?.sendMessage) {
        return Promise.resolve(fallback);
    }

    return new Promise((resolve) => {
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

export function queryTabs(queryInfo: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]> {
    if (!isExtensionRuntime() || !chrome.tabs?.query) return Promise.resolve([]);

    return new Promise((resolve) => {
        try {
            chrome.tabs.query(queryInfo, tabs => resolve(tabs));
        } catch {
            resolve([]);
        }
    });
}

export function createTab(url: string, active = true): Promise<void> {
    if (!isExtensionRuntime() || !chrome.tabs?.create) {
        if (url.endsWith(".html") || url.includes(".html?")) window.open(url, "_blank", "noopener");
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            chrome.tabs.create({ url, active }, () => resolve());
        } catch {
            resolve();
        }
    });
}

export function executeScript(tabId: number, files: string[]): Promise<void> {
    if (!isExtensionRuntime() || !chrome.scripting?.executeScript) return Promise.resolve();
    return chrome.scripting.executeScript({ target: { tabId }, files }).then(() => undefined).catch(() => undefined);
}

export function lastRuntimeError() {
    return isExtensionRuntime() ? chrome.runtime.lastError : undefined;
}
