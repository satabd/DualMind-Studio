import { applyTranslationsToDOM, getLanguage, setLanguage, t, Language, translations } from './i18n.js';
import { AgentSpeaker, BrainstormSession, BrainstormState, FinaleType, MemoryEntry, MemoryEntryKind, RepairStatus, SessionPhase, StudioProfile, TranscriptEntry, TurnIntent } from './types.js';
import { selectPromptMemory } from './sessionMemory.js';
import { createTab, executeScript, isExtensionRuntime, lastRuntimeError, queryTabs, sendRuntimeMessage, storageGet, storageRemove, storageSet } from './extensionApi.js';

type OutputTab = "transcript" | "highlights" | "ideas" | "finales";

const ELEMENTS = {
    firstAgentSelect: document.getElementById('firstAgentSelect') as HTMLSelectElement,
    secondAgentSelect: document.getElementById('secondAgentSelect') as HTMLSelectElement,
    flipAgentsBtn: document.getElementById('flipAgentsBtn') as HTMLButtonElement,
    geminiSelect: document.getElementById('geminiTabSelect') as HTMLSelectElement,
    chatGPTSelect: document.getElementById('chatGPTTabSelect') as HTMLSelectElement,
    roundsInput: document.getElementById('roundsInput') as HTMLInputElement,
    modeSelect: document.getElementById('modeSelect') as HTMLSelectElement,
    roleSelect: document.getElementById('roleSelect') as HTMLSelectElement,
    customRoleInputs: document.getElementById('customRoleInputs') as HTMLElement,
    geminiPromptInput: document.getElementById('geminiPromptInput') as HTMLTextAreaElement,
    chatGPTPromptInput: document.getElementById('chatGPTPromptInput') as HTMLTextAreaElement,
    topicInput: document.getElementById('topicInput') as HTMLTextAreaElement,
    modeHelpText: document.getElementById('modeHelpText') as HTMLElement,
    modePingPongCard: document.getElementById('modePingPongCard') as HTMLButtonElement,
    modeDiscussionCard: document.getElementById('modeDiscussionCard') as HTMLButtonElement,
    presetChips: document.getElementById('presetChips') as HTMLElement,
    roleHelpText: document.getElementById('roleHelpText') as HTMLElement,
    startBtn: document.getElementById('startBtn') as HTMLButtonElement,
    monitorLiveBtn: document.getElementById('monitorLiveBtn') as HTMLButtonElement,
    pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
    stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
    forceNarrowBtn: document.getElementById('forceNarrowBtn') as HTMLButtonElement,
    requestConclusionBtn: document.getElementById('requestConclusionBtn') as HTMLButtonElement,
    reviewEscalationBtn: document.getElementById('reviewEscalationBtn') as HTMLButtonElement,
    statusBadge: document.getElementById('status-badge') as HTMLElement,
    tabActiveBtn: document.getElementById('tabActiveBtn') as HTMLButtonElement,
    tabHistoryBtn: document.getElementById('tabHistoryBtn') as HTMLButtonElement,
    tabActiveContent: document.getElementById('tabActiveContent') as HTMLElement,
    tabHistoryContent: document.getElementById('tabHistoryContent') as HTMLElement,
    humanModeratorCard: document.getElementById('humanModeratorCard') as HTMLElement,
    humanFeedbackInput: document.getElementById('humanFeedbackInput') as HTMLTextAreaElement,
    resumeWithFeedbackBtn: document.getElementById('resumeWithFeedbackBtn') as HTMLButtonElement,
    resumeSilentBtn: document.getElementById('resumeSilentBtn') as HTMLButtonElement,
    escalationCard: document.getElementById('escalationCard') as HTMLElement,
    escReason: document.getElementById('escReason') as HTMLElement,
    escDecision: document.getElementById('escDecision') as HTMLElement,
    escOptions: document.getElementById('escOptions') as HTMLElement,
    escRecommended: document.getElementById('escRecommended') as HTMLElement,
    escNextStep: document.getElementById('escNextStep') as HTMLElement,
    escFeedbackInput: document.getElementById('escFeedbackInput') as HTMLTextAreaElement,
    resolveEscalationBtn: document.getElementById('resolveEscalationBtn') as HTMLButtonElement,
    postRunActionsCard: document.getElementById('postRunActionsCard') as HTMLElement,
    continueRoundsInput: document.getElementById('continueRoundsInput') as HTMLInputElement,
    continueBtn: document.getElementById('continueBtn') as HTMLButtonElement,
    concludeBtn: document.getElementById('concludeBtn') as HTMLButtonElement,
    postRunStatus: document.getElementById('postRunStatus') as HTMLElement,
    framingCard: document.getElementById('framingCard') as HTMLElement,
    memoryPreviewCard: document.getElementById('memoryPreviewCard') as HTMLElement,
    memoryPreviewList: document.getElementById('memoryPreviewList') as HTMLElement,
    memoryPreviewCount: document.getElementById('memoryPreviewCount') as HTMLElement,
    promptMemoryList: document.getElementById('promptMemoryList') as HTMLElement,
    promptMemoryCount: document.getElementById('promptMemoryCount') as HTMLElement,
    clearMemoryBtn: document.getElementById('clearMemoryBtn') as HTMLButtonElement,
    checkpointCards: document.getElementById('checkpointCards') as HTMLElement,
    timelineList: document.getElementById('timelineList') as HTMLElement,
    geminiRail: document.getElementById('geminiRail') as HTMLElement,
    chatGptRail: document.getElementById('chatGptRail') as HTMLElement,
    livePhaseBadge: document.getElementById('livePhaseBadge') as HTMLElement,
    outputTranscript: document.getElementById('outputTranscript') as HTMLElement,
    outputHighlights: document.getElementById('outputHighlights') as HTMLElement,
    outputIdeas: document.getElementById('outputIdeas') as HTMLElement,
    outputFinales: document.getElementById('outputFinales') as HTMLElement,
    branchList: document.getElementById('branchList') as HTMLElement,
    exportLastBtn: document.getElementById('exportLastBtn') as HTMLButtonElement,
    exportFullBtn: document.getElementById('exportFullBtn') as HTMLButtonElement,
    exportStatus: document.getElementById('exportStatus') as HTMLElement,
    profileNameInput: document.getElementById('profileNameInput') as HTMLInputElement,
    saveProfileBtn: document.getElementById('saveProfileBtn') as HTMLButtonElement,
    profileList: document.getElementById('profileList') as HTMLElement,
    historyList: document.getElementById('historyList') as HTMLElement,
    clearLocalDataBtn: document.getElementById('clearLocalDataBtn') as HTMLButtonElement,
    refreshHistoryBtn: document.getElementById('refreshHistoryBtn') as HTMLButtonElement,
    historyDetailView: document.getElementById('historyDetailView') as HTMLElement,
    historyDetailTitle: document.getElementById('historyDetailTitle') as HTMLElement,
    historyDetailContent: document.getElementById('historyDetailContent') as HTMLElement,
    closeHistoryDetailBtn: document.getElementById('closeHistoryDetailBtn') as HTMLButtonElement
};

