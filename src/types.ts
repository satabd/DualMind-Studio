export type AgentName = 'User' | 'Gemini' | 'ChatGPT' | 'System';
export type AgentSpeaker = 'Gemini' | 'ChatGPT';
export type SessionMode = "PING_PONG" | "DISCUSSION";
export type SessionPhase = "DIVERGE" | "CONVERGE" | "FINALIZE";
export type TurnIntent =
    | "expand"
    | "critique"
    | "verify"
    | "combine"
    | "narrow"
    | "conclude"
    | "escalate"
    | "synthesize"
    | "moderate";
export type RepairStatus = "clean" | "repaired" | "regenerated" | "forced";
export type FinaleType = "executive" | "product" | "roadmap" | "risks" | "decision";

export interface TranscriptEntry {
    agent: AgentName;
    text: string;
    timestamp?: number;
    intent?: TurnIntent;
    phase?: SessionPhase;
    repairStatus?: RepairStatus;
    checkpointTag?: string | null;
}

export interface EscalationPayload {
    reason: string;
    decision_needed: string;
    options: string[];
    recommended_option: string;
    next_step_after_decision: string;
}

export interface ModeratorDecision {
    timestamp: number;
    feedback: string;
    linkedCheckpointId: string | null;
    linkedTurn: number;
}

export interface SessionFraming {
    objective: string;
    constraints: string[];
    successCriteria: string[];
}

export interface SessionArtifacts {
    highlights: string[];
    ideas: string[];
    risks: string[];
    questions: string[];
    decisions: string[];
    synthesis: string;
}

export interface SessionCheckpoint {
    id: string;
    turn: number;
    phase: SessionPhase;
    label: string;
    createdAt: number;
    transcriptCount: number;
    promptSnapshot: string;
    summary: string;
    artifactSnapshot: SessionArtifacts;
}

export interface BrainstormSession {
    id: string;
    topic: string;
    mode: SessionMode;
    role: string;
    firstSpeaker?: AgentSpeaker;
    timestamp: number;
    transcript: TranscriptEntry[];
    escalations?: EscalationPayload[];
    framing?: SessionFraming;
    checkpoints?: SessionCheckpoint[];
    artifacts?: SessionArtifacts;
    moderatorDecisions?: ModeratorDecision[];
    finalOutputs?: Partial<Record<FinaleType, string>>;
    parentSessionId?: string | null;
    branchLabel?: string | null;
    branchOriginTurn?: number | null;
}

export interface BrainstormState {
    active: boolean;
    sessionId: string | null;
    prompt: string;
    mode: SessionMode;
    role: string;
    firstSpeaker: AgentSpeaker;
    customGeminiPrompt?: string;
    customChatGPTPrompt?: string;
    rounds: number;
    currentRound: number;
    geminiTabId: number | null;
    chatGPTTabId: number | null;
    statusLog: string[];
    isPaused: boolean;
    humanFeedback: string | null;
    awaitingHumanDecision: boolean;
    lastSpeaker: "Gemini" | "ChatGPT" | null;
    lastEscalation: EscalationPayload | null;
    resumeContext: string | null;
    discussionTurnSinceCheckpoint: number;
    currentPhase: SessionPhase;
    currentIntent: TurnIntent;
    activeCheckpointId: string | null;
    lastRepairStatus: RepairStatus | null;
}

export interface StudioProfile {
    id: string;
    name: string;
    mode: SessionMode;
    role: string;
    firstSpeaker: AgentSpeaker;
    rounds: number;
    topic: string;
    customGeminiPrompt?: string;
    customChatGPTPrompt?: string;
}
