import { useWorkshopStore } from '../store/workshop.js';
import { SessionsList } from '../components/SessionsList.js';
import { Timeline } from '../components/Timeline.js';
import { Composer } from '../components/Composer.js';
import { EscalationCard } from '../components/EscalationCard.js';

export function SessionsTab() {
    const { selectedSessionId, state } = useWorkshopStore();
    const isViewingSaved = !!selectedSessionId && selectedSessionId !== state.sessionId;

    return (
        <div
            id="sessionsTabContent"
            className="grid grid-cols-1 gap-4 h-[calc(100vh-160px)] lg:grid-cols-[280px_1fr]"
        >
            {/* LEFT — sessions list */}
            <aside className="rounded-lg border border-border bg-surface overflow-y-auto">
                <SessionsList />
            </aside>

            {/* RIGHT — timeline + composer + escalation */}
            <section className="flex flex-col gap-3 min-h-0">
                {isViewingSaved && (
                    <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted">
                        Viewing a saved session. The composer below still controls the
                        currently active run, not this view.
                    </div>
                )}
                <div className="flex-1 min-h-0 rounded-lg border border-border bg-surface overflow-hidden flex">
                    <Timeline />
                </div>
                <EscalationCard />
                <Composer />
            </section>
        </div>
    );
}
