import { applyTranslationsToDOM, getLanguage, setLanguage, t, Language, translations } from './i18n.js';
import { AgentSpeaker, BrainstormSession, BrainstormState, FinaleType, MemoryEntry, MemoryEntryKind, RepairStatus, SessionMode, SessionPhase, StudioProfile, TranscriptEntry, TurnIntent } from './types.js';
import { selectPromptMemory } from './sessionMemory.js';
import { createTab, isExtensionRuntime, queryTabs, sendRuntimeMessage, storageGet, storageRemove, storageSet } from './extensionApi.js';
import { buildLastResponseMarkdown, buildSessionMarkdown } from './sessionExport.js';

type OutputTab = "transcript" | "highlights" | "ideas" | "finales";

// EN: Side panel is the launcher + quick-monitor + outputs + history surface
//     after issue #18 item 1.  Live timeline, memory previews, checkpoints,
//     branch picker, moderator composer, and escalation card now live in the
//     Workshop.  ELEMENTS reflects only what the panel still owns.
// AR: لوحة الإطلاق فقط — التتبّع والذاكرة ونقاط التحقق انتقلت إلى الورشة.
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
    openWorkshopBtn: document.getElementById('openWorkshopBtn') as HTMLButtonElement,
    monitorLiveBtn: document.getElementById('monitorLiveBtn') as HTMLButtonElement,
    pauseBtn: document.getElementById('pauseBtn') as HTMLButtonElement,
    stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
    statusBadge: document.getElementById('status-badge') as HTMLElement,
    tabActiveBtn: document.getElementById('tabActiveBtn') as HTMLButtonElement,
    tabHistoryBtn: document.getElementById('tabHistoryBtn') as HTMLButtonElement,
    tabActiveContent: document.getElementById('tabActiveContent') as HTMLElement,
    tabHistoryContent: document.getElementById('tabHistoryContent') as HTMLElement,
    postRunActionsCard: document.getElementById('postRunActionsCard') as HTMLElement,
    continueRoundsInput: document.getElementById('continueRoundsInput') as HTMLInputElement,
    continueBtn: document.getElementById('continueBtn') as HTMLButtonElement,
    concludeBtn: document.getElementById('concludeBtn') as HTMLButtonElement,
    postRunStatus: document.getElementById('postRunStatus') as HTMLElement,
    livePhaseBadge: document.getElementById('livePhaseBadge') as HTMLElement,
    quickMonitorList: document.getElementById('quickMonitorList') as HTMLElement,
    outputTranscript: document.getElementById('outputTranscript') as HTMLElement,
    outputHighlights: document.getElementById('outputHighlights') as HTMLElement,
    outputIdeas: document.getElementById('outputIdeas') as HTMLElement,
    outputFinales: document.getElementById('outputFinales') as HTMLElement,
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
let refreshActiveSessionToken = 0;

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
    try {
        const url = tab.url ? new URL(tab.url).hostname : "";
        const pending = tab.pendingUrl ? new URL(tab.pendingUrl).hostname : "";
        return url.includes("gemini.google.com") || pending.includes("gemini.google.com");
    } catch { return false; }
}
function isChatUrl(tab: chrome.tabs.Tab) {
    try {
        const url = tab.url ? new URL(tab.url).hostname : "";
        const pending = tab.pendingUrl ? new URL(tab.pendingUrl).hostname : "";
        return url.includes("chatgpt.com") || url.includes("openai.com") || pending.includes("chatgpt.com") || pending.includes("openai.com");
    } catch { return false; }
}

function getSelectedMode(): SessionMode {
    return ELEMENTS.modeSelect.value === "DISCUSSION" ? "DISCUSSION" : "PING_PONG";
}