let currentLang: Language = 'en';
let currentState: BrainstormState | null = null;
let currentSession: BrainstormSession | null = null;
let currentHistorySessions: BrainstormSession[] = [];
let currentOutputTab: OutputTab = "transcript";
let savedUIConfig: Record<string, string> | null = null;
let profiles: StudioProfile[] = [];

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

const phaseKey: Record<SessionPhase, keyof typeof translations.en> = {
    DIVERGE: "phaseDiverge",
    CONVERGE: "phaseConverge",
    FINALIZE: "phaseFinalize"
};

const intentKey: Record<TurnIntent, keyof typeof translations.en> = {
    expand: "intentExpand",
    critique: "intentCritique",
    verify: "intentVerify",
    combine: "intentCombine",
    narrow: "intentNarrow",
    conclude: "intentConclude",
    escalate: "intentEscalate",
    synthesize: "intentSynthesize",
    moderate: "intentModerate"
};

const repairKey: Record<RepairStatus, keyof typeof translations.en> = {
    clean: "repairClean",
    repaired: "repairRepaired",
    regenerated: "repairRegenerated",
    forced: "repairForced"
};

const memoryKindKey: Record<MemoryEntryKind, keyof typeof translations.en> = {
    fact: "memoryKindFact",
    decision: "memoryKindDecision",
    question: "memoryKindQuestion",
    rejected_option: "memoryKindRejectedOption",
    risk: "memoryKindRisk",
    assumption: "memoryKindAssumption"
};

function formatPhase(phase?: SessionPhase | null) {
    return phase ? t(phaseKey[phase], currentLang) : t('notAvailable', currentLang);
}

function formatIntent(intent?: TurnIntent | null) {
    return intent ? t(intentKey[intent], currentLang) : t('notAvailable', currentLang);
}

function formatRepairStatus(status?: RepairStatus | null) {
    return status ? t(repairKey[status], currentLang) : t('clean', currentLang);
}

function formatMemoryKind(kind: MemoryEntryKind) {
    return t(memoryKindKey[kind], currentLang);
}

function updateLocalizedControls() {
    const flipLabel = t('flipAgentOrder', currentLang);
    ELEMENTS.flipAgentsBtn.setAttribute('aria-label', flipLabel);
    ELEMENTS.flipAgentsBtn.title = flipLabel;
}

function isGeminiUrl(tab: chrome.tabs.Tab) {
    try { return !!tab.url && new URL(tab.url).hostname.includes("gemini.google.com") || !!tab.pendingUrl && new URL(tab.pendingUrl).hostname.includes("gemini.google.com"); } catch { return false; }
}
function isChatUrl(tab: chrome.tabs.Tab) {
    try {
        const url = tab.url ? new URL(tab.url).hostname : "";
        const pending = tab.pendingUrl ? new URL(tab.pendingUrl).hostname : "";
        return url.includes("chatgpt.com") || url.includes("openai.com") || pending.includes("chatgpt.com") || pending.includes("openai.com");
    } catch { return false; }
}

function saveUIConfig() {
    storageSet({
        uiConfig: {
            firstSpeaker: ELEMENTS.firstAgentSelect.value,
            geminiTabId: ELEMENTS.geminiSelect.value,
            chatGPTTabId: ELEMENTS.chatGPTSelect.value,
            rounds: ELEMENTS.roundsInput.value,
            mode: ELEMENTS.modeSelect.value,
            role: ELEMENTS.roleSelect.value,
            customGeminiPrompt: ELEMENTS.geminiPromptInput.value,
            customChatGPTPrompt: ELEMENTS.chatGPTPromptInput.value,
            topic: ELEMENTS.topicInput.value
        }
    });
}

