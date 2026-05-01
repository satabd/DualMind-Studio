import { BrainstormSession, BrainstormState, TranscriptEntry } from './types.js';
import { sendRuntimeMessage } from './extensionApi.js';

const idleState: BrainstormState = {
    active: false,
    sessionId: null,
    prompt: "",
    mode: "PING_PONG",
    role: "CRITIC",
    firstSpeaker: "Gemini",
    rounds: 3,
    currentRound: 0,
    geminiTabId: null,
    chatGPTTabId: null,
    statusLog: [],
    isPaused: false,
    humanFeedback: null,
    awaitingHumanDecision: false,
    lastSpeaker: null,
    lastEscalation: null,
    resumeContext: null,
    discussionTurnSinceCheckpoint: 0,
    currentPhase: "DIVERGE",
    currentIntent: "expand",
    activeCheckpointId: null,
    lastRepairStatus: null
};

const ELEMENTS = {
    stateBadge: document.getElementById('stateBadge') as HTMLElement,
    refreshWorkshopBtn: document.getElementById('refreshWorkshopBtn') as HTMLButtonElement,
    sessionModeBadge: document.getElementById('sessionModeBadge') as HTMLElement,
    sessionSummary: document.getElementById('sessionSummary') as HTMLElement,
    memoryCountBadge: document.getElementById('memoryCountBadge') as HTMLElement,
    memoryList: document.getElementById('memoryList') as HTMLElement,
    checkpointCountBadge: document.getElementById('checkpointCountBadge') as HTMLElement,
    checkpointList: document.getElementById('checkpointList') as HTMLElement,
    floorSubtitle: document.getElementById('floorSubtitle') as HTMLElement,
    sharedStream: document.getElementById('sharedStream') as HTMLElement,
    agentABadge: document.getElementById('agentABadge') as HTMLElement,
    agentBBadge: document.getElementById('agentBBadge') as HTMLElement,
    agentAColumn: document.getElementById('agentAColumn') as HTMLElement,
    agentBColumn: document.getElementById('agentBColumn') as HTMLElement,
    pauseStateBadge: document.getElementById('pauseStateBadge') as HTMLElement,
    pauseLoopBtn: document.getElementById('pauseLoopBtn') as HTMLButtonElement,
    resumeSilentBtn: document.getElementById('resumeSilentBtn') as HTMLButtonElement,
    studioInterventionComposer: document.getElementById('studioInterventionComposer') as HTMLTextAreaElement,
    composerPreview: document.getElementById('composerPreview') as HTMLElement,
    resumeWithCommentBtn: document.getElementById('resumeWithCommentBtn') as HTMLButtonElement,
    escalationPanel: document.getElementById('escalationPanel') as HTMLElement,
    escalationContent: document.getElementById('escalationContent') as HTMLElement
};

let currentState: BrainstormState = idleState;
let currentSession: BrainstormSession | null = null;
let refreshToken = 0;
let pollHandle: number | null = null;

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getSeatForEntry(entry: TranscriptEntry, agentTurnIndex: number, firstSpeaker: string) {
    if (entry.agent !== "Gemini" && entry.agent !== "ChatGPT") return null;
    const roundIndex = Math.floor(agentTurnIndex / 2) + 1;
    const roundFirst = roundIndex % 2 === 1
        ? firstSpeaker
        : (firstSpeaker === "Gemini" ? "ChatGPT" : "Gemini");
    return entry.agent === roundFirst ? "Agent A" : "Agent B";
}

function getTransportForSeat(seat: "Agent A" | "Agent B", round: number, firstSpeaker: string) {
    const roundFirst = round % 2 === 1
        ? firstSpeaker
        : (firstSpeaker === "Gemini" ? "ChatGPT" : "Gemini");
    if (seat === "Agent A") return roundFirst;
    return roundFirst === "Gemini" ? "ChatGPT" : "Gemini";
}

