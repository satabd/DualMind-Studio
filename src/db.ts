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
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
    const session = await getSession(id);
    if (!session) throw new Error("Session not found");
    await putSession({ ...session, ...patch });
}

export async function updateSession(id: string, entry: TranscriptEntry): Promise<void> {
    const session = await getSession(id);
    if (!session) throw new Error("Session not found");

    const transcript = session.transcript || [];
    transcript.push(entry);
    await putSession({ ...session, transcript });
}

export async function saveArtifacts(id: string, artifacts: SessionArtifacts): Promise<void> {
    await patchSession(id, { artifacts });
}

export async function saveMemory(id: string, memory: SessionMemory): Promise<void> {
    await patchSession(id, { memory });
}

export async function appendCheckpoint(id: string, checkpoint: SessionCheckpoint): Promise<void> {
    const session = await getSession(id);
    if (!session) throw new Error("Session not found");

    const checkpoints = session.checkpoints || [];
    checkpoints.push(checkpoint);
    await putSession({ ...session, checkpoints });
}

export async function appendModeratorDecision(id: string, decision: ModeratorDecision): Promise<void> {
    const session = await getSession(id);
    if (!session) throw new Error("Session not found");

    const moderatorDecisions = session.moderatorDecisions || [];
    moderatorDecisions.push(decision);
    await putSession({ ...session, moderatorDecisions });
}

export async function saveFinalOutput(id: string, finaleType: FinaleType, text: string): Promise<void> {
    const session = await getSession(id);
    if (!session) throw new Error("Session not found");

    const finalOutputs = { ...(session.finalOutputs || {}) };
    finalOutputs[finaleType] = text;
    await putSession({ ...session, finalOutputs });
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
    const session = await getSession(sessionId);
    if (!session) throw new Error("Session not found");

    const escalations = session.escalations || [];
    escalations.push(escalation);
    await putSession({ ...session, escalations });
}
