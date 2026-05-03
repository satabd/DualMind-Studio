export type AgentName = 'User' | 'Gemini' | 'ChatGPT' | 'System';
export type AgentSpeaker = 'Gemini' | 'ChatGPT';
export type AgentSeat = "Agent A" | "Agent B";
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
export type MemoryEntryKind = "fact" | "decision" | "question" | "rejected_option" | "risk" | "assumption";
export type MemoryEntrySource = "checkpoint" | "moderator" | "agent" | "system";

export interface MemoryEntry {
    id: string;
    kind: MemoryEntryKind;
    text: string;
    createdAt: number;
    source: MemoryEntrySource;
    tags?: string[];
}

export interface SessionMemory {
    entries: MemoryEntry[];
    prunedEntryKeys?: string[];
}

export interface AgentIdentity {
    id: string;
    label: string;
    role: string;
    responsibility: string;
}

export interface AgentOperatingStyle {
    id: string;
    label: string;
    principles: string[];
}

export interface PromptProtocol {
    label: string;
    rules: string[];
    escalationFormat?: string;
}

export interface PromptSessionContext {
    speaker: AgentSpeaker;
    seat: AgentSeat;
    counterpart: AgentSeat;
    phase: SessionPhase;
    intent: TurnIntent;
    rootTopic?: string;
    objective?: string;
    constraints?: string[];
    successCriteria?: string[];
    latestInput: string;
}

export interface PromptTurnTask {
    move: TurnIntent;
    instructions: string[];
}

export interface PromptBlueprint {
    protocol: PromptProtocol;
    identity: AgentIdentity;
    style: AgentOperatingStyle;
    roleDirective?: {
        label: string;
        responsibility: string;
        instructions: string[];
    };
    memory?: SessionMemory;
    context: PromptSessionContext;
    task: PromptTurnTask;
}

export interface TranscriptEntry {
    agent: AgentName;
    text: string;
    timestamp?: number;
    intent?: TurnIntent;
    phase?: SessionPhase;
    repairStatus?: RepairStatus;
    checkpointTag?: string | null;
    // EN: Persisted seat ("Agent A" / "Agent B") so the workshop never has to
    //     recompute it from the turn index. System fallback turns inherit the
    //     seat of the agent whose output failed repair.
    // AR: حفظ المقعد ("Agent A" / "Agent B") مباشرة على الدور حتى لا تعيد
    //     الواجهة حسابه من ترتيب الأدوار.
    seat?: AgentSeat;
    // EN: The exact memory entries that were folded into this turn's prompt.
    //     Lets the UI display "memory sent to agents this turn" from
    //     authoritative state instead of recomputing.
    // AR: مدخلات الذاكرة التي أُدرجت فعلياً في مطالبة هذا الدور — حتى
    //     تعرض الواجهة ما أُرسل بالضبط بدلاً من إعادة الحساب.
    promptMemorySnapshot?: MemoryEntry[];
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
    memory?: SessionMemory;
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
