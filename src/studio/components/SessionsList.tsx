import { useMemo } from 'react';
import { useWorkshopStore } from '../store/workshop.js';
import { Badge } from '../ui/badge.js';
import { Card, CardBody } from '../ui/card.js';
import { cn, formatTimestamp } from '../lib/utils.js';

export function SessionsList() {
    const { sessions, selectedSessionId, selectSession, state } = useWorkshopStore();

    // Sort: currently-active session pinned to top, then by timestamp desc.
    const ordered = useMemo(() => {
        return [...sessions].sort((a, b) => {
            if (a.id === state.sessionId) return -1;
            if (b.id === state.sessionId) return 1;
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
    }, [sessions, state.sessionId]);

    if (!ordered.length) {
        return (
            <div className="text-sm text-fg-subtle p-4 text-center">
                No sessions yet. Start a brainstorm from the side panel.
            </div>
        );
    }

    return (
        <div id="sessionsList" className="flex flex-col gap-2 p-2">
            {ordered.map(session => {
                const isActive = session.id === state.sessionId;
                const isSelected = session.id === selectedSessionId;
                const turnCount = session.transcript?.length ?? 0;

                return (
                    <Card
                        key={session.id}
                        className={cn(
                            'cursor-pointer transition-colors',
                            isSelected
                                ? 'border-accent ring-1 ring-accent/30'
                                : 'hover:border-border-strong'
                        )}
                        onClick={() => selectSession(session.id)}
                    >
                        <CardBody className="gap-1.5 py-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <strong className="text-sm text-fg truncate" title={session.topic}>
                                    {session.topic || 'Untitled session'}
                                </strong>
                                {isActive && (
                                    <Badge
                                        variant={state.isPaused ? 'paused' : 'running'}
                                        size="sm"
                                    >
                                        {state.isPaused ? 'Paused' : 'Running'}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-fg-subtle font-mono">
                                <span>{session.mode}</span>
                                <span>·</span>
                                <span>{turnCount} turns</span>
                                <span>·</span>
                                <span>{formatTimestamp(session.timestamp)}</span>
                            </div>
                        </CardBody>
                    </Card>
                );
            })}
        </div>
    );
}
