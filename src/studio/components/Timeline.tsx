import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrainstormSession, TranscriptEntry } from '../../types.js';
import { useWorkshopStore } from '../store/workshop.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { MarkdownBody } from './MarkdownBody.js';
import { cn, formatTimestamp } from '../lib/utils.js';

type Seat = 'Agent A' | 'Agent B' | 'System' | 'User';

// Prefer the seat persisted on the entry (issue #3). Fall back to the legacy
// per-round alternation only for sessions saved before seat persistence
// landed: round-N first speaker is always Agent A, second is Agent B, with
// Gemini/ChatGPT swapping which seat they hold each round.
function getSeat(entry: TranscriptEntry, agentTurnIndex: number, firstSpeaker: string): Seat {
    if (entry.agent === 'User') return 'User';
    // Forced-fallback System turns inherit the seat of the agent whose output
    // failed; honour that so the timeline tints them correctly.
    if (entry.seat === 'Agent A' || entry.seat === 'Agent B') return entry.seat;
    if (entry.agent === 'System') return 'System';
    const round = Math.floor(agentTurnIndex / 2) + 1;
    const roundFirst = round % 2 === 1
        ? firstSpeaker
        : firstSpeaker === 'Gemini' ? 'ChatGPT' : 'Gemini';
    return entry.agent === roundFirst ? 'Agent A' : 'Agent B';
}

function getRoundForAgentTurn(agentTurnIndex: number) {
    return Math.floor(agentTurnIndex / 2) + 1;
}

interface TimelineEntry {
    entry: TranscriptEntry;
    seat: Seat;
    round: number | null;
    isFirstOfRound: boolean;
}

function buildTimeline(session: BrainstormSession): TimelineEntry[] {
    const firstSpeaker = session.firstSpeaker || 'Gemini';
    let agentTurnIndex = 0;
    let lastRoundShown = 0;

    return session.transcript.map(entry => {
        const isAgent = entry.agent === 'Gemini' || entry.agent === 'ChatGPT';
        const seat = getSeat(entry, agentTurnIndex, firstSpeaker);
        const round = isAgent ? getRoundForAgentTurn(agentTurnIndex) : null;
        if (isAgent) agentTurnIndex++;
        const isFirstOfRound = round !== null && round !== lastRoundShown;
        if (isFirstOfRound && round !== null) lastRoundShown = round;
        return { entry, seat, round, isFirstOfRound };
    });
}

const SEAT_LETTER: Record<Seat, string> = {
    'Agent A': 'A',
    'Agent B': 'B',
    'System': '!',
    'User': 'U'
};

const SEAT_LABEL: Record<Seat, string> = {
    'Agent A': 'Synthesis',
    'Agent B': 'Skeptic',
    'System': 'Orchestrator',
    'User': 'You'
};

function TimelineNode({ seat }: { seat: Seat }) {
    return (
        <div
            className={cn(
                'relative z-10 grid place-items-center w-9 h-9 rounded-full border-2 shadow-md font-semibold text-sm',
                seat === 'Agent A' && 'bg-seat-a text-bg border-seat-a',
                seat === 'Agent B' && 'bg-seat-b text-bg border-seat-b',
                seat === 'System' && 'bg-system text-bg border-system',
                seat === 'User' && 'bg-fg-muted text-bg border-fg-muted'
            )}
        >
            {SEAT_LETTER[seat]}
        </div>
    );
}

