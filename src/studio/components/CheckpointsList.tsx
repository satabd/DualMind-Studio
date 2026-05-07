import { useState } from 'react';
import { useWorkshopStore } from '../store/workshop.js';
import { Card, CardBody, CardHeader } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { createBranchFromCheckpoint } from '../lib/extension.js';
import { formatTimestamp } from '../lib/utils.js';

// EN: Compact checkpoint list relocated from the side panel (issue #18 item 1).
//     Each card shows the checkpoint label/turn/phase summary plus a "Branch
//     from here" affordance that calls the existing background message.
// AR: قائمة نقاط التحقق التي نُقلت من اللوحة الجانبية إلى الورشة.
export function CheckpointsList() {
    const { selectedSession, refresh } = useWorkshopStore();
    const [busyId, setBusyId] = useState<string | null>(null);

    const checkpoints = selectedSession?.checkpoints || [];
    if (!checkpoints.length) return null;

    const handleBranch = async (checkpointId: string, label: string) => {
        if (!selectedSession) return;
        setBusyId(checkpointId);
        await createBranchFromCheckpoint(selectedSession.id, checkpointId, `Branch from ${label}`);
        setBusyId(null);
        await refresh();
    };

    return (
        <details id="checkpointCards" className="rounded-md border border-border bg-surface" open={false}>
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-mono uppercase text-fg-muted">
                Checkpoints ({checkpoints.length})
            </summary>
            <div className="grid gap-2 p-2 md:grid-cols-2">
                {checkpoints.map(cp => (
                    <Card key={cp.id}>
                        <CardHeader className="py-2">
                            <span className="text-sm font-semibold text-fg">{cp.label}</span>
                            <Badge variant="default" size="sm">{cp.phase}</Badge>
                            <span className="text-xs text-fg-subtle font-mono ml-auto">
                                turn {cp.turn} · {formatTimestamp(cp.createdAt)}
                            </span>
                        </CardHeader>
                        <CardBody className="text-xs gap-1">
                            <p className="text-fg-muted leading-snug" dir="auto">
                                {cp.summary || 'No summary recorded.'}
                            </p>
                            <div className="flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busyId === cp.id}
                                    onClick={() => handleBranch(cp.id, cp.label)}
                                    className="text-[11px]"
                                >
                                    {busyId === cp.id ? 'Branching…' : 'Branch from here'}
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </details>
    );
}