function renderState() {
    const label = currentState.active
        ? currentState.isPaused ? "Paused" : "Running"
        : "Idle";
    ELEMENTS.stateBadge.textContent = label;
    ELEMENTS.stateBadge.className = `state-badge ${currentState.active ? currentState.isPaused ? 'paused' : 'running' : ''}`;
    ELEMENTS.pauseStateBadge.textContent = currentState.isPaused ? "Paused" : "Ready";
    ELEMENTS.pauseLoopBtn.disabled = !currentState.active || currentState.isPaused;
    ELEMENTS.resumeSilentBtn.disabled = !currentState.active || !currentState.isPaused;
    ELEMENTS.resumeWithCommentBtn.disabled = !currentState.active || !currentState.isPaused;
}

function renderSessionSummary() {
    const session = currentSession;
    ELEMENTS.sessionModeBadge.textContent = currentState.mode || "-";
    if (!session) {
        ELEMENTS.sessionSummary.textContent = currentState.sessionId
            ? "Waiting for session data..."
            : "No active session. Start a run from the side panel, then return here.";
        ELEMENTS.floorSubtitle.textContent = "Agent A and Agent B turns appear by reasoning seat.";
        return;
    }

    ELEMENTS.sessionSummary.innerHTML = [
        `<strong>${escapeHtml(session.topic)}</strong>`,
        `<span>Role: ${escapeHtml(session.role)} · Rounds: ${currentState.currentRound}/${currentState.rounds}</span>`,
        `<span>Phase: ${escapeHtml(currentState.currentPhase)} · Intent: ${escapeHtml(currentState.currentIntent)}</span>`
    ].join('<br>');
    ELEMENTS.floorSubtitle.textContent = `${session.mode} · ${session.transcript.length} transcript entries`;
}

function renderMemory() {
    const entries = currentSession?.memory?.entries || [];
    ELEMENTS.memoryCountBadge.textContent = String(entries.length);
    if (!entries.length) {
        ELEMENTS.memoryList.innerHTML = '<div class="muted">Memory entries appear after checkpoints or moderator decisions.</div>';
        return;
    }
    ELEMENTS.memoryList.innerHTML = entries.map(entry => `
        <div class="list-card">
            <strong>${escapeHtml(entry.kind)}</strong>
            <div>${escapeHtml(entry.text)}</div>
        </div>
    `).join('');
}

function renderCheckpoints() {
    const checkpoints = currentSession?.checkpoints || [];
    ELEMENTS.checkpointCountBadge.textContent = String(checkpoints.length);
    if (!checkpoints.length) {
        ELEMENTS.checkpointList.innerHTML = '<div class="muted">Checkpoints will appear as the run progresses.</div>';
        return;
    }
    ELEMENTS.checkpointList.innerHTML = checkpoints.slice().reverse().map(checkpoint => `
        <div class="list-card">
            <strong>${escapeHtml(checkpoint.label)}</strong>
            <div class="muted">Turn ${checkpoint.turn} · ${escapeHtml(checkpoint.phase)}</div>
            <div>${escapeHtml(checkpoint.summary || checkpoint.artifactSnapshot?.synthesis || "")}</div>
        </div>
    `).join('');
}

function renderTranscript() {
    const session = currentSession;
    ELEMENTS.agentAColumn.innerHTML = '';
    ELEMENTS.agentBColumn.innerHTML = '';
    ELEMENTS.sharedStream.innerHTML = '';

    const firstSpeaker = session?.firstSpeaker || currentState.firstSpeaker || "Gemini";
    const currentRound = Math.max(1, currentState.currentRound || 1);
    ELEMENTS.agentABadge.textContent = `Transport ${getTransportForSeat("Agent A", currentRound, firstSpeaker)}`;
    ELEMENTS.agentBBadge.textContent = `Transport ${getTransportForSeat("Agent B", currentRound, firstSpeaker)}`;

    if (!session?.transcript.length) {
        ELEMENTS.agentAColumn.innerHTML = '<div class="muted">No Agent A turns yet.</div>';
        ELEMENTS.agentBColumn.innerHTML = '<div class="muted">No Agent B turns yet.</div>';
        return;
    }

    let agentTurnIndex = 0;
    session.transcript.forEach((entry) => {
        const seat = getSeatForEntry(entry, agentTurnIndex, firstSpeaker);
        if (entry.agent === "Gemini" || entry.agent === "ChatGPT") agentTurnIndex++;
        const html = `
            <div class="turn-card">
                <div class="turn-meta">
                    <strong>${escapeHtml(entry.agent)}</strong>
                    <span class="mini-badge">${escapeHtml(entry.phase || currentState.currentPhase)} · ${escapeHtml(entry.intent || "turn")}</span>
                </div>
                <div class="turn-body">${escapeHtml(entry.text)}</div>
                ${entry.repairStatus ? `<div class="muted">Repair: ${escapeHtml(entry.repairStatus)}</div>` : ''}
            </div>
        `;
        if (seat === "Agent A") {
            ELEMENTS.agentAColumn.insertAdjacentHTML('beforeend', html);
        } else if (seat === "Agent B") {
            ELEMENTS.agentBColumn.insertAdjacentHTML('beforeend', html);
        } else {
            ELEMENTS.sharedStream.insertAdjacentHTML('beforeend', `<div class="shared-card">${html}</div>`);
        }
    });
}