function TurnRow({ item }: { item: TimelineEntry }) {
    const { entry, seat } = item;

    return (
        <article className="grid grid-cols-[80px_36px_1fr] gap-3 items-start">
            {/* LEFT — meta column (timestamp + intent + phase) */}
            <div className="flex flex-col items-end gap-1 pt-2">
                <span className="text-xs text-fg-muted font-mono">
                    {formatTimestamp(entry.timestamp)}
                </span>
                {entry.intent && (
                    <span className="text-[10px] text-fg-subtle uppercase font-mono">
                        {entry.intent}
                    </span>
                )}
                {entry.phase && (
                    <span className="text-[10px] text-fg-subtle font-mono">
                        {entry.phase}
                    </span>
                )}
            </div>

            {/* CENTER — node on the rail */}
            <div className="flex justify-center pt-1">
                <TimelineNode seat={seat} />
            </div>

            {/* RIGHT — content card, seat-tinted */}
            <div
                className={cn(
                    'turn-bubble flex flex-col gap-2 rounded-md border p-3 shadow-sm',
                    seat === 'Agent A' && 'border-seat-a/50 bg-seat-a-soft',
                    seat === 'Agent B' && 'border-seat-b/50 bg-seat-b-soft',
                    seat === 'System' && 'border-system/50 bg-system-soft',
                    seat === 'User' && 'border-border bg-surface-muted'
                )}
            >
                <header className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-fg">{entry.agent}</strong>
                        <span
                            className={cn(
                                'text-xs font-medium',
                                seat === 'Agent A' && 'text-seat-a',
                                seat === 'Agent B' && 'text-seat-b',
                                seat === 'System' && 'text-system',
                                seat === 'User' && 'text-fg-muted'
                            )}
                        >
                            {SEAT_LABEL[seat]}
                        </span>
                    </div>
                    {entry.repairStatus && entry.repairStatus !== 'clean' && (
                        <Badge
                            variant={entry.repairStatus === 'forced' ? 'escalation' : 'paused'}
                            size="sm"
                        >
                            repair: {entry.repairStatus}
                        </Badge>
                    )}
                </header>
                <MarkdownBody text={entry.text} />
                {entry.promptSnapshot && (
                    <details className="text-xs text-fg-subtle">
                        <summary className="cursor-pointer select-none font-mono uppercase text-[10px]">
                            Show prompt
                        </summary>
                        <pre className="mt-2 max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-bg/60 p-2 text-[11px] text-fg-muted">
                            {entry.promptSnapshot}
                        </pre>
                    </details>
                )}
            </div>
        </article>
    );
}

function RoundHeader({ round, phase }: { round: number; phase?: string }) {
    return (
        <div className="grid grid-cols-[80px_36px_1fr] gap-3 items-center sticky top-0 z-20 py-2 bg-bg/95 backdrop-blur-sm">
            <div className="text-right">
                <span className="text-xl font-bold text-fg-subtle font-mono leading-none">
                    R{round}
                </span>
            </div>
            <div className="flex justify-center">
                <div className="w-3 h-3 rounded-full bg-accent border-2 border-bg shadow" />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-fg-muted font-mono font-semibold">
                    Round {round}
                </span>
                {phase && <Badge variant="default" size="sm">{phase}</Badge>}
                <div className="flex-1 h-px bg-border" />
            </div>
        </div>
    );
}

export function Timeline() {
    const { selectedSession, state } = useWorkshopStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showJumpToLast, setShowJumpToLast] = useState(false);

    const items = useMemo(
        () => (selectedSession ? buildTimeline(selectedSession) : []),
        [selectedSession]
    );

    const transcriptLength = selectedSession?.transcript.length ?? 0;
    const lastTimestamp = selectedSession?.transcript.at(-1)?.timestamp;

    // Auto-scroll to bottom when new content arrives, unless user has scrolled
    // up by more than the threshold — in which case the floating
    // "Move to last ↓" button takes over.
    useEffect(() => {
        if (!showJumpToLast && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [transcriptLength, lastTimestamp, showJumpToLast]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
        setShowJumpToLast(distanceFromBottom > 200);
    };

    const jumpToLast = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setShowJumpToLast(false);
    };

    if (!selectedSession) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-fg-subtle p-6">
                Select a session from the list to view its timeline.
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-fg-subtle p-6">
                No turns recorded yet. The transcript will appear here as agents respond.
            </div>
        );
    }

    return (
        <div className="relative flex-1 min-h-0">
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                id="timelineScroll"
                className="absolute inset-0 overflow-y-auto"
            >
                {/* Vertical rail behind the nodes — positioned in the centre of the
                   middle column, so all node circles centre exactly on it. */}
                <div className="relative px-4 pt-2 pb-12">
                    <div
                        className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-border via-border-strong to-border"
                        style={{ left: 'calc(16px + 80px + 12px + 17px)' }}
                        aria-hidden="true"
                    />

                    <div className="flex flex-col gap-4">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-3">
                                {item.isFirstOfRound && item.round !== null && (
                                    <RoundHeader
                                        round={item.round}
                                        phase={item.entry.phase || state.currentPhase}
                                    />
                                )}
                                <TurnRow item={item} />
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                </div>
            </div>

            {showJumpToLast && (
                <Button
                    id="jumpToLastBtn"
                    variant="primary"
                    size="sm"
                    onClick={jumpToLast}
                    className="absolute bottom-4 right-4 shadow-lg"
                >
                    Move to last ↓
                </Button>
            )}
        </div>
    );
}
