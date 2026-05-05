import {
    createSession,
    updateSession,
    getAllSessions,
    getSession,
    deleteSession,
    clearAllSessions,
    appendEscalation,
    appendCheckpoint,
    saveArtifacts,
    saveMemory,
    appendModeratorDecision,
    saveFinalOutput,
    createBranchSession
} from './db.js';
import {
    AgentSeat,
    AgentSpeaker,
    BrainstormSession,
    BrainstormState,
    EscalationPayload,
    SessionMemory,
    SessionArtifacts,
    SessionCheckpoint,
    SessionFraming,
    SessionPhase,
    TurnIntent,
    RepairStatus,
    FinaleType,
    TranscriptEntry,
    ModeratorDecision
} from './types.js';
import {
    buildDiscussionBlueprint,
    buildPingPongBlueprint,
    renderPromptBlueprint
} from './promptBlueprint.js';
import {
    createEmptySessionMemory,
    getMemoryEntryKey,
    memoryEntriesFromCheckpoint,
    memoryEntryFromModeratorDecision,
    mergeSessionMemory,
    selectPromptMemory
} from './sessionMemory.js';

const DEFAULT_STATE: BrainstormState = {
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

let brainstormState: BrainstormState = { ...DEFAULT_STATE };
let isRestoring = true;
let activeRunId: string | null = null;
let saveStateTimer: ReturnType<typeof setTimeout> | null = null;
const DISCUSSION_CHECKPOINT_TURNS = 3;
const SAVE_STATE_DEBOUNCE_MS = 750;

function writeState() {
    chrome.storage.local.set({ brainstormState });
}

function saveState(options?: { immediate?: boolean }) {
    if (options?.immediate) {
        if (saveStateTimer !== null) {
            clearTimeout(saveStateTimer);
            saveStateTimer = null;
        }
        writeState();
        return;
    }

    if (saveStateTimer !== null) clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(() => {
        saveStateTimer = null;
        writeState();
    }, SAVE_STATE_DEBOUNCE_MS);
}

async function loadState() {
    return new Promise<void>(resolve => {
        chrome.storage.local.get(['brainstormState'], (result) => {
            if (result.brainstormState) {
                brainstormState = { ...DEFAULT_STATE, ...result.brainstormState, active: false };
                saveState({ immediate: true });
            }
            isRestoring = false;
            resolve();
        });
    });
}

loadState();

async function configureSidePanelBehavior() {
    try {
        await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    } catch (error) {
        console.warn("Unable to set side panel action behavior.", error);
    }
}

configureSidePanelBehavior();
chrome.runtime.onInstalled.addListener(configureSidePanelBehavior);
chrome.runtime.onStartup.addListener(configureSidePanelBehavior);

chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (tab.windowId === undefined) return;
        await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
        console.error("Unable to open DualMind Studio side panel.", error);
    }
});

function log(msg: string, type: 'info' | 'error' | 'system' = 'info') {
    const entry = `[${type === 'info' ? 'Info' : type === 'error' ? 'Error' : 'System'}] ${msg}`;
    if (brainstormState.statusLog.length > 80) brainstormState.statusLog.shift();
    brainstormState.statusLog.push(entry);
    console.log(entry);
    saveState();
}

function beginRun(): string | null {
    if (activeRunId || brainstormState.active) return null;
    activeRunId = crypto.randomUUID();
    return activeRunId;
}

function finishRun(runId: string) {
    if (activeRunId === runId) activeRunId = null;
}

function sendMessage(tabId: number, message: any): Promise<any> {
    return new Promise(resolve => {
        chrome.tabs.sendMessage(tabId, message, (resp) => {
            if (chrome.runtime.lastError) resolve(null);
            else resolve(resp);
        });
    });
}

async function ensureInjected(tabId: number) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
        });
    } catch { }
}

