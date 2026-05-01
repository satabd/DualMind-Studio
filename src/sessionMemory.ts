import type {
    MemoryEntry,
    ModeratorDecision,
    SessionCheckpoint,
    SessionMemory
} from './types.js';

const DEFAULT_MEMORY_LIMIT = 24;

// EN: Session memory stores compact conclusions, not raw transcript history.
// AR: ذاكرة الجلسة تحفظ خلاصات مركزة، وليس سجل المحادثة الخام.
export function createEmptySessionMemory(): SessionMemory {
    return { entries: [], prunedEntryKeys: [] };
}

function normalizeText(text: string) {
    return text.trim().replace(/\s+/g, ' ');
}

export function getMemoryEntryKey(entry: Pick<MemoryEntry, "kind" | "text">) {
    return `${entry.kind}:${normalizeText(entry.text).toLowerCase()}`;
}

function makeMemoryEntry(
    id: string,
    kind: MemoryEntry["kind"],
    text: string,
    createdAt: number,
    source: MemoryEntry["source"],
    tags: string[] = []
): MemoryEntry | null {
    const clean = normalizeText(text);
    if (!clean) return null;
    return { id, kind, text: clean, createdAt, source, tags };
}

function appendEntry(entries: MemoryEntry[], entry: MemoryEntry | null) {
    if (entry) entries.push(entry);
}

export function memoryEntriesFromCheckpoint(checkpoint: SessionCheckpoint): MemoryEntry[] {
    const artifacts = checkpoint.artifactSnapshot;
    const entries: MemoryEntry[] = [];
    const baseTags = [`checkpoint:${checkpoint.id}`, `phase:${checkpoint.phase}`, `turn:${checkpoint.turn}`];

    appendEntry(entries, makeMemoryEntry(
        `${checkpoint.id}:summary`,
        "fact",
        checkpoint.summary || artifacts.synthesis,
        checkpoint.createdAt,
        "checkpoint",
        baseTags
    ));
    appendEntry(entries, makeMemoryEntry(
        `${checkpoint.id}:decision`,
        "decision",
        artifacts.decisions[0] || "",
        checkpoint.createdAt,
        "checkpoint",
        baseTags
    ));
    appendEntry(entries, makeMemoryEntry(
        `${checkpoint.id}:risk`,
        "risk",
        artifacts.risks[0] || "",
        checkpoint.createdAt,
        "checkpoint",
        baseTags
    ));
    appendEntry(entries, makeMemoryEntry(
        `${checkpoint.id}:question`,
        "question",
        artifacts.questions[0] || "",
        checkpoint.createdAt,
        "checkpoint",
        baseTags
    ));
    appendEntry(entries, makeMemoryEntry(
        `${checkpoint.id}:idea`,
        "assumption",
        artifacts.ideas[0] || artifacts.highlights[0] || "",
        checkpoint.createdAt,
        "checkpoint",
        baseTags
    ));

    return entries;
}

// EN: Moderator decisions are high-priority memory because they unblock future turns.
// AR: قرارات المشرف لها أولوية عالية لأنها تفتح الطريق للأدوار اللاحقة.
export function memoryEntryFromModeratorDecision(decision: ModeratorDecision): MemoryEntry {
    return {
        id: `moderator:${decision.timestamp}:${decision.linkedTurn}`,
        kind: "decision",
        text: normalizeText(decision.feedback),
        createdAt: decision.timestamp,
        source: "moderator",
        tags: [
            `turn:${decision.linkedTurn}`,
            ...(decision.linkedCheckpointId ? [`checkpoint:${decision.linkedCheckpointId}`] : [])
        ]
    };
}

// EN: Merge by semantic text so repeated checkpoints do not flood the prompt.
// AR: يتم الدمج حسب المعنى النصي حتى لا تغرق نقاط التحقق المتكررة المطالبة.
export function mergeSessionMemory(
    memory: SessionMemory | undefined,
    nextEntries: MemoryEntry[],
    limit = DEFAULT_MEMORY_LIMIT
): SessionMemory {
    const merged: MemoryEntry[] = [];
    const seen = new Set<string>();
    const prunedEntryKeys = [...(memory?.prunedEntryKeys || [])];
    const pruned = new Set(prunedEntryKeys);

    [...(memory?.entries || []), ...nextEntries].forEach(entry => {
        const clean = normalizeText(entry.text);
        if (!clean) return;
        const key = getMemoryEntryKey({ kind: entry.kind, text: clean });
        if (pruned.has(key)) return;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push({ ...entry, text: clean });
    });

    return { entries: merged.slice(-limit), prunedEntryKeys };
}

// EN: Prompt memory is intentionally small; the full memory remains stored locally.
// AR: ذاكرة المطالبة مختصرة عمداً، بينما تبقى الذاكرة الكاملة محفوظة محلياً.
export function selectPromptMemory(memory: SessionMemory | undefined, limit = 8): SessionMemory {
    if (!memory?.entries.length) return createEmptySessionMemory();
    const priority: Record<MemoryEntry["kind"], number> = {
        decision: 0,
        fact: 1,
        risk: 2,
        question: 3,
        assumption: 4,
        rejected_option: 5
    };
    const entries = [...memory.entries]
        .sort((a, b) => priority[a.kind] - priority[b.kind] || b.createdAt - a.createdAt)
        .slice(0, limit);

    return { entries };
}