function saveUIConfig() {
    storageSet({
        uiConfig: {
            firstSpeaker: ELEMENTS.firstAgentSelect.value,
            geminiTabId: ELEMENTS.geminiSelect.value,
            chatGPTTabId: ELEMENTS.chatGPTSelect.value,
            rounds: ELEMENTS.roundsInput.value,
            mode: getSelectedMode(),
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

// EN: Quick monitor relocated from a full live timeline to a 1-2 turn preview
//     so the panel reads as a launcher.  Full timeline lives in the Workshop
//     (issue #18 item 1).
// AR: عرض مختصر آخر دور أو دورين فقط — المخطط الزمني الكامل في الورشة.
function renderQuickMonitor() {
    const transcript = currentSession?.transcript || [];
    const recent = transcript
        .filter(entry => entry.agent === 'Gemini' || entry.agent === 'ChatGPT' || entry.agent === 'System')
        .slice(-2);
    if (!recent.length) {
        ELEMENTS.quickMonitorList.innerHTML = `<div class="status-text">${t('quickMonitorEmpty', currentLang)}</div>`;
        return;
    }
    ELEMENTS.quickMonitorList.innerHTML = '';
    recent.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <strong>${entry.agent}</strong>
            <div class="rail-meta"><span>${formatIntent(entry.intent)}</span><span>${formatPhase(entry.phase)}</span></div>
            <div>${escapeHtml(entry.text.slice(0, 160))}${entry.text.length > 160 ? '…' : ''}</div>`;
        ELEMENTS.quickMonitorList.appendChild(item);
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

function renderState(state: BrainstormState) {
    currentState = state;
    const hasSessionContext = state.active || !!state.sessionId || !!currentSession;
    ELEMENTS.statusBadge.textContent = state.active ? (state.isPaused ? t('paused', currentLang) : t('running', currentLang)) : t('idle', currentLang);
    ELEMENTS.statusBadge.className = `badge ${state.active ? 'running' : 'idle'}`;
    ELEMENTS.livePhaseBadge.textContent = state.active ? formatPhase(state.currentPhase) : t('idle', currentLang);
    ELEMENTS.startBtn.style.display = state.active ? 'none' : 'inline-block';
    ELEMENTS.monitorLiveBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.stopBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.pauseBtn.style.display = state.active && !state.isPaused ? 'inline-block' : 'none';
    ELEMENTS.exportLastBtn.disabled = !hasSessionContext;
    ELEMENTS.exportFullBtn.disabled = !hasSessionContext;
    document.querySelectorAll<HTMLButtonElement>('.finale-btn').forEach(button => {
        button.disabled = !hasSessionContext;
    });
    ELEMENTS.postRunActionsCard.style.display = !state.active && state.currentRound > 0 ? 'flex' : 'none';
}

function renderSession() {
    renderQuickMonitor();
    renderOutputs();
}

async function refreshActiveSession() {
    const refreshToken = ++refreshActiveSessionToken;
    const state = await sendRuntimeMessage<BrainstormState>({ action: "getBrainstormState" }, idleState);
    if (refreshToken !== refreshActiveSessionToken) return;
    renderState(state);
    if (!state.sessionId) {
        currentSession = null;
        renderSession();
        return;
    }
    const session = await sendRuntimeMessage<BrainstormSession | null>({ action: "getSession", id: state.sessionId }, null);
    if (refreshToken !== refreshActiveSessionToken) return;
    currentSession = session;
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
        mode: getSelectedMode(),
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
        // EN: Side panel is now the launcher; the live timeline + steering
        //     surfaces all live in the Workshop window.  Open it automatically
        //     on Start Run so the user lands where the live work happens.
        // AR: لوحة الإطلاق فقط؛ نفتح نافذة الورشة تلقائياً عند بدء الجلسة.
        createTab('studio.html');
    });
}

function pauseRun() {
    sendRuntimeMessage({ action: "pauseBrainstorm" }, null).then(refreshActiveSession);
}

function stopRun() {
    sendRuntimeMessage({ action: "stopBrainstorm" }, null).then(refreshActiveSession);
}

function continueRun() {
    sendRuntimeMessage({ action: "continueBrainstorm", additionalRounds: parseInt(ELEMENTS.continueRoundsInput.value) || 2 }, null).then(refreshActiveSession);
}

function triggerFinale(finaleType: FinaleType) {
    sendRuntimeMessage({ action: "generateFinale", finaleType }, null).then(() => {
        setTimeout(refreshActiveSession, 1000);
    });
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
        mode: getSelectedMode(),
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

    let session = currentSession;
    if (!session && currentState?.sessionId) {
        session = await sendRuntimeMessage<BrainstormSession | null>({ action: "getSession", id: currentState.sessionId }, null);
        currentSession = session;
    }
    if (!session) {
        ELEMENTS.exportStatus.textContent = t('noContentFound', currentLang);
        return;
    }

    const markdown = type === 'last' ? buildLastResponseMarkdown(session) : buildSessionMarkdown(session);
    if (!markdown.trim()) {
        ELEMENTS.exportStatus.textContent = t('noContentFound', currentLang);
        return;
    }

    await storageSet({
        transcriptData: markdown,
        transcriptMeta: {
            title: type === 'last' ? `Studio Last Response: ${session.topic.slice(0, 32)}` : `Studio Session: ${session.topic.slice(0, 36)}`,
            date: Date.now(),
            filename: `studio-${type}-${session.id}-${Date.now()}.md`
        }
    });
    await createTab('transcript.html');
    ELEMENTS.exportStatus.textContent = t('exportDone', currentLang);
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
    storageSet({
        transcriptData: buildSessionMarkdown(session),
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
    setMode(getSelectedMode());
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
    ELEMENTS.openWorkshopBtn.addEventListener('click', () => createTab('studio.html'));
    document.getElementById('openWorkshopBannerBtn')?.addEventListener('click', () => createTab('studio.html'));
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
    ELEMENTS.continueBtn.addEventListener('click', continueRun);
    ELEMENTS.concludeBtn.addEventListener('click', () => triggerFinale('executive'));
    ELEMENTS.exportLastBtn.addEventListener('click', () => handleExport('last'));
    ELEMENTS.exportFullBtn.addEventListener('click', () => handleExport('full'));
    ELEMENTS.saveProfileBtn.addEventListener('click', saveProfile);
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
            setMode(getSelectedMode());
            renderRoleHelp();
            if (currentState) renderState(currentState);
            renderSession();
            renderProfiles();
            refreshTabs();
        });
    }
});