// Legacy PING_PONG prompt path — per-role narrative templates. As of issue
// #8, the rendered narrative from this table is wrapped in the layered
// blueprint (Identity / Style / Memory / Output Contract) by
// buildPingPongBlueprint — it is no longer the entire prompt. Future work
// can fold these directly into role directives if cleaner per-role parity
// is needed.
const ROLE_PROMPTS: Record<string, {
    geminiInit: (topic: string, cp?: string) => string;
    chatGPTInit: (topic: string, cp?: string) => string;
    geminiLoop: (feedback: string, cp?: string) => string;
    chatGPTLoop: (proposal: string, cp?: string) => string;
}> = {
    CRITIC: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nPlease provide a comprehensive, novel, and detailed exploration of this topic.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nPlease provide a comprehensive, novel, and detailed exploration of this topic.`,
        geminiLoop: (feedback) => `Here is feedback from a Reviewer:\n---\n${feedback}\n---\n\nPlease refine your ideas based on this critique. Output the updated version.`,
        chatGPTLoop: (proposal) => `You are a Critical Reviewer.\n\nProposal:\n---\n${proposal}\n---\n\nCritique this. Find flaws, missing edge cases, or security risks.`
    },
    EXPANDER: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nProvide an initial creative concept for this topic. Keep it open-ended.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nProvide an initial creative concept for this topic. Keep it open-ended.`,
        geminiLoop: (addition) => `Your collaborator added the following ideas:\n---\n${addition}\n---\n\nUsing the 'Yes, And...' principle, accept their additions and expand the concept further in a new direction.`,
        chatGPTLoop: (concept) => `Your collaborator proposed this concept:\n---\n${concept}\n---\n\nUsing the 'Yes, And...' principle, accept this concept and add new, highly creative dimensions or features to it without criticizing.`
    },
    ARCHITECT: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a Visionary Product Leader. Pitch a bold, high-level vision for this topic, focusing on user experience, value, and disruption.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nYou are a Systems Architect opening the session. Frame a realistic architecture direction, key constraints, and the most viable implementation path for this topic.`,
        geminiLoop: (feedback) => `The Systems Architect responded with this feasibility analysis:\n---\n${feedback}\n---\n\nDefend your vision or adapt it based on these constraints, maintaining the visionary perspective.`,
        chatGPTLoop: (proposal) => `You are a Systems Architect. The Visionary just proposed:\n---\n${proposal}\n---\n\nAnalyze the technical feasibility, potential bottlenecks, system requirements, and suggest realistic architectural approaches to build this.`
    },
    DEV_ADVOCATE: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nPropose a robust, complete solution or thesis for this topic. Be definitive.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nYou are opening as the Devil's Advocate. State the strongest skeptical thesis or failure case this topic must overcome before any solution is credible.`,
        geminiLoop: (critique) => `The Devil's Advocate attacked your proposal:\n---\n${critique}\n---\n\nRebut their attacks, patch the vulnerabilities in your logic, and present a stronger proposal.`,
        chatGPTLoop: (proposal) => `You are the Devil's Advocate. Your job is to destroy this proposal:\n---\n${proposal}\n---\n\nFind every logical fallacy, market weakness, performance issue, or security hole. Do not hold back.`
    },
    FIRST_PRINCIPLES: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are the Deconstructor. Break this topic down into its absolute, undeniable fundamental truths and physical/logical constraints. Strip away all industry assumptions.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nYou are the Synthesizer opening the session. Propose a novel solution path, then explicitly identify which assumptions still need first-principles scrutiny.`,
        geminiLoop: (synthesis) => `The Synthesizer built this solution from your principles:\n---\n${synthesis}\n---\n\nDeconstruct their solution. Are they relying on any hidden assumptions? Break it down again.`,
        chatGPTLoop: (truths) => `Here are the fundamental truths of the problem:\n---\n${truths}\n---\n\nYou are the Synthesizer. Build a completely novel, unconventional solution from the ground up using ONLY these fundamental truths.`
    },
    INTERVIEWER: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a world-class Domain Expert explaining this topic at a high level.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nYou are a probing Journalist opening the session. Ask one precise, high-signal question that would force a domain expert to reveal the most important hidden assumption or hard detail.`,
        geminiLoop: (question) => `The Interviewer asks:\n---\n${question}\n---\n\nProvide a deeply nuanced, expert answer.`,
        chatGPTLoop: (answer) => `The Expert says:\n---\n${answer}\n---\n\nYou are a probing Journalist. Ask one highly specific, clarifying follow-up question to force them to go deeper or explain hard jargon.`
    },
    FIVE_WHYS: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nState the core problem or standard solution associated with this topic.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nOpen the session by stating the most obvious symptom or surface-level explanation, then ask why it exists.`,
        geminiLoop: (why) => `Response:\n---\n${why}\n---\n\nAnswer the "Why" to drill deeper into the root cause.`,
        chatGPTLoop: (statement) => `Statement:\n---\n${statement}\n---\n\nAsk "Why is that the case?" or "Why does that happen?" to drill down into the root cause.`
    },
    HISTORIAN_FUTURIST: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nYou are a Historian. Analyze this topic based on historical precedents, past failures, and established data.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nYou are a Futurist opening the session. Project this topic forward and define the most plausible long-range shifts before history pushes back.`,
        geminiLoop: (future) => `The Futurist predicts:\n---\n${future}\n---\n\nCheck their prediction against history. What historical cycles or human behaviors might disrupt their sci-fi scenario?`,
        chatGPTLoop: (history) => `The Historian notes:\n---\n${history}\n---\n\nYou are a Futurist. Project this 50 years into the future. How will emerging tech and societal shifts evolve this past the historical constraints?`
    },
    ELI5: {
        geminiInit: (topic) => `Topic: "${topic}"\n\nProvide a highly complex, academic, and technically precise explanation of this topic.`,
        chatGPTInit: (topic) => `Topic: "${topic}"\n\nOpen with a simple explanation of this topic using plain language and one concrete metaphor.`,
        geminiLoop: (eli5) => `Here is the simplified ELI5 version:\n---\n${eli5}\n---\n\nCorrect any oversimplifications or lost nuances while keeping it accessible.`,
        chatGPTLoop: (academic) => `Academic Explanation:\n---\n${academic}\n---\n\nTranslate this into an "Explain Like I'm 5" (ELI5) version using simple metaphors.`
    },
    CUSTOM: {
        geminiInit: (topic, cp) => `${cp}\n\nHere is the initial topic:\n---\n${topic}\n---`,
        chatGPTInit: (topic, cp) => `${cp}\n\nHere is the initial topic:\n---\n${topic}\n---`,
        geminiLoop: (feedback, cp) => `${cp}\n\nHere is the latest input from the collaborator:\n---\n${feedback}\n---`,
        chatGPTLoop: (proposal, cp) => `${cp}\n\nHere is the latest input from the collaborator:\n---\n${proposal}\n---`
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getAllSessions") {
        getAllSessions().then(sendResponse).catch(() => sendResponse([]));
        return true;
    }
    if (request.action === "getSession") {
        getSession(request.id).then(session => sendResponse(session || null)).catch(() => sendResponse(null));
        return true;
    }
    if (request.action === "deleteSession") {
        deleteSession(request.id).then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
        return true;
    }
    if (request.action === "clearLocalData") {
        (async () => {
            await clearAllSessions();
            await chrome.storage.local.remove([
                'brainstormState',
                'uiConfig',
                'studioProfiles',
                'branchDraft',
                'transcriptData',
                'transcriptMeta'
            ]);
            brainstormState = { ...DEFAULT_STATE };
            saveState({ immediate: true });
            sendResponse({ success: true });
        })().catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "getBrainstormState") {
        sendResponse(brainstormState);
        return false;
    }
    if (request.action === "createBranchFromCheckpoint") {
        createBranchFromCheckpoint(request.sessionId, request.checkpointId, request.branchLabel).then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "clearSessionMemory") {
        clearSessionMemory(request.sessionId).then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "pruneSessionMemoryEntry") {
        pruneSessionMemoryEntry(request.sessionId, request.entryId).then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "generateFinale") {
        generateFinale(request.finaleType || "executive").then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "stopBrainstorm") {
        brainstormState.active = false;
        log("Stopped by user.", 'system');
        saveState({ immediate: true });
        sendResponse({ success: true });
        return true;
    }
    if (request.action === "startBrainstorm") {
        (async () => {
            if (isRestoring) await loadState();
            const { topic, rounds, role, mode, customGeminiPrompt, customChatGPTPrompt, geminiTabId, chatGPTTabId, firstSpeaker } = request;
            if (!geminiTabId || !chatGPTTabId) {
                sendResponse({ success: false, error: "Missing tab IDs." });
                return;
            }
            const runId = beginRun();
            if (!runId) {
                sendResponse({ success: false, error: "Run is already active." });
                return;
            }

            const sessionId = crypto.randomUUID();
            const framing = buildSessionFraming(topic, mode || "PING_PONG");
            const artifacts = buildArtifacts([], framing);
            brainstormState = {
                ...DEFAULT_STATE,
                active: true,
                sessionId,
                prompt: topic,
                mode: mode || "PING_PONG",
                role: role || "CRITIC",
                firstSpeaker: firstSpeaker === "ChatGPT" ? "ChatGPT" : "Gemini",
                customGeminiPrompt,
                customChatGPTPrompt,
                rounds: rounds || 3,
                geminiTabId,
                chatGPTTabId,
                currentPhase: "DIVERGE",
                currentIntent: inferIntent(role || "CRITIC", "DIVERGE", firstSpeaker === "ChatGPT" ? "ChatGPT" : "Gemini", mode || "PING_PONG", "Agent A")
            };
            log(`Starting studio session: ${rounds} rounds...`, 'system');
            saveState({ immediate: true });

            await createSession({
                id: sessionId,
                topic,
                mode: brainstormState.mode,
                role: brainstormState.role,
                firstSpeaker: brainstormState.firstSpeaker,
                timestamp: Date.now(),
                transcript: [{ agent: 'User', text: topic, timestamp: Date.now(), intent: "moderate", phase: "DIVERGE" }],
                framing,
                artifacts,
                memory: createEmptySessionMemory(),
                checkpoints: [],
                escalations: [],
                moderatorDecisions: [],
                finalOutputs: {},
                parentSessionId: null,
                branchLabel: null,
                branchOriginTurn: null
            }).catch((e: any) => log(`Failed to create DB session: ${e.message}`, 'error'));

            runBrainstormLoop(runId).catch(e => {
                log(`Loop fatal error: ${e.message}`, 'error');
                if (activeRunId === runId) {
                    brainstormState.active = false;
                    finishRun(runId);
                }
                saveState({ immediate: true });
            });

            sendResponse({ success: true });
        })();
        return true;
    }
    if (request.action === "continueBrainstorm") {
        (async () => {
            if (!brainstormState.geminiTabId || !brainstormState.chatGPTTabId) {
                sendResponse({ success: false, error: "Tab IDs missing. Start a new run instead." });
                return;
            }
            const runId = beginRun();
            if (!runId) {
                sendResponse({ success: false, error: "Run is already active." });
                return;
            }
            const additionalRounds = request.additionalRounds || 2;
            brainstormState.rounds += additionalRounds;
            brainstormState.active = true;
            log(`Continuing run for ${additionalRounds} more rounds...`, 'system');
            saveState({ immediate: true });
            runBrainstormLoop(runId).catch(e => {
                log(`Loop fatal error: ${e.message}`, 'error');
                if (activeRunId === runId) {
                    brainstormState.active = false;
                    finishRun(runId);
                }
                saveState({ immediate: true });
            });
            sendResponse({ success: true });
        })();
        return true;
    }
    if (request.action === "generateConclusion") {
        generateFinale("executive").then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
        return true;
    }
    if (request.action === "pauseBrainstorm") {
        if (!brainstormState.active) {
            sendResponse({ success: false, error: "Run is not active." });
            return;
        }
        brainstormState.isPaused = true;
        log("Human Intervention: Run paused. Waiting for input...", 'system');
        saveState({ immediate: true });
        sendResponse({ success: true });
        return true;
    }
    if (request.action === "resumeBrainstorm") {
        if (!brainstormState.active || !brainstormState.isPaused) {
            sendResponse({ success: false, error: "Run is not paused." });
            return;
        }
        brainstormState.isPaused = false;
        if (request.feedback) {
            log("Human Intervention: Feedback received. Resuming...", 'system');
            brainstormState.statusLog.push(`[System] Moderator: ${request.feedback}`);
            if (brainstormState.sessionId) {
                updateSession(brainstormState.sessionId, {
                    agent: 'System',
                    text: `[Moderator Intervention]\n${request.feedback}`,
                    timestamp: Date.now(),
                    intent: "moderate",
                    phase: brainstormState.currentPhase
                }).catch(() => { });
                const moderatorDecision: ModeratorDecision = {
                    timestamp: Date.now(),
                    feedback: request.feedback,
                    linkedCheckpointId: brainstormState.activeCheckpointId,
                    linkedTurn: brainstormState.currentRound
                };
                appendModeratorDecision(brainstormState.sessionId, moderatorDecision)
                    .then(() => appendSessionMemory(brainstormState.sessionId!, [memoryEntryFromModeratorDecision(moderatorDecision)]))
                    .catch(() => { });
            }
            if (brainstormState.awaitingHumanDecision) {
                brainstormState.resumeContext = request.feedback;
                brainstormState.awaitingHumanDecision = false;
                brainstormState.lastEscalation = null;
            } else {
                brainstormState.humanFeedback = request.feedback;
            }
        } else {
            log("Human Intervention: Run resumed without feedback.", 'system');
            brainstormState.awaitingHumanDecision = false;
            brainstormState.lastEscalation = null;
        }
        saveState({ immediate: true });
        sendResponse({ success: true });
        return true;
    }
    return false;
});