function renderEscalation() {
    const escalation = currentState.lastEscalation;
    if (!currentState.awaitingHumanDecision || !escalation) {
        ELEMENTS.escalationContent.textContent = "No escalation waiting.";
        return;
    }
    ELEMENTS.escalationContent.innerHTML = `
        <div><strong>Reason:</strong> ${escapeHtml(escalation.reason)}</div>
        <div><strong>Decision needed:</strong> ${escapeHtml(escalation.decision_needed)}</div>
        <div><strong>Recommended:</strong> ${escapeHtml(escalation.recommended_option)}</div>
    `;
}

function renderComposerPreview() {
    const text = ELEMENTS.studioInterventionComposer.value.trim();
    ELEMENTS.composerPreview.textContent = text
        ? `[CRITICAL OVERRIDE] ${text}`
        : "Your note will be wrapped as moderator feedback before the next agent turn.";
}

function renderAll() {
    renderState();
    renderSessionSummary();
    renderMemory();
    renderCheckpoints();
    renderTranscript();
    renderEscalation();
    renderComposerPreview();
}

async function refreshWorkshop() {
    const token = ++refreshToken;
    const state = await sendRuntimeMessage<BrainstormState>({ action: "getBrainstormState" }, idleState);
    if (token !== refreshToken) return;
    currentState = state;
    currentSession = state.sessionId
        ? await sendRuntimeMessage<BrainstormSession | null>({ action: "getSession", id: state.sessionId }, null)
        : null;
    if (token !== refreshToken) return;
    renderAll();
}

function startPolling() {
    if (pollHandle !== null) window.clearInterval(pollHandle);
    pollHandle = window.setInterval(() => {
        if (document.visibilityState === 'visible') refreshWorkshop();
    }, 2000);
}

async function pauseLoop() {
    await sendRuntimeMessage({ action: "pauseBrainstorm" }, null);
    await refreshWorkshop();
    ELEMENTS.studioInterventionComposer.focus();
}

async function resumeLoop(feedback: string) {
    await sendRuntimeMessage({ action: "resumeBrainstorm", feedback }, null);
    ELEMENTS.studioInterventionComposer.value = "";
    await refreshWorkshop();
}

document.addEventListener('DOMContentLoaded', () => {
    ELEMENTS.refreshWorkshopBtn.addEventListener('click', refreshWorkshop);
    ELEMENTS.pauseLoopBtn.addEventListener('click', pauseLoop);
    ELEMENTS.resumeSilentBtn.addEventListener('click', () => resumeLoop(""));
    ELEMENTS.resumeWithCommentBtn.addEventListener('click', () => {
        const text = ELEMENTS.studioInterventionComposer.value.trim();
        if (!text) return;
        resumeLoop(text);
    });
    ELEMENTS.studioInterventionComposer.addEventListener('input', renderComposerPreview);
    document.addEventListener('keydown', event => {
        // Ctrl+Period pauses the loop and focuses the intervention composer.
        if (event.ctrlKey && event.key === '.') {
            event.preventDefault();
            pauseLoop();
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refreshWorkshop();
    });
    refreshWorkshop();
    startPolling();
});
