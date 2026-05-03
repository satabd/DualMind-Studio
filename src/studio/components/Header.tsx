import { useWorkshopStore } from '../store/workshop.js';
import { pauseBrainstorm, resumeBrainstorm, stopBrainstorm } from '../lib/extension.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import type { BrainstormState, SessionPhase, TurnIntent } from '../../types.js';

// Friendly names map raw enum strings to user-facing copy.  Keep these in sync
// with the audit's recommended copy table (issue #4 / v0.2.1).
const PHASE_LABEL: Record<SessionPhase, string> = {
    DIVERGE: 'Explore',
    CONVERGE: 'Narrow',
    FINALIZE: 'Finalize'
};

const MOVE_LABEL: Record<TurnIntent, string> = {
    expand: 'Expand',
    critique: 'Critique',
    verify: 'Verify',
    combine: 'Combine',
    narrow: 'Narrow',
    conclude: 'Conclude',
    escalate: 'Escalation',
    synthesize: 'Synthesize',
    moderate: 'Moderator'
};

type Lifecycle = 'idle' | 'running' | 'paused' | 'finished';

function deriveLifecycle(state: BrainstormState): Lifecycle {
    if (state.active) return state.isPaused ? 'paused' : 'running';
    return state.sessionId ? 'finished' : 'idle';
}

const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    finished: 'Finished'
};

export function Header() {
    const { state, selectedSession, refresh } = useWorkshopStore();

    const lifecycle = deriveLifecycle(state);
    // While running we trust the engine's currentPhase (it points at the
    // *next* turn's phase, which is what the user wants live).  Once the run
    // is over, currentPhase freezes and contradicts the transcript — derive
    // session phase from the last completed turn instead.
    const lastTurnPhase = (() => {
        const transcript = selectedSession?.transcript || [];
        for (let i = transcript.length - 1; i >= 0; i--) {
            const phase = transcript[i].phase;
            if (phase) return phase;
        }
        return undefined;
    })();
    const phaseToShow: SessionPhase | undefined =
        lifecycle === 'running' || lifecycle === 'paused'
            ? state.currentPhase
            : lifecycle === 'finished'
                ? lastTurnPhase
                : undefined;

    const moveToShow: TurnIntent | undefined =
        lifecycle === 'running' || lifecycle === 'paused'
            ? state.currentIntent
            : undefined;

    const stateVariant: 'running' | 'paused' | 'idle' | 'escalation' | 'success' = state.awaitingHumanDecision
        ? 'escalation'
        : lifecycle === 'running'
            ? 'running'
            : lifecycle === 'paused'
                ? 'paused'
                : lifecycle === 'finished'
                    ? 'success'
                    : 'idle';

    const breadcrumbParts: string[] = [LIFECYCLE_LABEL[lifecycle]];
    if (state.sessionId) {
        if (lifecycle === 'running' || lifecycle === 'paused' || lifecycle === 'finished') {
            breadcrumbParts.push(`${state.currentRound} of ${state.rounds}`);
        }
        if (phaseToShow) breadcrumbParts.push(`Phase: ${PHASE_LABEL[phaseToShow]}`);
        if (moveToShow) breadcrumbParts.push(`Move: ${MOVE_LABEL[moveToShow]}`);
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
                <Badge id="globalStateBadge" variant={stateVariant}>
                    {LIFECYCLE_LABEL[lifecycle]}
                </Badge>
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
