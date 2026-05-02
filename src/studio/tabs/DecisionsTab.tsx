import { useWorkshopStore } from '../store/workshop.js';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';
import { MarkdownBody } from '../components/MarkdownBody.js';
import { formatTimestamp } from '../lib/utils.js';

export function DecisionsTab() {
    const { selectedSession } = useWorkshopStore();

    if (!selectedSession) {
        return (
            <div className="flex items-center justify-center text-sm text-fg-subtle p-6">
                Select a session to view its decisions.
            </div>
        );
    }

    const decisionMemory = (selectedSession.memory?.entries || []).filter(e => e.kind === 'decision');
    const moderatorDecisions = selectedSession.moderatorDecisions || [];
    const finalOutputs = Object.entries(selectedSession.finalOutputs || {});

    const empty = !decisionMemory.length && !moderatorDecisions.length && !finalOutputs.length;
    if (empty) {
        return (
            <div className="flex items-center justify-center text-sm text-fg-subtle p-6">
                No decisions, moderator interventions, or final outputs recorded yet.
            </div>
        );
    }

    return (
        <div id="decisionsTabContent" className="flex flex-col gap-6 min-h-[calc(100vh-160px)]">
            {decisionMemory.length > 0 && (
                <section className="flex flex-col gap-3">
                    <h2 className="text-md font-semibold text-fg flex items-center gap-2">
                        Decision memory
                        <Badge variant="seat-a" size="sm">{decisionMemory.length}</Badge>
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2">
                        {decisionMemory.map(d => (
                            <Card key={d.id}>
                                <CardHeader className="py-2">
                                    <span className="text-xs text-fg-muted font-mono">
                                        {formatTimestamp(d.createdAt)}
                                    </span>
                                </CardHeader>
                                <CardBody>
                                    <p className="text-sm text-fg" dir="auto">{d.text}</p>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {moderatorDecisions.length > 0 && (
                <section className="flex flex-col gap-3">
                    <h2 className="text-md font-semibold text-fg flex items-center gap-2">
                        Moderator interventions
                        <Badge variant="paused" size="sm">{moderatorDecisions.length}</Badge>
                    </h2>
                    <div className="flex flex-col gap-3">
                        {moderatorDecisions.map((m, i) => (
                            <Card key={i}>
                                <CardHeader className="py-2">
                                    <span className="text-xs text-fg-muted font-mono">
                                        {formatTimestamp(m.timestamp)} · turn {m.linkedTurn}
                                    </span>
                                </CardHeader>
                                <CardBody>
                                    <MarkdownBody text={m.feedback} />
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {finalOutputs.length > 0 && (
                <section className="flex flex-col gap-3">
                    <h2 className="text-md font-semibold text-fg flex items-center gap-2">
                        Final outputs
                        <Badge variant="success" size="sm">{finalOutputs.length}</Badge>
                    </h2>
                    <div className="flex flex-col gap-3">
                        {finalOutputs.map(([kind, content]) => (
                            <Card key={kind}>
                                <CardHeader>
                                    <CardTitle>{kind}</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <MarkdownBody text={String(content || '')} />
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