async function loadStoredData() {
    const result = await storageGet<{ uiConfig?: Record<string, string>; studioProfiles?: StudioProfile[]; branchDraft?: Partial<StudioProfile> }>(['uiConfig', 'studioProfiles', 'branchDraft']);
    savedUIConfig = result.uiConfig || null;
    profiles = result.studioProfiles || [];
    if (savedUIConfig?.firstSpeaker) {
        ELEMENTS.firstAgentSelect.value = savedUIConfig.firstSpeaker;
    }
    if (savedUIConfig?.rounds) ELEMENTS.roundsInput.value = savedUIConfig.rounds;
    if (savedUIConfig?.mode) ELEMENTS.modeSelect.value = savedUIConfig.mode;
    if (savedUIConfig?.role) ELEMENTS.roleSelect.value = savedUIConfig.role;
    if (savedUIConfig?.customGeminiPrompt !== undefined) ELEMENTS.geminiPromptInput.value = savedUIConfig.customGeminiPrompt;
    if (savedUIConfig?.customChatGPTPrompt !== undefined) ELEMENTS.chatGPTPromptInput.value = savedUIConfig.customChatGPTPrompt;
    if (savedUIConfig?.topic !== undefined) ELEMENTS.topicInput.value = savedUIConfig.topic;
    if (result.branchDraft?.topic) {
        ELEMENTS.topicInput.value = result.branchDraft.topic;
        ELEMENTS.modeSelect.value = result.branchDraft.mode || ELEMENTS.modeSelect.value;
        ELEMENTS.roleSelect.value = result.branchDraft.role || ELEMENTS.roleSelect.value;
        ELEMENTS.firstAgentSelect.value = result.branchDraft.firstSpeaker || ELEMENTS.firstAgentSelect.value;
        ELEMENTS.geminiPromptInput.value = result.branchDraft.customGeminiPrompt || ELEMENTS.geminiPromptInput.value;
        ELEMENTS.chatGPTPromptInput.value = result.branchDraft.customChatGPTPrompt || ELEMENTS.chatGPTPromptInput.value;
        await storageRemove('branchDraft');
    }
}

function syncAgentOrder(firstSpeaker?: AgentSpeaker) {
    const nextFirst = firstSpeaker || (ELEMENTS.firstAgentSelect.value === "ChatGPT" ? "ChatGPT" : "Gemini");
    const nextSecond = nextFirst === "Gemini" ? "ChatGPT" : "Gemini";
    ELEMENTS.firstAgentSelect.value = nextFirst;
    ELEMENTS.secondAgentSelect.value = nextSecond;
}

function setMode(mode: "PING_PONG" | "DISCUSSION") {
    ELEMENTS.modeSelect.value = mode;
    ELEMENTS.modePingPongCard.classList.toggle('active', mode === "PING_PONG");
    ELEMENTS.modeDiscussionCard.classList.toggle('active', mode === "DISCUSSION");
    ELEMENTS.modeHelpText.textContent = mode === "DISCUSSION"
        ? t('discussionHelp', currentLang)
        : t('collaborativeHelp', currentLang);
}

function renderRoleHelp() {
    const helpKeyByRole: Record<string, keyof typeof translations.en> = {
        CRITIC: 'roleHelpCritic',
        EXPANDER: 'roleHelpExpander',
        ARCHITECT: 'roleHelpArchitect',
        DEV_ADVOCATE: 'roleHelpDevilAdvocate',
        FIRST_PRINCIPLES: 'roleHelpFirstPrinciples',
        INTERVIEWER: 'roleHelpInterviewer',
        FIVE_WHYS: 'roleHelpFiveWhys',
        HISTORIAN_FUTURIST: 'roleHelpTimeJump',
        ELI5: 'roleHelpEli5',
        CUSTOM: 'roleHelpCustom'
    };
    ELEMENTS.roleHelpText.textContent = t(helpKeyByRole[ELEMENTS.roleSelect.value] || 'roleHelpCritic', currentLang);
}

function saveProfiles() {
    storageSet({ studioProfiles: profiles });
}

function renderProfiles() {
    ELEMENTS.profileList.innerHTML = '';
    profiles.forEach(profile => {
        const button = document.createElement('button');
        button.className = 'profile-pill';
        button.textContent = profile.name;
        button.onclick = () => {
            ELEMENTS.modeSelect.value = profile.mode;
            ELEMENTS.roleSelect.value = profile.role;
            syncAgentOrder(profile.firstSpeaker);
            ELEMENTS.roundsInput.value = String(profile.rounds);
            ELEMENTS.topicInput.value = profile.topic;
            ELEMENTS.geminiPromptInput.value = profile.customGeminiPrompt || "";
            ELEMENTS.chatGPTPromptInput.value = profile.customChatGPTPrompt || "";
            ELEMENTS.customRoleInputs.style.display = profile.role === "CUSTOM" ? 'flex' : 'none';
            setMode(profile.mode);
            saveUIConfig();
        };
        ELEMENTS.profileList.appendChild(button);
    });
}

function attemptAutoSpawn() {
    if (!isExtensionRuntime()) {
        refreshTabs();
        return;
    }
    queryTabs({}).then((tabs) => {
        if (!tabs.some(isGeminiUrl)) createTab("https://gemini.google.com/app", false);
        if (!tabs.some(isChatUrl)) createTab("https://chatgpt.com", false);
        setTimeout(refreshTabs, 1200);
    });
}

function populateSelect(select: HTMLSelectElement, tabs: chrome.tabs.Tab[], savedKey: "geminiTabId" | "chatGPTTabId") {
    const current = select.value;
    select.innerHTML = '';
    if (!tabs.length) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = t('noTabsFound', currentLang);
        select.appendChild(opt);
        return;
    }
    tabs.forEach(tab => {
        const opt = document.createElement('option');
        opt.value = String(tab.id);
        opt.textContent = (tab.title || t('untitledTab', currentLang)).slice(0, 48);
        select.appendChild(opt);
    });
    if (savedUIConfig?.[savedKey] && tabs.some(tab => String(tab.id) === savedUIConfig?.[savedKey])) {
        select.value = savedUIConfig[savedKey];
    } else if (current && tabs.some(tab => String(tab.id) === current)) {
        select.value = current;
    } else {
        select.value = select.options[0].value;
    }
}

function refreshTabs() {
    queryTabs({}).then(tabs => {
        populateSelect(ELEMENTS.geminiSelect, tabs.filter(isGeminiUrl), "geminiTabId");
        populateSelect(ELEMENTS.chatGPTSelect, tabs.filter(isChatUrl), "chatGPTTabId");
    });
}

