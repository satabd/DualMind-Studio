import { useMemo, useState } from 'react';
import { useWorkshopStore } from '../store/workshop.js';
import type { MemoryEntryKind } from '../../types.js';
import { Card, CardBody, CardHeader } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { cn, formatTimestamp } from '../lib/utils.js';
import { clearSessionMemory, pruneSessionMemoryEntry } from '../lib/extension.js';

const KIND_LABEL: Record<MemoryEntryKind, string> = {
    fact: 'Fact',
    decision: 'Decision',
    question: 'Open question',
    rejected_option: 'Rejected option',
    risk: 'Risk',
    assumption: 'Assumption'
};

const KIND_VARIANT: Record<MemoryEntryKind, 'accent' | 'system' | 'paused' | 'escalation' | 'seat-a' | 'seat-b'> = {
    fact: 'accent',
    decision: 'seat-a',
    question: 'seat-b',
    rejected_option: 'paused',
    risk: 'escalation',
    assumption: 'system'
};

const SOURCE_LABEL: Record<string, string> = {
    checkpoint: 'from checkpoint',
    moderator: 'from moderator',
    agent: 'from agent',
    system: 'from system'
};

export function MemoryTab() {
    const { selectedSession, refresh } = useWorkshopStore();
    const [filter, setFilter] = useState<MemoryEntryKind | 'all'>('all');
    const [search, setSearch] = useState('');
    const [confirmingClear, setConfirmingClear] = useState(false);

    const entries = selectedSession?.memory?.entries || [];
    const tombstones = selectedSession?.memory?.prunedEntryKeys?.length || 0;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entries.filter(e => {
            if (filter !== 'all' && e.kind !== filter) return false;
            if (q && !e.text.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [entries, filter, search]);

    const grouped = useMemo(() => {
        const out: Partial<Record<MemoryEntryKind, typeof filtered>> = {};
        filtered.forEach(e => {
            (out[e.kind] ||= []).push(e);
        });
        return out;
    }, [filtered]);

    const kinds: MemoryEntryKind[] = ['fact', 'decision', 'question', 'rejected_option', 'risk', 'assumption'];

    if (!selectedSession) {
        return (
            <div className="flex items-center justify-center text-sm text-fg-subtle p-6">
                Select a session to view its memory.
            </div>
        );
    }

    const sessionId = selectedSession.id;

    const handleClear = async () => {
        await clearSessionMemory(sessionId);
        setConfirmingClear(false);
        await refresh();
    };

    const handlePrune = async (entryId: string) => {
        await pruneSessionMemoryEntry(sessionId, entryId);
        await refresh();
    };

    return (
        <div id="memoryTabContent" className="flex flex-col gap-4 min-h-[calc(100vh-160px)]">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant={filter === 'all' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All ({entries.length})
                </Button>
                {kinds.map(k => {
                    const count = entries.filter(e => e.kind === k).length;
                    if (!count) return null;
                    return (
                        <Button
                            key={k}
                            variant={filter === k ? 'primary' : 'ghost'}
                            size="sm"
                            onClick={() => setFilter(k)}
                        >
                            {KIND_LABEL[k]} ({count})
                        </Button>
                    );
                })}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search memory…"
                    className="ml-auto h-8 px-3 text-sm rounded-md border border-border bg-surface-muted text-fg focus:outline-none focus:shadow-focus focus:border-accent"
                    dir="auto"
                />
                {confirmingClear ? (
                    <div className="flex items-center gap-1 text-xs">
                        <span className="text-fg-muted">Clear all memory for this session?</span>
                        <Button
                            id="clearMemoryConfirmBtn"
                            variant="primary"
                            size="sm"
                            onClick={handleClear}
                        >
                            Confirm
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingClear(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <Button
                        id="clearMemoryBtn"
                        variant="ghost"
                        size="sm"
                        disabled={!entries.length}
                        onClick={() => setConfirmingClear(true)}
                    >
                        Clear all
                    </Button>
                )}
            </div>

            {tombstones > 0 && (
                <div className="text-xs text-fg-subtle">
                    {tombstones} pruned entr{tombstones === 1 ? 'y' : 'ies'} suppressed.
                </div>
            )}

            {!filtered.length && (
                <div className="text-sm text-fg-subtle p-4 text-center">
                    No memory entries match.
                </div>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {kinds.flatMap(k => grouped[k] || []).map(entry => (
                    <Card key={entry.id}>
                        <CardHeader className="py-2">
                            <Badge variant={KIND_VARIANT[entry.kind]} size="sm">
                                {KIND_LABEL[entry.kind]}
                            </Badge>
                            <span className="text-[10px] uppercase font-mono text-fg-subtle">
                                {SOURCE_LABEL[entry.source] || entry.source}
                            </span>
                            <span className="text-xs text-fg-subtle font-mono ml-auto">
                                {formatTimestamp(entry.createdAt)}
                            </span>
                        </CardHeader>
                        <CardBody className="text-sm">
                            <p className={cn('text-fg')} dir="auto">{entry.text}</p>
                            {entry.tags && entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {entry.tags.map(t => (
                                        <Badge key={t} variant="default" size="sm">{t}</Badge>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePrune(entry.id)}
                                    title="Prune this entry"
                                    className="memory-entry-actions text-[10px] text-fg-subtle"
                                >
                                    Prune
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    );
}
