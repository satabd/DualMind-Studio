import { useWorkshopStore } from '../store/workshop.js';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';

export function EscalationCard() {
    const { state } = useWorkshopStore();
    const escalation = state.lastEscalation;

    if (!state.awaitingHumanDecision || !escalation) return null;

    return (
        <Card id="escalationCard" className="border-danger/40">
            <CardHeader className="bg-danger-soft">
                <div className="flex items-center gap-2">
                    <CardTitle>Escalation pending</CardTitle>
                    <Badge variant="escalation" size="sm">awaiting decision</Badge>
                </div>
            </CardHeader>
            <CardBody className="text-sm">
                <div>
                    <div className="text-[10px] uppercase font-mono text-fg-subtle mb-1">Reason</div>
                    <div className="text-fg" dir="auto">{escalation.reason}</div>
                </div>
                <div>
                    <div className="text-[10px] uppercase font-mono text-fg-subtle mb-1">Decision needed</div>
                    <div className="text-fg" dir="auto">{escalation.decision_needed}</div>
                </div>
                {escalation.options?.length > 0 && (
                    <div>
                        <div className="text-[10px] uppercase font-mono text-fg-subtle mb-1">Options</div>
                        <ul className="list-disc pl-5 text-fg-muted">
                            {escalation.options.map((opt, i) => (
                                <li key={i} dir="auto">{opt}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {escalation.recommended_option && (
                    <div>
                        <div className="text-[10px] uppercase font-mono text-fg-subtle mb-1">Recommended</div>
                        <div className="text-fg" dir="auto">{escalation.recommended_option}</div>
                    </div>
                )}
                {escalation.next_step_after_decision && (
                    <div>
                        <div className="text-[10px] uppercase font-mono text-fg-subtle mb-1">Next step after decision</div>
                        <div className="text-fg-muted" dir="auto">{escalation.next_step_after_decision}</div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
}
