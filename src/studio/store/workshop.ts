import { create } from 'zustand';
import type { BrainstormSession, BrainstormState } from '../../types.js';
import { fetchAllSessions, fetchBrainstormState, fetchSession } from '../lib/extension.js';

const idleState: BrainstormState = {
    active: false,
    sessionId: null,
    prompt: '',
    mode: 'PING_PONG',
    role: 'CRITIC',
    firstSpeaker: 'Gemini',
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
    currentPhase: 'DIVERGE',
    currentIntent: 'expand',
    activeCheckpointId: null,
    lastRepairStatus: null
};

export type ActiveTab = 'sessions' | 'memory' | 'decisions' | 'agents';

interface WorkshopStore {
    state: BrainstormState;
    sessions: BrainstormSession[];
    selectedSession: BrainstormSession | null;
    selectedSessionId: string | null;
    activeTab: ActiveTab;
    refreshToken: number;
    lastRefresh: number;
    setActiveTab: (tab: ActiveTab) => void;
    selectSession: (id: string | null) => Promise<void>;
    refresh: () => Promise<void>;
}

export const useWorkshopStore = create<WorkshopStore>((set, get) => ({
    state: idleState,
    sessions: [],
    selectedSession: null,
    selectedSessionId: null,
    activeTab: 'sessions',
    refreshToken: 0,
    lastRefresh: 0,

    setActiveTab: tab => set({ activeTab: tab }),

    selectSession: async id => {
        if (!id) {
            set({ selectedSessionId: null, selectedSession: null });
            return;
        }
        set({ selectedSessionId: id });
        const session = await fetchSession(id);
        // Only commit if user hasn't selected a different session in the meantime.
        if (get().selectedSessionId !== id) return;
        set({ selectedSession: session });
    },

    refresh: async () => {
        // Token guard: a slow getAllSessions response from a previous tick
        // must not clobber a newer refresh's state.
        const token = get().refreshToken + 1;
        const selectedAtStart = get().selectedSessionId;
        set({ refreshToken: token });

        const [state, sessions] = await Promise.all([
            fetchBrainstormState(idleState),
            fetchAllSessions()
        ]);
        if (get().refreshToken !== token) return;

        // Auto-select the active session when nothing is selected; fall back to
        // the most recent session in the list.
        let nextSelectedId = get().selectedSessionId;
        if (!nextSelectedId && state.sessionId) nextSelectedId = state.sessionId;
        if (!nextSelectedId && sessions.length) nextSelectedId = sessions[0].id;

        let selectedSession: BrainstormSession | null = null;
        if (nextSelectedId) {
            selectedSession = nextSelectedId === state.sessionId
                ? await fetchSession(nextSelectedId)
                : sessions.find(s => s.id === nextSelectedId) || await fetchSession(nextSelectedId);
        }
        if (get().refreshToken !== token) return;

        // If the user picked a different session while we were fetching, keep
        // their selection and just update state/sessions.
        const selectedNow = get().selectedSessionId;
        if (selectedNow !== selectedAtStart && selectedNow !== nextSelectedId) {
            set({ state, sessions, lastRefresh: Date.now() });
            return;
        }

        set({
            state,
            sessions,
            selectedSessionId: nextSelectedId,
            selectedSession,
            lastRefresh: Date.now()
        });
    }
}));