function buildSessionFraming(topic: string, mode: "PING_PONG" | "DISCUSSION"): SessionFraming {
    const clean = topic.trim();
    return {
        objective: clean.length > 120 ? clean.slice(0, 120) : clean,
        constraints: mode === "DISCUSSION"
            ? ["Address the other agent directly", "Mark weak claims as inference", "Escalate when blocked"]
            : ["Stay grounded in the user's topic", "Keep ideas actionable", "Iterate with contrast and refinement"],
        successCriteria: mode === "DISCUSSION"
            ? ["Reach a narrower conclusion", "Expose unsupported claims", "Pause only when human input is genuinely required"]
            : ["Generate multiple directions", "Surface tradeoffs", "End with stronger synthesis than the initial prompt"]
    };
}

function emptyArtifacts(): SessionArtifacts {
    return { highlights: [], ideas: [], risks: [], questions: [], decisions: [], synthesis: "" };
}

function dedupe(items: string[]) {
    return [...new Set(items.filter(Boolean))];
}

// EN: Skip structural noise so artifact buckets don't capture markdown
//     headings, lone bullets, or template fragments. The threshold matches
//     the memory-entry minimum so what we extract survives validation.
// AR: تجاهل الضوضاء البنيوية حتى لا تلتقط الأقسام عناوين Markdown أو
//     علامات نقطية فارغة أو قوالب جاهزة.
const ARTIFACT_LINE_NOISE = /^(?:#{1,6}\s|[-*]\s*$|\d+\.\s*$|>\s*$)/;
const ARTIFACT_LABEL_ONLY = /^[A-Za-z][A-Za-z _-]*:\s*$/;
const ARTIFACT_MIN_LENGTH = 20;

function meaningfulContent(line: string): string {
    return line.replace(/^[-*\d.]+\s*/, '').trim();
}

function isArtifactLineWorthKeeping(line: string): boolean {
    if (!line) return false;
    if (ARTIFACT_LINE_NOISE.test(line)) return false;
    if (ARTIFACT_LABEL_ONLY.test(line)) return false;
    if (meaningfulContent(line).length < ARTIFACT_MIN_LENGTH) return false;
    return true;
}

function buildArtifacts(transcript: TranscriptEntry[], framing?: SessionFraming): SessionArtifacts {
    const artifacts = emptyArtifacts();
    const assistantTurns = transcript.filter(entry => entry.agent === "Gemini" || entry.agent === "ChatGPT");
    assistantTurns.slice(-8).forEach(entry => {
        const lines = entry.text.split(/\n+/).map(line => line.trim()).filter(isArtifactLineWorthKeeping);
        if (lines[0]) artifacts.highlights.push(lines[0]);
        lines.forEach(line => {
            const lower = line.toLowerCase();
            if ((lower.includes("risk") || lower.includes("flaw") || lower.includes("danger")) && artifacts.risks.length < 6) artifacts.risks.push(line);
            if ((lower.includes("?") || lower.includes("unknown") || lower.includes("unresolved")) && artifacts.questions.length < 6) artifacts.questions.push(line);
            if ((lower.includes("should") || lower.includes("option") || lower.includes("proposal") || lower.includes("approach")) && artifacts.ideas.length < 8) artifacts.ideas.push(line);
            if ((lower.includes("conclude") || lower.includes("decision") || lower.includes("recommend")) && artifacts.decisions.length < 6) artifacts.decisions.push(line);
        });
    });
    artifacts.highlights = dedupe(artifacts.highlights).slice(0, 6);
    artifacts.ideas = dedupe(artifacts.ideas).slice(0, 8);
    artifacts.risks = dedupe(artifacts.risks).slice(0, 6);
    artifacts.questions = dedupe(artifacts.questions).slice(0, 6);
    artifacts.decisions = dedupe(artifacts.decisions).slice(0, 6);
    artifacts.synthesis = framing
        ? `Objective: ${framing.objective}. Current direction: ${artifacts.highlights[0] || "Session has started but no strong highlight was extracted yet."}`
        : (artifacts.highlights[0] || "No synthesis available yet.");
    return artifacts;
}

function getPhase(round: number, totalRounds: number): SessionPhase {
    if (round >= totalRounds) return "FINALIZE";
    if (round >= Math.max(2, Math.ceil(totalRounds * 0.66))) return "CONVERGE";
    return "DIVERGE";
}

function inferIntent(role: string, phase: SessionPhase, speaker: "Gemini" | "ChatGPT", mode: "PING_PONG" | "DISCUSSION", seat?: AgentSeat): TurnIntent {
    if (mode === "DISCUSSION") {
        if (phase === "FINALIZE") return "conclude";
        if (phase === "CONVERGE") return seat === "Agent A" ? "narrow" : "verify";
        if (role === "EXPANDER") return "expand";
        if (role === "FIRST_PRINCIPLES" || role === "FIVE_WHYS" || role === "INTERVIEWER") return "verify";
        if (role === "DEV_ADVOCATE" || role === "CRITIC") return seat === "Agent A" ? "combine" : "critique";
        return seat === "Agent A" ? "combine" : "verify";
    }
    if (phase === "FINALIZE") return "conclude";
    if (phase === "CONVERGE") return speaker === "Gemini" ? "combine" : "critique";
    const map: Record<string, TurnIntent> = {
        CRITIC: speaker === "Gemini" ? "combine" : "critique",
        EXPANDER: "expand",
        ARCHITECT: speaker === "Gemini" ? "combine" : "verify",
        DEV_ADVOCATE: speaker === "Gemini" ? "combine" : "critique",
        FIRST_PRINCIPLES: speaker === "Gemini" ? "verify" : "combine",
        INTERVIEWER: speaker === "Gemini" ? "combine" : "verify",
        FIVE_WHYS: "verify",
        HISTORIAN_FUTURIST: speaker === "Gemini" ? "verify" : "expand",
        ELI5: speaker === "Gemini" ? "combine" : "verify",
        CUSTOM: "combine"
    };
    return map[role] || "expand";
}

function getCheckpointInterval(mode: "PING_PONG" | "DISCUSSION", rounds = brainstormState.rounds) {
    const defaultInterval = mode === "DISCUSSION" ? 4 : 6;
    return Math.max(1, Math.min(defaultInterval, Math.floor(rounds / 3) || 1));
}

function hasAnyPhrase(text: string, phrases: string[]) {
    return phrases.some(phrase => text.includes(phrase));
}

function hasAnyWholeWord(text: string, words: string[]) {
    return words.some(word => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

function getDiscussionViolation(text: string): string | null {
    const lower = text.toLowerCase().trim();
    // Structural discussion guard: catch obvious user-facing or system-narration shapes without banning normal role language.
    if (/^(hello|hi|dear user|dear human|thanks|thank you|as an ai|as a language model)\b/i.test(lower)) {
        return "You opened with user-facing or assistant-persona framing. Speak only as the active agent seat to the counterpart seat.";
    }
    if (/(would you like|feel free to ask|happy to help)\b[^.?!]*[.?!]?\s*$/i.test(lower)) {
        return "You ended with user-facing offer language. Close with the agent-to-agent move instead.";
    }
    if (/\b(system prompt|hidden instruction|output contract|according to the instructions)\b/i.test(lower)) {
        return "You narrated runtime instructions. Apply them silently and output only the agent-to-agent work.";
    }
    if (/^(أستاذ ساطع|مرحب|شكرا|بصفتي ذكاء)/i.test(lower) || /(هل ترغب|يسعدني أن)\s*$/i.test(lower)) {
        return "You used user-facing or assistant-persona language. Speak only to your agent collaborator.";
    }
    // EN: Identity stability — catch translated seat labels ("العميل (أ)", "العميل ب", etc.) and human-addressing forms.
    // AR: ثبات الهوية — رصد ترجمة تسميات المقاعد ("العميل (أ)" مثلاً) وأي مخاطبة مباشرة للإنسان.
    if (/العميل\s*\(?\s*[أاب]\s*\)?/.test(text)) {
        return 'You translated the seat label. Use the exact labels "Agent A" and "Agent B" — do not translate them.';
    }
    if (/(حضرتك|صاحب السؤال)/.test(text)) {
        return "You addressed the human. Address the counterpart agent only.";
    }
    return null;
}

function parseEscalationBlock(text: string): EscalationPayload | null {
    const blockMatch = text.match(/\[ESCALATION_REQUIRED\]([\s\S]*?)\[\/ESCALATION_REQUIRED\]/i);
    if (!blockMatch) return null;
    const block = blockMatch[1];
    const payload: EscalationPayload = {
        reason: "",
        decision_needed: "",
        options: [],
        recommended_option: "",
        next_step_after_decision: ""
    };
    const extract = (key: string) => {
        const match = block.match(new RegExp(`${key}:\\s*(.*?)(?=\\n[a-z_]+:|$)`, 'is'));
        return match ? match[1].trim() : "";
    };
    payload.reason = extract('reason');
    payload.decision_needed = extract('decision_needed');
    payload.recommended_option = extract('recommended_option');
    payload.next_step_after_decision = extract('next_step_after_decision');
    const optionsMatch = block.match(/options:\s*((?:-\s+.*\n?)*)/i);
    if (optionsMatch?.[1]) payload.options = optionsMatch[1].split('\n').map(o => o.replace(/^-?\s*/, '').trim()).filter(Boolean);
    return payload.reason ? payload : null;
}

function buildDiscussionControlInstruction(counterpart: "Agent A" | "Agent B") {
    return `\n\n[DISCUSSION CONTROL - HIDDEN]\nThe discussion has reached a convergence checkpoint.\nAddress ${counterpart} directly.\nDo not expand scope.\nChoose exactly one action for this turn:\n- conclude the current sub-issue,\n- mark a claim unsupported,\n- mark a claim as inference only,\n- request verification on one concrete point,\n- emit an [ESCALATION_REQUIRED] block.\nIf you conclude, use this compact structure:\nEstablished Facts:\n- ...\nUnsupported Claims:\n- ...\nUnresolved Items:\n- ...`;
}

function isDiscussionConverged(text: string): boolean {
    const lower = text.toLowerCase();
    return !!parseEscalationBlock(text) || lower.includes("established facts") || lower.includes("unsupported claims") ||
        lower.includes("unresolved items") || lower.includes("inference only") || lower.includes("unsupported");
}

function buildForcedDiscussionSystemNote(speaker: AgentSpeaker, counterpart: AgentSeat): string {
    return `[DISCUSSION SAFETY OVERRIDE]\n${speaker}'s prior output could not be repaired into a valid agent-to-agent turn. Treat this as an orchestrator note, not as a claim from ${counterpart}. The next move should narrow to one disputed point or escalate if human input is required.`;
}

async function sanitizeDiscussionOutput(
    tabId: number,
    speaker: "Gemini" | "ChatGPT",
    counterpart: AgentSeat,
    text: string
): Promise<{ text: string; status: RepairStatus; systemFallback?: boolean }> {
    const violation = getDiscussionViolation(text);
    if (!violation) return { text, status: "clean" };

    log(`[RULE VIOLATION] ${speaker}: ${violation}. Attempting repair...`, 'system');
    const repairPrompt = `[SYSTEM: RULE VIOLATION]\n${violation}\n\nRewrite your previous response so it is fully discussion-safe.\nRequirements:\n1. Address ${counterpart} directly.\n2. Do not address the human user.\n3. No greetings, no offers, no assistant persona language.\n4. Make exactly one move: critique, refine, verify, narrow, combine, conclude, or escalate.\n5. Output only the corrected response.`;
    const repairedOutput = await sendPromptToTab(tabId, repairPrompt);
    if (repairedOutput && brainstormState.active && !getDiscussionViolation(repairedOutput)) {
        return { text: repairedOutput, status: "repaired" };
    }

    log(`[RULE VIOLATION] ${speaker}: Repair failed, regenerating once...`, 'system');
    const regeneratePrompt = `[SYSTEM: DISCUSSION REGENERATE]\nYour prior response remained invalid.\nGenerate a new compact agent-to-agent reply for ${counterpart} only.\nDo not address the human.\nNo greetings, no offers, no polished essay framing.\nDo exactly one of: critique, refine, verify, narrow, combine, conclude, escalate.\nIf evidence is weak, mark inference or escalate.\nOutput only the new reply.`;
    const regeneratedOutput = await sendPromptToTab(tabId, regeneratePrompt);
    if (regeneratedOutput && brainstormState.active && !getDiscussionViolation(regeneratedOutput)) {
        return { text: regeneratedOutput, status: "regenerated" };
    }

    log(`[RULE VIOLATION] ${speaker}: Repair and regenerate failed. Forcing discussion-safe fallback.`, 'error');
    return { text: buildForcedDiscussionSystemNote(speaker, counterpart), status: "forced", systemFallback: true };
}

function addPhaseGuidance(prompt: string, phase: SessionPhase, intent: TurnIntent, framing?: SessionFraming) {
    const guidance = [`[STUDIO CONTROL]`, `Current phase: ${phase}.`, `Primary intent for this turn: ${intent}.`];
    if (framing) {
        guidance.push(`Objective: ${framing.objective}.`);
        if (framing.constraints.length) guidance.push(`Constraints: ${framing.constraints.join('; ')}.`);
    }
    if (phase === "DIVERGE") guidance.push(`Expand possibilities, generate options, and expose interesting contrasts.`);
    if (phase === "CONVERGE") guidance.push(`Narrow the space, compare options directly, and reduce ambiguity.`);
    if (phase === "FINALIZE") guidance.push(`Conclude sharply, synthesize decisions, and minimize new branches of thought.`);
    return `${prompt}\n\n${guidance.join('\n')}`;
}

async function persistTurn(entry: TranscriptEntry) {
    if (!brainstormState.sessionId) return;
    await updateSession(brainstormState.sessionId, entry).catch(() => { });
    const session = await getSession(brainstormState.sessionId).catch(() => undefined);
    if (!session) return;
    await saveArtifacts(session.id, buildArtifacts(session.transcript, session.framing)).catch(() => { });
}

async function appendSessionMemory(sessionId: string, entries: SessionMemory["entries"]) {
    if (!entries.length) return;
    const session = await getSession(sessionId).catch(() => undefined);
    if (!session) return;
    // EN: Persist memory beside the session so later turns can reuse decisions without replaying transcripts.
    // AR: نحفظ الذاكرة بجانب الجلسة حتى تستفيد الأدوار اللاحقة من القرارات دون إعادة تمرير النص الكامل.
    await saveMemory(sessionId, mergeSessionMemory(session.memory, entries)).catch(() => { });
}

async function clearSessionMemory(sessionId: string) {
    await saveMemory(sessionId, createEmptySessionMemory());
    return { success: true };
}

async function pruneSessionMemoryEntry(sessionId: string, entryId: string) {
    const session = await getSession(sessionId);
    if (!session) throw new Error("Session not found");
    const memory = session.memory || createEmptySessionMemory();
    const removedEntries = (memory.entries || []).filter(entry => entry.id === entryId);
    const prunedEntryKeys = [
        ...(memory.prunedEntryKeys || []),
        ...removedEntries.map(getMemoryEntryKey)
    ];
    const entries = (memory.entries || []).filter(entry => entry.id !== entryId);
    await saveMemory(sessionId, { entries, prunedEntryKeys: [...new Set(prunedEntryKeys)] });
    return { success: true };
}

async function maybeCreateCheckpoint(currentInput: string) {
    if (!brainstormState.sessionId) return;
    if (brainstormState.currentRound % getCheckpointInterval(brainstormState.mode) !== 0 &&
        brainstormState.currentRound !== brainstormState.rounds) return;

    const session = await getSession(brainstormState.sessionId).catch(() => undefined);
    if (!session) return;
    const artifacts = buildArtifacts(session.transcript, session.framing);
    const checkpoint: SessionCheckpoint = {
        id: crypto.randomUUID(),
        turn: brainstormState.currentRound,
        phase: brainstormState.currentPhase,
        label: brainstormState.currentPhase === "DIVERGE" ? `Expand Checkpoint ${brainstormState.currentRound}` :
            brainstormState.currentPhase === "CONVERGE" ? `Narrow Checkpoint ${brainstormState.currentRound}` :
                `Final Checkpoint ${brainstormState.currentRound}`,
        createdAt: Date.now(),
        transcriptCount: session.transcript.length,
        promptSnapshot: currentInput,
        summary: artifacts.synthesis,
        artifactSnapshot: artifacts
    };
    brainstormState.activeCheckpointId = checkpoint.id;
    await appendCheckpoint(session.id, checkpoint).catch(() => { });
    await saveArtifacts(session.id, artifacts).catch(() => { });
    await appendSessionMemory(session.id, memoryEntriesFromCheckpoint(checkpoint));
    log(`Checkpoint created: ${checkpoint.label}`, 'system');
    saveState();
}

async function generateFinale(finaleType: FinaleType): Promise<{ success: boolean; text?: string }> {
    if (!brainstormState.sessionId) return { success: false, text: "No active session." };
    const session = await getSession(brainstormState.sessionId);
    if (!session) return { success: false, text: "Session not found." };
    const artifacts = session.artifacts || buildArtifacts(session.transcript, session.framing);
    const base = [
        `Topic: ${session.topic}`,
        `Mode: ${session.mode}`,
        `Role: ${session.role}`,
        `Objective: ${session.framing?.objective || session.topic}`,
        `Highlights: ${artifacts.highlights.join(' | ') || 'n/a'}`,
        `Ideas: ${artifacts.ideas.join(' | ') || 'n/a'}`,
        `Risks: ${artifacts.risks.join(' | ') || 'n/a'}`,
        `Questions: ${artifacts.questions.join(' | ') || 'n/a'}`
    ].join('\n');

    const prompts: Record<FinaleType, string> = {
        executive: `${base}\n\nProduce an executive summary with the strongest outcome and tradeoffs.`,
        product: `${base}\n\nTurn this into a product concept note with core value, audience, and differentiators.`,
        roadmap: `${base}\n\nTurn this into a roadmap with phases, milestones, and sequencing.`,
        risks: `${base}\n\nTurn this into a risk register with severity, exposure, and mitigations.`,
        decision: `${base}\n\nTurn this into a concise decision memo with recommendation, why now, and unresolved items.`
    };
    let text = "";
    if (brainstormState.geminiTabId) text = await sendPromptToTab(brainstormState.geminiTabId, prompts[finaleType]);
    if (!text) text = prompts[finaleType];
    await saveFinalOutput(session.id, finaleType, text).catch(() => { });
    if (finaleType === "executive") brainstormState.prompt = text;
    saveState();
    return { success: true, text };
}

async function createBranchFromCheckpoint(sessionId: string, checkpointId: string, branchLabel?: string) {
    const session = await getSession(sessionId);
    if (!session) throw new Error("Session not found");
    const checkpoint = (session.checkpoints || []).find(item => item.id === checkpointId);
    if (!checkpoint) throw new Error("Checkpoint not found");

    const branchId = crypto.randomUUID();
    await createBranchSession({
        ...session,
        id: branchId,
        timestamp: Date.now(),
        topic: checkpoint.promptSnapshot,
        transcript: session.transcript.slice(0, checkpoint.transcriptCount),
        checkpoints: [],
        escalations: [],
        moderatorDecisions: [],
        finalOutputs: {},
        artifacts: checkpoint.artifactSnapshot,
        memory: selectPromptMemory(session.memory),
        parentSessionId: session.id,
        branchLabel: branchLabel || checkpoint.label,
        branchOriginTurn: checkpoint.turn,
        firstSpeaker: session.firstSpeaker || brainstormState.firstSpeaker
    });
    chrome.storage.local.set({
        branchDraft: {
            topic: checkpoint.promptSnapshot,
            mode: session.mode,
            role: session.role,
            firstSpeaker: session.firstSpeaker || brainstormState.firstSpeaker,
            customGeminiPrompt: brainstormState.customGeminiPrompt || "",
            customChatGPTPrompt: brainstormState.customChatGPTPrompt || ""
        }
    });
    return { success: true, branchSessionId: branchId };
}

function getAgentConfig(speaker: AgentSpeaker) {
    return speaker === "Gemini"
        ? {
            tabId: brainstormState.geminiTabId!,
            initPrompt: (roleConfig: typeof ROLE_PROMPTS[string], input: string) => roleConfig.geminiInit(input, brainstormState.customGeminiPrompt),
            loopPrompt: (roleConfig: typeof ROLE_PROMPTS[string], input: string) => roleConfig.geminiLoop(input, brainstormState.customGeminiPrompt)
        }
        : {
            tabId: brainstormState.chatGPTTabId!,
            initPrompt: (roleConfig: typeof ROLE_PROMPTS[string], input: string) => roleConfig.chatGPTInit(input, brainstormState.customChatGPTPrompt),
            loopPrompt: (roleConfig: typeof ROLE_PROMPTS[string], input: string) => roleConfig.chatGPTLoop(input, brainstormState.customChatGPTPrompt)
        };
}

function getDiscussionCounterpart(seat: AgentSeat): AgentSeat {
    return seat === "Agent A" ? "Agent B" : "Agent A";
}

function getRoundSpeakers(round: number): [AgentSpeaker, AgentSpeaker] {
    const preferredFirst = brainstormState.firstSpeaker;
    const preferredSecond: AgentSpeaker = preferredFirst === "Gemini" ? "ChatGPT" : "Gemini";
    return round % 2 === 1 ? [preferredFirst, preferredSecond] : [preferredSecond, preferredFirst];
}

function getSeatForTurn(speaker: AgentSpeaker, roundFirstSpeaker: AgentSpeaker): AgentSeat {
    return speaker === roundFirstSpeaker ? "Agent A" : "Agent B";
}

function buildModeratorOverride(input: string, feedback: string) {
    return `Here is the latest input from your collaborator:\n---\n${input}\n---\n\n[CRITICAL OVERRIDE] THE HUMAN MODERATOR HAS INTERVENED WITH THE FOLLOWING INSTRUCTIONS:\n---\n${feedback}\n---\nAcknowledge the moderator's instructions and seamlessly incorporate them into your next response.`;
}

function buildResumeContextPrompt(resumeContext: string, seat: AgentSeat) {
    const counterpart = getDiscussionCounterpart(seat);
    return `[SYSTEM: ESCALATION RESOLVED] The human observer has provided the following decision/feedback regarding your previous escalation:\n---\n${resumeContext}\n---\n\nRULES:\n1. Address ${counterpart} directly. DO NOT address the human user.\n2. Incorporate this decision to unblock the discussion.`;
}

function buildSeedAnchoredInput(sessionSeed: string | undefined, latestInput: string, isOpeningTurn: boolean) {
    const cleanSeed = (sessionSeed || "").trim();
    const cleanInput = latestInput.trim();
    if (!cleanSeed || isOpeningTurn || cleanSeed === cleanInput) return latestInput;

    return [
        "[SESSION SEED PROMPT / TOPIC]",
        "---",
        cleanSeed,
        "---",
        "",
        "[LATEST COLLABORATOR INPUT]",
        "---",
        latestInput,
        "---",
        "",
        "Use the seed prompt as the shared context. Respond to the latest collaborator input without drifting away from the seed prompt."
    ].join('\n');
}

async function executeAgentTurn(
    speaker: AgentSpeaker,
    seat: AgentSeat,
    isOpeningTurn: boolean,
    roleConfig: typeof ROLE_PROMPTS[string],
    framing?: SessionFraming,
    memory?: SessionMemory,
    rootTopic?: string,
    inputOverride?: string
) {
    const agent = getAgentConfig(speaker);
    let basePrompt = inputOverride ?? brainstormState.prompt;
    if (brainstormState.humanFeedback) {
        basePrompt = buildModeratorOverride(basePrompt, brainstormState.humanFeedback);
        brainstormState.humanFeedback = null;
        saveState();
    } else if (brainstormState.resumeContext && brainstormState.mode === 'DISCUSSION') {
        basePrompt = buildResumeContextPrompt(brainstormState.resumeContext, seat);
        brainstormState.resumeContext = null;
        saveState();
    }

    brainstormState.currentIntent = inferIntent(brainstormState.role, brainstormState.currentPhase, speaker, brainstormState.mode, seat);
    const sessionSeed = rootTopic || brainstormState.prompt;
    const anchoredBasePrompt = brainstormState.mode === "DISCUSSION"
        ? basePrompt
        : buildSeedAnchoredInput(sessionSeed, basePrompt, isOpeningTurn);
    let prompt: string;
    if (brainstormState.mode === "DISCUSSION") {
        prompt = renderPromptBlueprint(buildDiscussionBlueprint({
            speaker,
            seat,
            isOpeningTurn,
            role: brainstormState.role,
            rootTopic,
            topicOrInput: basePrompt,
            phase: brainstormState.currentPhase,
            intent: brainstormState.currentIntent,
            framing,
            memory
        }));
    } else {
        // PING_PONG: render the existing role-prompt narrative, then wrap it
        // in the layered shell so the agent gets memory + identity + the
        // PING_PONG output contract too (issue #8).
        const roleNarrative = isOpeningTurn
            ? agent.initPrompt(roleConfig, anchoredBasePrompt)
            : agent.loopPrompt(roleConfig, anchoredBasePrompt);
        prompt = renderPromptBlueprint(buildPingPongBlueprint({
            speaker,
            seat,
            isOpeningTurn,
            role: brainstormState.role,
            rootTopic,
            roleNarrative,
            phase: brainstormState.currentPhase,
            intent: brainstormState.currentIntent,
            framing,
            memory
        }));
        prompt = addPhaseGuidance(prompt, brainstormState.currentPhase, brainstormState.currentIntent, framing);
    }

    const forceConvergence = brainstormState.mode === 'DISCUSSION' &&
        brainstormState.discussionTurnSinceCheckpoint >= DISCUSSION_CHECKPOINT_TURNS;
    if (forceConvergence) {
        prompt += buildDiscussionControlInstruction(getDiscussionCounterpart(seat));
        log(`Convergence checkpoint reached. Forced sub-issue resolution requested for ${speaker}.`, 'system');
    }

    let output = await sendPromptToTab(agent.tabId, prompt);
    if (!brainstormState.active) return { output: "", escalated: false };
    if (!output) throw new Error(`${speaker} produced no output.`);

    let repairStatus: RepairStatus = "clean";
    let systemFallback = false;
    if (brainstormState.mode === 'DISCUSSION') {
        const repaired = await sanitizeDiscussionOutput(agent.tabId, speaker, getDiscussionCounterpart(seat), output);
        output = repaired.text;
        repairStatus = repaired.status;
        systemFallback = !!repaired.systemFallback;
        brainstormState.discussionTurnSinceCheckpoint = forceConvergence
            ? (isDiscussionConverged(output) ? 0 : DISCUSSION_CHECKPOINT_TURNS)
            : brainstormState.discussionTurnSinceCheckpoint + 1;
    }

    brainstormState.lastSpeaker = speaker;
    brainstormState.lastRepairStatus = repairStatus;
    brainstormState.prompt = output;
    saveState();

    await persistTurn({
        agent: systemFallback ? 'System' : speaker,
        text: output,
        timestamp: Date.now(),
        intent: brainstormState.currentIntent,
        phase: brainstormState.currentPhase,
        repairStatus,
        checkpointTag: brainstormState.activeCheckpointId,
        // EN: Stamp the seat directly so the workshop never has to recompute it
        //     from agent index. Forced-fallback System turns inherit the seat
        //     of the agent whose output failed repair.
        // AR: نحفظ المقعد على الدور مباشرة حتى لا تعيد الواجهة حسابه.
        seat,
        // EN: Snapshot the memory entries that were actually folded into this
        //     turn's blueprint.  PING_PONG mode does not yet read memory into
        //     prompts (issue #8), so we only stamp the snapshot for DISCUSSION
        //     to keep the UI honest about what was sent.
        // AR: نحفظ مدخلات الذاكرة المُرسَلة فعلاً في هذا الدور (وضع DISCUSSION
        //     فقط؛ سيُفعَّل وضع PING_PONG عند مهاجرته إلى blueprint).
        promptMemorySnapshot: brainstormState.mode === "DISCUSSION" ? (memory?.entries || []) : undefined,
        // EN: Capture the canonical prompt for this turn.  Repair / regenerate
        //     prompts inside sanitizeDiscussionOutput are NOT captured — only
        //     the main prompt that produced the persisted output.
        // AR: نلتقط المطالبة الأساسية لهذا الدور (لا مطالبات الإصلاح).
        promptSnapshot: prompt
    });

    if (brainstormState.mode === 'DISCUSSION') {
        const escalation = parseEscalationBlock(output);
        if (escalation) {
            brainstormState.lastEscalation = escalation;
            brainstormState.isPaused = true;
            brainstormState.awaitingHumanDecision = true;
            brainstormState.currentIntent = "escalate";
            log(`[ESCALATION DETECTED] ${speaker} requests human input. Reason: ${escalation.reason}`, 'system');
            if (brainstormState.sessionId) await appendEscalation(brainstormState.sessionId, escalation).catch(() => { });
            saveState();
            return { output, escalated: true };
        }
    }

    return { output, escalated: false, converged: brainstormState.mode === 'DISCUSSION' && isDiscussionConverged(output), systemFallback };
}

async function runBrainstormLoop(runId: string) {
    const activeRole = ROLE_PROMPTS[brainstormState.role] ? brainstormState.role : "CRITIC";
    const roleConfig = ROLE_PROMPTS[activeRole];
    let consecutiveConvergenceSignals = 0;
    // EN: When the first speaker of a round emits an escalation, the loop
    //     pauses for human input. On resume we must NOT re-run the first
    //     speaker (it would persist a duplicate transcript entry under the
    //     same seat), so we set this flag and skip ahead to the second turn.
    // AR: عند صدور تصعيد من المتحدث الأول، نتجاوز إعادة تشغيله بعد الاستئناف
    //     حتى لا يُسجَّل دوران بنفس المقعد.
    let resumingAfterFirstEscalation = false;
    log(`Loop started with role: ${activeRole}`);

    const noteConvergence = (turn: { converged?: boolean; systemFallback?: boolean }) => {
        if (brainstormState.mode !== "DISCUSSION" || turn.systemFallback) {
            consecutiveConvergenceSignals = 0;
            return false;
        }
        consecutiveConvergenceSignals = turn.converged ? consecutiveConvergenceSignals + 1 : 0;
        if (consecutiveConvergenceSignals >= 2) {
            brainstormState.currentPhase = "FINALIZE";
            log("Repeated convergence detected. Ending discussion loop early.", 'system');
            return true;
        }
        return false;
    };

    try {
        while (brainstormState.active && activeRunId === runId && brainstormState.currentRound < brainstormState.rounds) {
            if (!resumingAfterFirstEscalation) {
                brainstormState.currentRound++;
                brainstormState.currentPhase = getPhase(brainstormState.currentRound, brainstormState.rounds);
                saveState();
                log(`Round ${brainstormState.currentRound} initiating in phase ${brainstormState.currentPhase}...`);
            }

            while (brainstormState.isPaused && brainstormState.active && activeRunId === runId) await wait(1000);
            if (!brainstormState.active || activeRunId !== runId) break;

            const session = brainstormState.sessionId ? await getSession(brainstormState.sessionId).catch(() => undefined) : undefined;
            const framing = session?.framing;
            const promptMemory = selectPromptMemory(session?.memory);
            const [firstSpeaker, secondSpeaker] = getRoundSpeakers(brainstormState.currentRound);
            const firstSeat = getSeatForTurn(firstSpeaker, firstSpeaker);
            const secondSeat = getSeatForTurn(secondSpeaker, firstSpeaker);

            let firstOutput: string;
            let firstConverged = false;
            let firstSystemFallback = false;
            if (resumingAfterFirstEscalation) {
                resumingAfterFirstEscalation = false;
                // The first speaker already produced (and persisted) the escalation
                // turn last iteration. The human's resolution lives in resumeContext
                // and will be folded into the second turn's prompt by executeAgentTurn.
                firstOutput = brainstormState.prompt;
            } else {
                const firstTurn = await executeAgentTurn(firstSpeaker, firstSeat, brainstormState.currentRound === 1, roleConfig, framing, promptMemory, session?.topic);
                if (!brainstormState.active || activeRunId !== runId) break;
                if (firstTurn.escalated) {
                    resumingAfterFirstEscalation = true;
                    continue;
                }
                firstOutput = firstTurn.output;
                firstConverged = !!firstTurn.converged;
                firstSystemFallback = !!firstTurn.systemFallback;
            }

            await wait(1500);
            while (brainstormState.isPaused && brainstormState.active && activeRunId === runId) await wait(1000);
            if (!brainstormState.active || activeRunId !== runId) break;
            const secondTurn = await executeAgentTurn(secondSpeaker, secondSeat, false, roleConfig, framing, promptMemory, session?.topic, firstOutput);
            if (!brainstormState.active || activeRunId !== runId) break;
            if (secondTurn.escalated) {
                // Second-turn escalation: do NOT decrement currentRound. The next
                // iteration will start a fresh round, avoiding the duplicate-first-turn
                // shape that the old `currentRound--` produced.
                continue;
            }

            await maybeCreateCheckpoint(secondTurn.output);
            if (noteConvergence({ converged: firstConverged, systemFallback: firstSystemFallback }) || noteConvergence(secondTurn)) break;
            await wait(1500);
        }
    } catch (err: any) {
        log(`Loop crashed: ${err.message}`, 'error');
    } finally {
        if (activeRunId === runId) {
            brainstormState.active = false;
            finishRun(runId);
            log("Run completed or stopped.", 'system');
            saveState({ immediate: true });
        }
    }
}

async function sendPromptToTab(tabId: number, prompt: string): Promise<string> {
    // EN: The orchestrator never moves, focuses, or activates tabs or windows.
    //     Hidden-tab throttling is a Chrome browser feature; the correct
    //     remedy is the user-side allowlist at chrome://settings/performance,
    //     which the Workshop's ThrottlingNotice already surfaces.  Yanking
    //     user focus on every turn fights the wrong part of the system and
    //     contradicts the durable rule in docs/architecture-studio-workshop.md.
    // AR: لا ينقل المنسّق التبويبات أو ينقل التركيز إليها — وقف العمل في
    //     التبويبات المخفية يُعالَج عبر إعدادات Chrome، وليس بسرقة التركيز.
    await ensureInjected(tabId);

    const countsBefore = await sendMessage(tabId, { action: "getTurnCounts" });
    const minUserTurnCount = typeof countsBefore?.user === "number" ? countsBefore.user + 1 : undefined;
    const minResponseTurnCount = typeof countsBefore?.response === "number" ? countsBefore.response + 1 : undefined;
    let tries = 0;
    let sent = false;
    while (tries < 3 && !sent) {
        tries++;
        const res = await sendMessage(tabId, { action: "runPrompt", text: prompt });
        if (res?.status === 'done') sent = true;
        else await wait(1000);
    }
    if (!sent) {
        log(`Failed to send prompt to tab ${tabId}`, 'error');
        return "";
    }
    log("Waiting for generation...", 'info');
    await sendMessage(tabId, { action: "waitForDone", minUserTurnCount, minResponseTurnCount });
    const resp = await sendMessage(tabId, { action: "getLastResponse" });
    return resp?.text || "";
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
