import { Card, CardBody, CardHeader, CardTitle } from '../ui/card.js';
import { Badge } from '../ui/badge.js';

// Phase 1 placeholder.  Per-session identity overrides land in a future PR;
// today these strings come from src/promptBlueprint.ts and are read-only.

export function AgentsTab() {
    return (
        <div
            id="agentsTabContent"
            className="grid grid-cols-1 gap-4 min-h-[calc(100vh-160px)] lg:grid-cols-2"
        >
            <Card>
                <CardHeader>
                    <CardTitle>Agent A</CardTitle>
                    <Badge variant="seat-a" size="sm">Synthesis seat</Badge>
                </CardHeader>
                <CardBody>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Role</div>
                        <div className="text-sm text-fg">Synthesis Architect</div>
                    </div>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Responsibility</div>
                        <div className="text-sm text-fg leading-snug">
                            Frame the problem, combine useful directions, and push the session toward a concrete working shape.
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Operating style</div>
                        <div className="text-sm text-fg-muted leading-snug">
                            Compact and specific. Prefer falsifiable claims. Separate established facts, inferences, risks, and open questions.
                        </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border bg-surface-muted p-3 text-xs text-fg-subtle">
                        Editing identity and operating style per session is coming in the next phase. Today these are the defaults from <code className="font-mono">promptBlueprint.ts</code>.
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Agent B</CardTitle>
                    <Badge variant="seat-b" size="sm">Skeptic seat</Badge>
                </CardHeader>
                <CardBody>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Role</div>
                        <div className="text-sm text-fg">Skeptical Verifier</div>
                    </div>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Responsibility</div>
                        <div className="text-sm text-fg leading-snug">
                            Stress-test assumptions, expose weak evidence, and force the session to narrow when claims are unsupported.
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-fg-subtle uppercase mb-1">Operating style</div>
                        <div className="text-sm text-fg-muted leading-snug">
                            Compact and specific. Prefer falsifiable claims. Converge when the session starts repeating itself. Ask for verification on one concrete point instead of expanding scope.
                        </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border bg-surface-muted p-3 text-xs text-fg-subtle">
                        Editing identity and operating style per session is coming in the next phase. Today these are the defaults from <code className="font-mono">promptBlueprint.ts</code>.
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