function switchTab(tab: 'active' | 'history') {
    ELEMENTS.tabActiveBtn.classList.toggle('active', tab === 'active');
    ELEMENTS.tabHistoryBtn.classList.toggle('active', tab === 'history');
    ELEMENTS.tabActiveContent.classList.toggle('active', tab === 'active');
    ELEMENTS.tabHistoryContent.classList.toggle('active', tab === 'history');
    if (tab === 'history') loadHistory();
}

function renderAgentRails() {
    const session = currentSession;
    const state = currentState;
    const firstSpeaker = state?.firstSpeaker || session?.firstSpeaker || "Gemini";
    const lastGemini = session?.transcript.filter(entry => entry.agent === "Gemini").slice(-1)[0];
    const lastChat = session?.transcript.filter(entry => entry.agent === "ChatGPT").slice(-1)[0];
    const statusFor = (speaker: AgentSpeaker) => state?.active
        ? (state.lastSpeaker === speaker ? t('justSpoke', currentLang) : t('ready', currentLang))
        : t('idle', currentLang);
    const seatFor = (speaker: AgentSpeaker) => firstSpeaker === speaker ? t('opensRun', currentLang) : t('secondTurn', currentLang);
    ELEMENTS.geminiRail.innerHTML = `
        <strong>Gemini</strong>
        <div class="rail-meta"><span>${t('seat', currentLang)}</span><span>${seatFor("Gemini")}</span></div>
        <div class="rail-meta"><span>${t('status', currentLang)}</span><span>${statusFor("Gemini")}</span></div>
        <div class="rail-meta"><span>${t('intent', currentLang)}</span><span>${formatIntent(lastGemini?.intent)}</span></div>
        <div class="rail-meta"><span>${t('repair', currentLang)}</span><span>${formatRepairStatus(lastGemini?.repairStatus)}</span></div>
        <div class="rail-meta"><span>${t('length', currentLang)}</span><span>${lastGemini?.text.length || 0} ${t('chars', currentLang)}</span></div>`;
    ELEMENTS.chatGptRail.innerHTML = `
        <strong>ChatGPT</strong>
        <div class="rail-meta"><span>${t('seat', currentLang)}</span><span>${seatFor("ChatGPT")}</span></div>
        <div class="rail-meta"><span>${t('status', currentLang)}</span><span>${statusFor("ChatGPT")}</span></div>
        <div class="rail-meta"><span>${t('intent', currentLang)}</span><span>${formatIntent(lastChat?.intent)}</span></div>
        <div class="rail-meta"><span>${t('repair', currentLang)}</span><span>${formatRepairStatus(lastChat?.repairStatus)}</span></div>
        <div class="rail-meta"><span>${t('length', currentLang)}</span><span>${lastChat?.text.length || 0} ${t('chars', currentLang)}</span></div>`;
}

function renderFraming() {
    const framing = currentSession?.framing;
    if (!framing) {
        ELEMENTS.framingCard.innerHTML = `<strong>${t('goalFraming', currentLang)}</strong><div class="status-text">${t('goalFramingEmpty', currentLang)}</div>`;
        return;
    }
    ELEMENTS.framingCard.innerHTML = `
        <strong>${t('goalFraming', currentLang)}</strong>
        <div><strong>${t('objective', currentLang)}:</strong> ${escapeHtml(framing.objective)}</div>
        <div><strong>${t('constraints', currentLang)}:</strong> ${framing.constraints.map(item => escapeHtml(item)).join(' | ')}</div>
        <div><strong>${t('successCriteria', currentLang)}:</strong> ${framing.successCriteria.map(item => escapeHtml(item)).join(' | ')}</div>`;
}

function renderMemoryPreview() {
    const entries = currentSession?.memory?.entries || [];
    ELEMENTS.memoryPreviewCount.textContent = String(entries.length);
    ELEMENTS.clearMemoryBtn.disabled = !currentSession || entries.length === 0;
    if (!entries.length) {
        ELEMENTS.memoryPreviewList.innerHTML = `<div class="status-text">${t('memoryPreviewEmpty', currentLang)}</div>`;
        return;
    }

    // EN: Show the newest compact memory entries without exposing raw transcript replay.
    // AR: نعرض أحدث عناصر الذاكرة المختصرة دون كشف سجل المحادثة الخام.
    ELEMENTS.memoryPreviewList.innerHTML = '';
    entries.slice(-6).reverse().forEach(entry => {
        ELEMENTS.memoryPreviewList.appendChild(createMemoryEntryElement(entry));
    });
}

function renderPromptMemoryPreview() {
    const promptMemory = selectPromptMemory(currentSession?.memory);
    const entries = promptMemory.entries;
    ELEMENTS.promptMemoryCount.textContent = String(entries.length);
    if (!entries.length) {
        ELEMENTS.promptMemoryList.innerHTML = `<div class="status-text">${t('promptMemoryEmpty', currentLang)}</div>`;
        return;
    }

    ELEMENTS.promptMemoryList.innerHTML = '';
    entries.forEach(entry => {
        ELEMENTS.promptMemoryList.appendChild(createMemoryEntryElement(entry, false));
    });
}

function createMemoryEntryElement(entry: MemoryEntry, allowPrune = true) {
    const item = document.createElement('div');
    item.className = 'memory-entry';

    const kind = document.createElement('span');
    kind.className = 'memory-kind';
    kind.textContent = formatMemoryKind(entry.kind);

    const text = document.createElement('span');
    text.textContent = entry.text;

    const actions = document.createElement('div');
    actions.className = 'memory-entry-actions';
    if (allowPrune) {
        const pruneBtn = document.createElement('button');
        pruneBtn.className = 'btn link';
        pruneBtn.type = 'button';
        pruneBtn.textContent = t('pruneMemoryEntry', currentLang);
        pruneBtn.onclick = () => pruneSessionMemoryEntry(entry.id);
        actions.appendChild(pruneBtn);
    }

    item.append(kind, text, actions);
    return item;
}

