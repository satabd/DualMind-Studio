import { useMemo } from 'react';
import { useWorkshopStore } from '../store/workshop.js';
import { Card, CardBody } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { cn, formatTimestamp } from '../lib/utils.js';

// EN: Branch picker relocated from the side panel (issue #18 item 1).
//     Shows sessions that descend from the currently-selected session via
//     parentSessionId, plus the parent itself if the current session is
//     itself a branch.
// AR: قائمة الفروع التي نُقلت من اللوحة الجانبية إلى الورشة.
export function BranchList() {
    const { sessions, selectedSession, selectSession } = useWorkshopStore();

    const related = useMemo(() => {
        if (!selectedSession) return [] as typeof sessions;
        const out: typeof sessions = [];
        if (selectedSession.parentSessionId) {
            const parent = sessions.find(s => s.id === selectedSession.parentSessionId);
            if (parent) out.push(parent);
        }
        sessions.forEach(s => {
            if (s.parentSessionId === selectedSession.id) out.push(s);
        });
        return out;
    }, [sessions, selectedSession]);

    if (!related.length) return null;

    return (
        <details id="branchList" className="rounded-md border border-border bg-surface" open={false}>
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-mono uppercase text-fg-muted">
                Branches ({related.length})
            </summary>
            <div className="flex flex-col gap-2 p-2">
                {related.map(s => {
                    const isParent = s.id === selectedSession?.parentSessionId;
                    return (
                        <Card
                            key={s.id}
                            className={cn(
                                'cursor-pointer transition-colors hover:border-border-strong',
                                s.id === selectedSession?.id && 'border-accent'
                            )}
                            onClick={() => selectSession(s.id)}
                        >
                            <CardBody className="py-2 gap-1">
                                <div className="flex items-center gap-2">
                                    <strong className="text-sm text-fg truncate">
                                        {s.branchLabel || s.topic || 'Untitled'}
                                    </strong>
                                    <Badge variant={isParent ? 'system' : 'seat-a'} size="sm">
                                        {isParent ? 'parent' : 'branch'}
                                    </Badge>
                                </div>
                                <div className="text-xs text-fg-subtle font-mono">
                                    {s.transcript?.length ?? 0} turns · {formatTimestamp(s.timestamp)}
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>
        </details>
    );
}
