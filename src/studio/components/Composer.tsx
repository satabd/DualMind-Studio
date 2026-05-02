import { useEffect, useRef, useState } from 'react';
import { useWorkshopStore } from '../store/workshop.js';
import { pauseBrainstorm, resumeBrainstorm } from '../lib/extension.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/card.js';

// Mirrors the simple wrapper used in the legacy studio (`[CRITICAL OVERRIDE] …`)
// so the user sees a faithful preview of how their note will be folded into the
// next agent prompt by the orchestrator.
function buildModeratorWrapperPreview(text: string): string {
    if (!text) return 'Your note will be wrapped as moderator feedback before the next agent turn.';
    return `[CRITICAL OVERRIDE] ${text}`;
}

type ComposerState = 'idle' | 'paused' | 'escalation';

export function Composer() {
    const { state, refresh } = useWorkshopStore();
    const [draft, setDraft] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const composerState: ComposerState = state.awaitingHumanDecision
        ? 'escalation'
        : state.isPaused
            ? 'paused'
            : 'idle';

    // Ctrl+Period (or Cmd+Period) pauses the loop and focuses the composer —
    // the same hotkey the legacy studio used.
    useEffect(() => {
        const onKey = async (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '.') {
                e.preventDefault();
                if (state.active && !state.isPaused) {
                    await pauseBrainstorm();
                    await refresh();
                }
                textareaRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state.active, state.isPaused, refresh]);

    const handlePause = async () => {
        await pauseBrainstorm();
        await refresh();
        textareaRef.current?.focus();
    };

    const handleResumeSilent = async () => {
        await resumeBrainstorm('');
        setDraft('');
        await refresh();
    };

    const handleResumeWithFeedback = async () => {
        const text = draft.trim();
        if (!text) return;
        await resumeBrainstorm(text);
        setDraft('');
        await refresh();
    };

    const ctaLabel: Record<ComposerState, string> = {
        idle: 'Pause loop & comment',
        paused: 'Resume with comment',
        escalation: 'Resolve escalation'
    };

    return (
        <Card id="composerCard">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <CardTitle>Moderator Composer</CardTitle>
                    <Badge
                        variant={
                            composerState === 'escalation' ? 'escalation'
                            : composerState === 'paused' ? 'paused'
                            : 'idle'
                        }
                        size="sm"
                    >
                        {composerState}
                    </Badge>
                </div>
                <span className="text-xs text-fg-subtle font-mono">
                    Ctrl+Period to pause &amp; focus
                </span>
            </CardHeader>
            <CardBody>
                <textarea
                    ref={textareaRef}
                    id="composerTextarea"
                    rows={4}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder="Add steering, constraints, or a decision. Then resume."
                    className="w-full rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-fg resize-y focus:outline-none focus:shadow-focus focus:border-accent"
                    dir="auto"
                />
                <div className="rounded-md border border-dashed border-border bg-surface-muted px-3 py-2 text-xs text-fg-muted">
                    <div className="text-[10px] uppercase font-mono mb-1">Next-turn wrapper preview</div>
                    <div dir="auto">{buildModeratorWrapperPreview(draft.trim())}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {composerState === 'idle' && (
                        <Button variant="secondary" size="sm" onClick={handlePause}>
                            Pause loop
                        </Button>
                    )}
                    {(composerState === 'paused' || composerState === 'escalation') && (
                        <>
                            <Button variant="ghost" size="sm" onClick={handleResumeSilent}>
                                Resume silent
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleResumeWithFeedback}
                                disabled={!draft.trim()}
                            >
                                {ctaLabel[composerState]}
                            </Button>
                        </>
                    )}
                </div>
            </CardBody>
        </Card>
    );
}