function renderTimeline() {
    const transcript = currentSession?.transcript || [];
    ELEMENTS.timelineList.innerHTML = '';
    transcript.slice(-12).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <strong>${entry.agent}</strong>
            <div class="rail-meta"><span>${formatIntent(entry.intent)}</span><span>${formatPhase(entry.phase)}</span></div>
            <div>${escapeHtml(entry.text.slice(0, 220))}${entry.text.length > 220 ? '...' : ''}</div>
            <div class="status-text">${entry.repairStatus ? `${t('repair', currentLang)}: ${formatRepairStatus(entry.repairStatus)}` : ''}</div>`;
        ELEMENTS.timelineList.appendChild(item);
    });
}

function renderCheckpoints() {
    const checkpoints = currentSession?.checkpoints || [];
    ELEMENTS.checkpointCards.innerHTML = '';
    checkpoints.slice(-4).reverse().forEach(checkpoint => {
        const card = document.createElement('div');
        card.className = 'checkpoint-card';
        card.innerHTML = `
            <strong>${checkpoint.label}</strong>
            <div class="status-text">${t('turn', currentLang)} ${checkpoint.turn} · ${formatPhase(checkpoint.phase)}</div>
            <div>${escapeHtml(checkpoint.summary)}</div>`;
        const actions = document.createElement('div');
        actions.className = 'actions';
        const forkBtn = document.createElement('button');
        forkBtn.className = 'btn secondary';
        forkBtn.textContent = t('fork', currentLang);
        forkBtn.onclick = () => forkCheckpoint(checkpoint.id);
        const finaleBtn = document.createElement('button');
        finaleBtn.className = 'btn secondary';
        finaleBtn.textContent = t('finaleDecision', currentLang);
        finaleBtn.onclick = () => triggerFinale('decision');
        actions.appendChild(forkBtn);
        actions.appendChild(finaleBtn);
        card.appendChild(actions);
        ELEMENTS.checkpointCards.appendChild(card);
    });
}

function renderOutputs() {
    const session = currentSession;
    const transcript = session?.transcript || [];
    const artifacts = session?.artifacts;
    const finalOutputs = session?.finalOutputs || {};

    ELEMENTS.outputTranscript.innerHTML = transcript.slice(-10).map(entry => `
        <div class="output-block"><strong>${entry.agent}</strong><div>${escapeHtml(entry.text).replace(/\n/g, '<br/>')}</div></div>
    `).join('') || `<div class="status-text">${t('transcriptEmpty', currentLang)}</div>`;

    ELEMENTS.outputHighlights.innerHTML = artifacts
        ? `<div class="output-block"><strong>${t('highlights', currentLang)}</strong><ul>${artifacts.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>${t('questions', currentLang)}</strong><ul>${artifacts.questions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`
        : `<div class="status-text">${t('highlightsEmpty', currentLang)}</div>`;

    ELEMENTS.outputIdeas.innerHTML = artifacts
        ? `<div class="output-block"><strong>${t('ideas', currentLang)}</strong><ul>${artifacts.ideas.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>${t('risks', currentLang)}</strong><ul>${artifacts.risks.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>${t('decisions', currentLang)}</strong><ul>${artifacts.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`
        : `<div class="status-text">${t('ideasEmpty', currentLang)}</div>`;

    ELEMENTS.outputFinales.innerHTML = Object.keys(finalOutputs).length
        ? Object.entries(finalOutputs).map(([key, value]) => `<div class="output-block"><strong>${key}</strong><div>${escapeHtml(value || "").replace(/\n/g, '<br/>')}</div></div>`).join('')
        : `<div class="status-text">${t('finalesEmpty', currentLang)}</div>`;
}

function renderBranches() {
    ELEMENTS.branchList.innerHTML = '';
    const items = (currentSession?.checkpoints || []).slice(-6).reverse();
    if (!items.length) {
        ELEMENTS.branchList.innerHTML = `<div class="status-text">${t('branchesEmpty', currentLang)}</div>`;
        return;
    }
    items.forEach(checkpoint => {
        const pill = document.createElement('button');
        pill.className = 'branch-pill';
        pill.textContent = `${checkpoint.label}`;
        pill.onclick = () => forkCheckpoint(checkpoint.id);
        ELEMENTS.branchList.appendChild(pill);
    });
}

function renderEscalation(state: BrainstormState) {
    if (state.active && state.isPaused && state.awaitingHumanDecision && state.lastEscalation) {
        ELEMENTS.escalationCard.style.display = 'flex';
        ELEMENTS.humanModeratorCard.style.display = 'none';
        ELEMENTS.escReason.textContent = state.lastEscalation.reason;
        ELEMENTS.escDecision.textContent = state.lastEscalation.decision_needed;
        ELEMENTS.escRecommended.textContent = state.lastEscalation.recommended_option;
        ELEMENTS.escNextStep.textContent = state.lastEscalation.next_step_after_decision;
        ELEMENTS.escOptions.innerHTML = state.lastEscalation.options.map(opt => `<li>${escapeHtml(opt)}</li>`).join('');
    } else {
        ELEMENTS.escalationCard.style.display = 'none';
        ELEMENTS.humanModeratorCard.style.display = state.active && state.isPaused ? 'flex' : 'none';
    }
}

function renderState(state: BrainstormState) {
    currentState = state;
    const hasSessionContext = state.active || !!state.sessionId || !!currentSession;
    ELEMENTS.statusBadge.textContent = state.active ? (state.isPaused ? t('paused', currentLang) : t('running', currentLang)) : t('idle', currentLang);
    ELEMENTS.statusBadge.className = `badge ${state.active ? 'running' : 'idle'}`;
    ELEMENTS.livePhaseBadge.textContent = formatPhase(state.currentPhase);
    ELEMENTS.startBtn.style.display = state.active ? 'none' : 'inline-block';
    ELEMENTS.monitorLiveBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.stopBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.pauseBtn.style.display = state.active && !state.isPaused ? 'inline-block' : 'none';
    ELEMENTS.forceNarrowBtn.disabled = !state.active;
    ELEMENTS.requestConclusionBtn.disabled = !hasSessionContext;
    ELEMENTS.reviewEscalationBtn.disabled = !state.awaitingHumanDecision;
    ELEMENTS.exportLastBtn.disabled = !hasSessionContext;
    ELEMENTS.exportFullBtn.disabled = !hasSessionContext;
    document.querySelectorAll<HTMLButtonElement>('.finale-btn').forEach(button => {
        button.disabled = !hasSessionContext;
    });
    ELEMENTS.postRunActionsCard.style.display = !state.active && state.currentRound > 0 ? 'flex' : 'none';
    renderEscalation(state);
}

function renderSession() {
    renderAgentRails();
    renderFraming();
    renderMemoryPreview();
    renderPromptMemoryPreview();
    renderTimeline();
    renderCheckpoints();
    renderOutputs();
    renderBranches();
}

async function refreshActiveSession() {
    const state = await sendRuntimeMessage<BrainstormState>({ action: "getBrainstormState" }, idleState);
    renderState(state);
    if (!state.sessionId) {
        currentSession = null;
        renderSession();
        return;
    }
    currentSession = await sendRuntimeMessage<BrainstormSession | null>({ action: "getSession", id: state.sessionId }, null);
    renderSession();
}

function startRun() {
    const geminiId = parseInt(ELEMENTS.geminiSelect.value);
    const chatGPTId = parseInt(ELEMENTS.chatGPTSelect.value);
    const topic = ELEMENTS.topicInput.value.trim();
    if (!geminiId || !chatGPTId) return alert(t('errorTabsMissing', currentLang));
    if (!topic) return alert(t('errorTopicEmpty', currentLang));
    sendRuntimeMessage<{ success?: boolean; error?: string }>({
        action: "startBrainstorm",
        geminiTabId: geminiId,
        chatGPTTabId: chatGPTId,
        firstSpeaker: ELEMENTS.firstAgentSelect.value,
        rounds: parseInt(ELEMENTS.roundsInput.value) || 3,
        mode: ELEMENTS.modeSelect.value,
        topic,
        role: ELEMENTS.roleSelect.value,
        customGeminiPrompt: ELEMENTS.geminiPromptInput.value.trim(),
        customChatGPTPrompt: ELEMENTS.chatGPTPromptInput.value.trim()
    }, { success: false }).then((response) => {
        if (!response?.success) {
            alert(response?.error || t('failedToStartRun', currentLang));
            return;
        }
        saveUIConfig();
        refreshActiveSession();
    });
}

function pauseRun() {
    sendRuntimeMessage({ action: "pauseBrainstorm" }, null).then(refreshActiveSession);
}

function stopRun() {
    sendRuntimeMessage({ action: "stopBrainstorm" }, null).then(refreshActiveSession);
}

function resumeRun(withFeedback: boolean, feedback?: string) {
    const text = withFeedback ? (feedback ?? ELEMENTS.humanFeedbackInput.value.trim()) : "";
    if (withFeedback && !text) return;
    ELEMENTS.humanFeedbackInput.value = "";
    ELEMENTS.escFeedbackInput.value = "";
    sendRuntimeMessage({ action: "resumeBrainstorm", feedback: text }, null).then(refreshActiveSession);
}

function continueRun() {
    sendRuntimeMessage({ action: "continueBrainstorm", additionalRounds: parseInt(ELEMENTS.continueRoundsInput.value) || 2 }, null).then(refreshActiveSession);
}

function triggerFinale(finaleType: FinaleType) {
    sendRuntimeMessage({ action: "generateFinale", finaleType }, null).then(() => {
        setTimeout(refreshActiveSession, 1000);
    });
}

function forkCheckpoint(checkpointId: string) {
    if (!currentSession) return;
    sendRuntimeMessage({
        action: "createBranchFromCheckpoint",
        sessionId: currentSession.id,
        checkpointId,
        branchLabel: `Branch from ${checkpointId.slice(0, 4)}`
    }, null).then(() => {
        switchTab('active');
    });
}

function clearSessionMemory() {
    if (!currentSession) return;
    if (!confirm(t('clearMemoryConfirm', currentLang))) return;
    sendRuntimeMessage({ action: "clearSessionMemory", sessionId: currentSession.id }, null).then(refreshActiveSession);
}

function pruneSessionMemoryEntry(entryId: string) {
    if (!currentSession) return;
    if (!confirm(t('pruneMemoryConfirm', currentLang))) return;
    sendRuntimeMessage({
        action: "pruneSessionMemoryEntry",
        sessionId: currentSession.id,
        entryId
    }, null).then(refreshActiveSession);
}

function openLiveMonitor() {
    if (!currentState?.active || !currentState.sessionId) return;
    createTab(`transcript.html?liveSessionId=${encodeURIComponent(currentState.sessionId)}`);
}

function saveProfile() {
    const name = ELEMENTS.profileNameInput.value.trim();
    if (!name) return;
    profiles = profiles.filter(profile => profile.name !== name);
    profiles.unshift({
        id: crypto.randomUUID(),
        name,
        mode: ELEMENTS.modeSelect.value as "PING_PONG" | "DISCUSSION",
        role: ELEMENTS.roleSelect.value,
        firstSpeaker: ELEMENTS.firstAgentSelect.value as AgentSpeaker,
        rounds: parseInt(ELEMENTS.roundsInput.value) || 3,
        topic: ELEMENTS.topicInput.value,
        customGeminiPrompt: ELEMENTS.geminiPromptInput.value,
        customChatGPTPrompt: ELEMENTS.chatGPTPromptInput.value
    });
    saveProfiles();
    renderProfiles();
    ELEMENTS.profileNameInput.value = '';
}

async function handleExport(type: 'last' | 'full') {
    ELEMENTS.exportStatus.textContent = t('exporting', currentLang);
    const targetTabId = parseInt(ELEMENTS.chatGPTSelect.value) || parseInt(ELEMENTS.geminiSelect.value);
    if (!targetTabId) {
        ELEMENTS.exportStatus.textContent = t('noTabSelected', currentLang);
        return;
    }
    await executeScript(targetTabId, ['content.js']);
    if (!isExtensionRuntime() || !chrome.tabs?.sendMessage) {
        ELEMENTS.exportStatus.textContent = t('errorCommunicating', currentLang);
        return;
    }
    chrome.tabs.sendMessage(targetTabId, { action: type === 'last' ? 'getLastResponse' : 'scrapeConversation' }, (response) => {
        if (lastRuntimeError() || !response?.text) {
            ELEMENTS.exportStatus.textContent = t('errorCommunicating', currentLang);
            return;
        }
        storageSet({
            transcriptData: response.text,
            transcriptMeta: {
                title: currentSession ? `Studio Export: ${currentSession.topic.slice(0, 36)}` : 'Studio Export',
                date: Date.now(),
                filename: `studio-export-${type}-${Date.now()}.md`
            }
        }).then(() => {
            createTab('transcript.html');
            ELEMENTS.exportStatus.textContent = t('exportDone', currentLang);
        });
    });
}

async function loadHistory() {
    currentHistorySessions = await sendRuntimeMessage<BrainstormSession[]>({ action: "getAllSessions" }, []);
    ELEMENTS.historyList.innerHTML = '';
    if (!currentHistorySessions.length) {
        ELEMENTS.historyList.innerHTML = `<div class="status-text">${t('noHistoryFound', currentLang)}</div>`;
        return;
    }
    currentHistorySessions.forEach(session => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-item-header">
                <span>${session.mode === "DISCUSSION" ? t('discussionMode', currentLang) : t('pingPong', currentLang)}</span>
                <span>${new Date(session.timestamp).toLocaleString()}</span>
            </div>
            <strong>${escapeHtml(session.topic)}</strong>
            <div class="status-text">${session.branchLabel ? `${t('branch', currentLang)}: ${escapeHtml(session.branchLabel)}` : t('primarySession', currentLang)} · ${t('checkpoints', currentLang)}: ${(session.checkpoints || []).length}</div>`;
        const actions = document.createElement('div');
        actions.className = 'history-item-actions';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn secondary';
        viewBtn.textContent = t('view', currentLang);
        viewBtn.onclick = () => viewHistorySession(session.id);
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn secondary';
        exportBtn.textContent = t('export', currentLang);
        exportBtn.onclick = () => exportHistorySession(session.id);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn danger';
        delBtn.textContent = t('del', currentLang);
        delBtn.onclick = () => deleteHistorySession(session.id);
        actions.append(viewBtn, exportBtn, delBtn);
        item.appendChild(actions);
        ELEMENTS.historyList.appendChild(item);
    });
}

function viewHistorySession(id: string) {
    const session = currentHistorySessions.find(item => item.id === id);
    if (!session) return;
    ELEMENTS.historyDetailTitle.textContent = t('sessionDetails', currentLang);
    ELEMENTS.historyDetailContent.innerHTML = `
        <div class="output-block"><strong>${t('topic', currentLang)}</strong><div>${escapeHtml(session.topic)}</div></div>
        <div class="output-block"><strong>${t('artifacts', currentLang)}</strong><div>${escapeHtml(session.artifacts?.synthesis || t('noSynthesis', currentLang))}</div></div>
        <div class="output-block"><strong>${t('transcript', currentLang)}</strong><div>${session.transcript.map(entry => `<p><strong>${entry.agent}:</strong> ${escapeHtml(entry.text)}</p>`).join('')}</div></div>`;
    ELEMENTS.historyDetailView.style.display = 'flex';
}

function exportHistorySession(id: string) {
    const session = currentHistorySessions.find(item => item.id === id);
    if (!session) return;
    const md = `# Studio Session\n\n**Topic:** ${session.topic}\n**Mode:** ${session.mode}\n**Role:** ${session.role}\n\n${session.transcript.map(entry => `## ${entry.agent}\n${entry.text}`).join('\n\n')}`;
    storageSet({
        transcriptData: md,
        transcriptMeta: { title: `History: ${session.topic.slice(0, 32)}`, date: session.timestamp, filename: `session-${session.id}.md` }
    }).then(() => createTab('transcript.html'));
}

function deleteHistorySession(id: string) {
    if (!confirm(t('deleteConfirm', currentLang))) return;
    sendRuntimeMessage({ action: "deleteSession", id }, null).then(loadHistory);
}

async function clearLocalData() {
    if (!confirm(t('clearLocalDataConfirm', currentLang))) return;
    const response = await sendRuntimeMessage<{ success?: boolean; error?: string }>({ action: "clearLocalData" }, { success: true });
    if (!response?.success) {
        alert(response?.error || t('clearLocalDataFailed', currentLang));
        return;
    }
    currentSession = null;
    currentHistorySessions = [];
    currentState = null;
    ELEMENTS.historyDetailView.style.display = 'none';
    ELEMENTS.historyList.innerHTML = `<div class="status-text">${t('noHistoryFound', currentLang)}</div>`;
    refreshActiveSession();
    loadHistory();
    alert(t('clearLocalDataDone', currentLang));
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
    currentLang = await getLanguage();
    applyTranslationsToDOM(currentLang);
    updateLocalizedControls();
    await loadStoredData();
    renderProfiles();
    setMode((ELEMENTS.modeSelect.value as "PING_PONG" | "DISCUSSION") || "PING_PONG");
    renderRoleHelp();
    syncAgentOrder(savedUIConfig?.firstSpeaker as AgentSpeaker | undefined);
    ELEMENTS.customRoleInputs.style.display = ELEMENTS.roleSelect.value === "CUSTOM" ? 'flex' : 'none';
    attemptAutoSpawn();
    refreshTabs();
    refreshActiveSession();
    setInterval(refreshActiveSession, 2000);

    document.querySelectorAll<HTMLButtonElement>('.mode-card').forEach(button => {
        button.addEventListener('click', () => {
            setMode(button.dataset.mode as "PING_PONG" | "DISCUSSION");
            saveUIConfig();
        });
    });
    document.querySelectorAll<HTMLButtonElement>('.preset-chip').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.preset-chip').forEach(chip => chip.classList.remove('active'));
            button.classList.add('active');
            ELEMENTS.roleSelect.value = button.dataset.role || "CRITIC";
            ELEMENTS.customRoleInputs.style.display = ELEMENTS.roleSelect.value === "CUSTOM" ? 'flex' : 'none';
            renderRoleHelp();
            saveUIConfig();
        });
    });
    document.querySelectorAll<HTMLButtonElement>('.output-tab').forEach(button => {
        button.addEventListener('click', () => {
            currentOutputTab = button.dataset.outputTab as OutputTab;
            document.querySelectorAll('.output-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll<HTMLElement>('.output-panel').forEach(panel => panel.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`output${currentOutputTab.charAt(0).toUpperCase()}${currentOutputTab.slice(1)}`)?.classList.add('active');
        });
    });
    document.querySelectorAll<HTMLButtonElement>('.finale-btn').forEach(button => {
        button.addEventListener('click', () => triggerFinale(button.dataset.finale as FinaleType));
    });

    ELEMENTS.startBtn.addEventListener('click', startRun);
    ELEMENTS.firstAgentSelect.addEventListener('change', () => {
        syncAgentOrder(ELEMENTS.firstAgentSelect.value as AgentSpeaker);
        saveUIConfig();
    });
    ELEMENTS.flipAgentsBtn.addEventListener('click', () => {
        syncAgentOrder(ELEMENTS.firstAgentSelect.value === "Gemini" ? "ChatGPT" : "Gemini");
        saveUIConfig();
    });
    ELEMENTS.monitorLiveBtn.addEventListener('click', openLiveMonitor);
    ELEMENTS.pauseBtn.addEventListener('click', pauseRun);
    ELEMENTS.stopBtn.addEventListener('click', stopRun);
    ELEMENTS.forceNarrowBtn.addEventListener('click', () => {
        ELEMENTS.humanFeedbackInput.value = 'Narrow the discussion. Compare the top options directly, drop weaker branches, and move toward a conclusion.';
        sendRuntimeMessage({ action: "pauseBrainstorm" }, null).then(refreshActiveSession);
    });
    ELEMENTS.requestConclusionBtn.addEventListener('click', () => triggerFinale('executive'));
    ELEMENTS.reviewEscalationBtn.addEventListener('click', () => ELEMENTS.escalationCard.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    ELEMENTS.resumeWithFeedbackBtn.addEventListener('click', () => resumeRun(true));
    ELEMENTS.resumeSilentBtn.addEventListener('click', () => resumeRun(false));
    ELEMENTS.resolveEscalationBtn.addEventListener('click', () => resumeRun(true, ELEMENTS.escFeedbackInput.value.trim()));
    ELEMENTS.continueBtn.addEventListener('click', continueRun);
    ELEMENTS.concludeBtn.addEventListener('click', () => triggerFinale('executive'));
    ELEMENTS.exportLastBtn.addEventListener('click', () => handleExport('last'));
    ELEMENTS.exportFullBtn.addEventListener('click', () => handleExport('full'));
    ELEMENTS.saveProfileBtn.addEventListener('click', saveProfile);
    ELEMENTS.clearMemoryBtn.addEventListener('click', clearSessionMemory);
    ELEMENTS.clearLocalDataBtn.addEventListener('click', clearLocalData);
    ELEMENTS.refreshHistoryBtn.addEventListener('click', loadHistory);
    ELEMENTS.closeHistoryDetailBtn.addEventListener('click', () => { ELEMENTS.historyDetailView.style.display = 'none'; });
    ELEMENTS.tabActiveBtn.addEventListener('click', () => switchTab('active'));
    ELEMENTS.tabHistoryBtn.addEventListener('click', () => switchTab('history'));

    [ELEMENTS.geminiSelect, ELEMENTS.chatGPTSelect, ELEMENTS.roundsInput, ELEMENTS.geminiPromptInput, ELEMENTS.chatGPTPromptInput, ELEMENTS.topicInput, ELEMENTS.roleSelect]
        .forEach(el => el.addEventListener('change', () => {
            ELEMENTS.customRoleInputs.style.display = ELEMENTS.roleSelect.value === "CUSTOM" ? 'flex' : 'none';
            renderRoleHelp();
            saveUIConfig();
        }));
    ELEMENTS.topicInput.addEventListener('input', saveUIConfig);

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
        langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
        langBtn.addEventListener('click', async () => {
            currentLang = currentLang === 'en' ? 'ar' : 'en';
            await setLanguage(currentLang);
            applyTranslationsToDOM(currentLang);
            updateLocalizedControls();
            langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
            setMode(ELEMENTS.modeSelect.value as "PING_PONG" | "DISCUSSION");
            renderRoleHelp();
            if (currentState) renderState(currentState);
            renderSession();
            renderProfiles();
            refreshTabs();
        });
    }
});
