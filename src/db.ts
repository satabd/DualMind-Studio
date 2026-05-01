import {
    TranscriptEntry,
    BrainstormSession,
    EscalationPayload,
    SessionCheckpoint,
    SessionArtifacts,
    SessionMemory,
    ModeratorDecision,
    FinaleType
} from './types.js';

export type {
    TranscriptEntry,
    BrainstormSession,
    EscalationPayload,
    SessionCheckpoint,
    SessionArtifacts,
    SessionMemory,
    ModeratorDecision,
    FinaleType
};

const DB_NAME = 'LLMOrchestratorDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function putSession(session: BrainstormSession): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(session);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function mutateSession(
    id: string,
    mutate: (session: BrainstormSession) => BrainstormSession
): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        let failure: unknown = null;
        let rejected = false;
        const rejectOnce = (error: unknown) => {
            if (rejected) return;
            rejected = true;
            reject(error);
        };

        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const session = request.result as BrainstormSession | undefined;
            if (!session) {
                failure = new Error("Session not found");
                tx.abort();
                return;
            }

            let nextSession: BrainstormSession;
            try {
                nextSession = mutate(session);
            } catch (error) {
                failure = error;
                tx.abort();
                return;
            }

            const putRequest = store.put(nextSession);
            putRequest.onerror = () => {
                failure = putRequest.error;
            };
        };
        request.onerror = () => {
            failure = request.error;
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => rejectOnce(failure || tx.error);
        tx.onabort = () => rejectOnce(failure || tx.error);
    });
}

export async function createSession(session: BrainstormSession): Promise<void> {
    return putSession(session);
}

export async function createBranchSession(session: BrainstormSession): Promise<void> {
    return putSession(session);
}

export async function getSession(id: string): Promise<BrainstormSession | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function patchSession(id: string, patch: Partial<BrainstormSession>): Promise<void> {
    await mutateSession(id, session => ({ ...session, ...patch }));
}

export async function updateSession(id: string, entry: TranscriptEntry): Promise<void> {
    await mutateSession(id, session => ({
        ...session,
        transcript: [...(session.transcript || []), entry]
    }));
}

export async function saveArtifacts(id: string, artifacts: SessionArtifacts): Promise<void> {
    await patchSession(id, { artifacts });
}

export async function saveMemory(id: string, memory: SessionMemory): Promise<void> {
    await patchSession(id, { memory });
}

export async function appendCheckpoint(id: string, checkpoint: SessionCheckpoint): Promise<void> {
    await mutateSession(id, session => ({
        ...session,
        checkpoints: [...(session.checkpoints || []), checkpoint]
    }));
}

export async function appendModeratorDecision(id: string, decision: ModeratorDecision): Promise<void> {
    await mutateSession(id, session => ({
        ...session,
        moderatorDecisions: [...(session.moderatorDecisions || []), decision]
    }));
}

export async function saveFinalOutput(id: string, finaleType: FinaleType, text: string): Promise<void> {
    await mutateSession(id, session => ({
        ...session,
        finalOutputs: {
            ...(session.finalOutputs || {}),
            [finaleType]: text
        }
    }));
}

export async function getAllSessions(): Promise<BrainstormSession[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const sessions: BrainstormSession[] = request.result;
            sessions.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sessions);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function deleteSession(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function clearAllSessions(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function appendEscalation(sessionId: string, escalation: EscalationPayload): Promise<void> {
    await mutateSession(sessionId, session => ({
        ...session,
        escalations: [...(session.escalations || []), escalation]
    }));
}
