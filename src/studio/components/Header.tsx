import { useWorkshopStore } from '../store/workshop.js';
import { pauseBrainstorm, resumeBrainstorm, stopBrainstorm } from '../lib/extension.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';

export function Header() {
    const { state, refresh } = useWorkshopStore();

    const stateLabel = state.active ? (state.isPaused ? 'Paused' : 'Running') : 'Idle';
    const stateVariant: 'running' | 'paused' | 'idle' | 'escalation' = state.awaitingHumanDecision
        ? 'escalation'
        : state.active
            ? state.isPaused ? 'paused' : 'running'
            : 'idle';

    const breadcrumbParts: string[] = [stateLabel];
    if (state.sessionId) {
        breadcrumbParts.push(`Round ${state.currentRound}/${state.rounds}`);
        breadcrumbParts.push(state.currentPhase);
        breadcrumbParts.push(state.currentIntent);
    } else {
        breadcrumbParts.push('No active session');
    }

    const handlePause = async () => { await pauseBrainstorm(); await refresh(); };
    const handleResume = async () => { await resumeBrainstorm(''); await refresh(); };
    const handleStop = async () => { await stopBrainstorm(); await refresh(); };

    return (
        <header
            id="studioHeader"
            className="sticky top-0 z-10 flex flex-col gap-3 px-5 py-3 bg-surface border-b border-border backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
            <div className="flex flex-col gap-[2px]">
                <h1 className="text-md font-semibold text-fg">Studio Workshop</h1>
                <span id="studioBreadcrumb" className="text-xs text-fg-subtle font-mono">
                    {breadcrumbParts.join(' · ')}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Badge id="globalStateBadge" variant={stateVariant}>{stateLabel}</Badge>
                {state.awaitingHumanDecision && (
                    <Badge variant="escalation">Escalation pending</Badge>
                )}
                <Button
                    id="globalPauseBtn"
                    variant="secondary"
                    size="sm"
                    disabled={!state.active || state.isPaused}
                    onClick={handlePause}
                >
                    Pause
                </Button>
                <Button
                    id="globalResumeBtn"
                    variant="ghost"
                    size="sm"
                    disabled={!state.active || !state.isPaused}
                    onClick={handleResume}
                >
                    Resume
                </Button>
                <Button
                    id="globalStopBtn"
                    variant="ghost"
                    size="sm"
                    disabled={!state.active}
                    onClick={handleStop}
                >
                    Stop
                </Button>
                <Button variant="ghost" size="sm" onClick={refresh} title="Refresh">
                    Refresh
                </Button>
            </div>
        </header>
    );
}
