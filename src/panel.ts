import { applyTranslationsToDOM, getLanguage, setLanguage, t, Language } from './i18n.js';
import { AgentSpeaker, BrainstormSession, BrainstormState, FinaleType, StudioProfile, TranscriptEntry } from './types.js';

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
    chrome.storage.local.set({
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
    return new Promise<void>(resolve => {
        chrome.storage.local.get(['uiConfig', 'studioProfiles', 'branchDraft'], (result) => {
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
                chrome.storage.local.remove('branchDraft');
            }
            resolve();
        });
    });
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

function saveProfiles() {
    chrome.storage.local.set({ studioProfiles: profiles });
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
    chrome.tabs.query({}, (tabs) => {
        if (!tabs.some(isGeminiUrl)) chrome.tabs.create({ url: "https://gemini.google.com/app", active: false });
        if (!tabs.some(isChatUrl)) chrome.tabs.create({ url: "https://chatgpt.com", active: false });
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
        opt.textContent = (tab.title || "Untitled").slice(0, 48);
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
    chrome.tabs.query({}, tabs => {
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
    ELEMENTS.geminiRail.innerHTML = `
        <strong>Gemini</strong>
        <div class="rail-meta"><span>Seat</span><span>${firstSpeaker === "Gemini" ? "opens run" : "second turn"}</span></div>
        <div class="rail-meta"><span>Status</span><span>${state?.active ? (state.lastSpeaker === "Gemini" ? "just spoke" : "ready") : "idle"}</span></div>
        <div class="rail-meta"><span>Intent</span><span>${lastGemini?.intent || 'n/a'}</span></div>
        <div class="rail-meta"><span>Repair</span><span>${lastGemini?.repairStatus || 'clean'}</span></div>
        <div class="rail-meta"><span>Length</span><span>${lastGemini?.text.length || 0} chars</span></div>`;
    ELEMENTS.chatGptRail.innerHTML = `
        <strong>ChatGPT</strong>
        <div class="rail-meta"><span>Seat</span><span>${firstSpeaker === "ChatGPT" ? "opens run" : "second turn"}</span></div>
        <div class="rail-meta"><span>Status</span><span>${state?.active ? (state.lastSpeaker === "ChatGPT" ? "just spoke" : "ready") : "idle"}</span></div>
        <div class="rail-meta"><span>Intent</span><span>${lastChat?.intent || 'n/a'}</span></div>
        <div class="rail-meta"><span>Repair</span><span>${lastChat?.repairStatus || 'clean'}</span></div>
        <div class="rail-meta"><span>Length</span><span>${lastChat?.text.length || 0} chars</span></div>`;
}

function renderFraming() {
    const framing = currentSession?.framing;
    if (!framing) {
        ELEMENTS.framingCard.innerHTML = '<strong>Goal Framing</strong><div class="status-text">Start a session to generate objective framing and success criteria.</div>';
        return;
    }
    ELEMENTS.framingCard.innerHTML = `
        <strong>Goal Framing</strong>
        <div><strong>Objective:</strong> ${escapeHtml(framing.objective)}</div>
        <div><strong>Constraints:</strong> ${framing.constraints.map(item => escapeHtml(item)).join(' | ')}</div>
        <div><strong>Success:</strong> ${framing.successCriteria.map(item => escapeHtml(item)).join(' | ')}</div>`;
}

function renderTimeline() {
    const transcript = currentSession?.transcript || [];
    ELEMENTS.timelineList.innerHTML = '';
    transcript.slice(-12).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <strong>${entry.agent}</strong>
            <div class="rail-meta"><span>${entry.intent || 'n/a'}</span><span>${entry.phase || 'n/a'}</span></div>
            <div>${escapeHtml(entry.text.slice(0, 220))}${entry.text.length > 220 ? '...' : ''}</div>
            <div class="status-text">${entry.repairStatus ? `repair: ${entry.repairStatus}` : ''}</div>`;
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
            <div class="status-text">Turn ${checkpoint.turn} · ${checkpoint.phase}</div>
            <div>${escapeHtml(checkpoint.summary)}</div>`;
        const actions = document.createElement('div');
        actions.className = 'actions';
        const forkBtn = document.createElement('button');
        forkBtn.className = 'btn secondary';
        forkBtn.textContent = 'Fork';
        forkBtn.onclick = () => forkCheckpoint(checkpoint.id);
        const finaleBtn = document.createElement('button');
        finaleBtn.className = 'btn secondary';
        finaleBtn.textContent = 'Decision Memo';
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
    `).join('') || '<div class="status-text">No transcript yet.</div>';

    ELEMENTS.outputHighlights.innerHTML = artifacts
        ? `<div class="output-block"><strong>Highlights</strong><ul>${artifacts.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>Questions</strong><ul>${artifacts.questions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`
        : '<div class="status-text">Highlights will appear as the session evolves.</div>';

    ELEMENTS.outputIdeas.innerHTML = artifacts
        ? `<div class="output-block"><strong>Ideas</strong><ul>${artifacts.ideas.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>Risks</strong><ul>${artifacts.risks.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
           <div class="output-block"><strong>Decisions</strong><ul>${artifacts.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`
        : '<div class="status-text">Actionable ideas will appear here.</div>';

    ELEMENTS.outputFinales.innerHTML = Object.keys(finalOutputs).length
        ? Object.entries(finalOutputs).map(([key, value]) => `<div class="output-block"><strong>${key}</strong><div>${escapeHtml(value || "").replace(/\n/g, '<br/>')}</div></div>`).join('')
        : '<div class="status-text">Generate one of the finale formats from the intervention dock.</div>';
}

function renderBranches() {
    ELEMENTS.branchList.innerHTML = '';
    const items = (currentSession?.checkpoints || []).slice(-6).reverse();
    if (!items.length) {
        ELEMENTS.branchList.innerHTML = '<div class="status-text">Checkpoint branches will appear here.</div>';
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
    ELEMENTS.statusBadge.textContent = state.active ? (state.isPaused ? t('paused', currentLang) : t('running', currentLang)) : t('idle', currentLang);
    ELEMENTS.statusBadge.className = `badge ${state.active ? 'running' : 'idle'}`;
    ELEMENTS.livePhaseBadge.textContent = state.currentPhase;
    ELEMENTS.startBtn.style.display = state.active ? 'none' : 'inline-block';
    ELEMENTS.monitorLiveBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.stopBtn.style.display = state.active ? 'inline-block' : 'none';
    ELEMENTS.pauseBtn.style.display = state.active && !state.isPaused ? 'inline-block' : 'none';
    ELEMENTS.postRunActionsCard.style.display = !state.active && state.currentRound > 0 ? 'flex' : 'none';
    renderEscalation(state);
}

function renderSession() {
    renderAgentRails();
    renderFraming();
    renderTimeline();
    renderCheckpoints();
    renderOutputs();
    renderBranches();
}

function refreshActiveSession() {
    chrome.runtime.sendMessage({ action: "getBrainstormState" }, (state: BrainstormState) => {
        if (!state) return;
        renderState(state);
        if (!state.sessionId) {
            currentSession = null;
            renderSession();
            return;
        }
        chrome.runtime.sendMessage({ action: "getSession", id: state.sessionId }, (session: BrainstormSession | null) => {
            currentSession = session;
            renderSession();
        });
    });
}

function startRun() {
    const geminiId = parseInt(ELEMENTS.geminiSelect.value);
    const chatGPTId = parseInt(ELEMENTS.chatGPTSelect.value);
    const topic = ELEMENTS.topicInput.value.trim();
    if (!geminiId || !chatGPTId) return alert(t('errorTabsMissing', currentLang));
    if (!topic) return alert(t('errorTopicEmpty', currentLang));
    chrome.runtime.sendMessage({
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
    }, (response) => {
        if (!response?.success) {
            alert(response?.error || "Failed to start run");
            return;
        }
        saveUIConfig();
        refreshActiveSession();
    });
}

function pauseRun() {
    chrome.runtime.sendMessage({ action: "pauseBrainstorm" }, refreshActiveSession);
}

function stopRun() {
    chrome.runtime.sendMessage({ action: "stopBrainstorm" }, refreshActiveSession);
}

function resumeRun(withFeedback: boolean, feedback?: string) {
    const text = withFeedback ? (feedback ?? ELEMENTS.humanFeedbackInput.value.trim()) : "";
    if (withFeedback && !text) return;
    ELEMENTS.humanFeedbackInput.value = "";
    ELEMENTS.escFeedbackInput.value = "";
    chrome.runtime.sendMessage({ action: "resumeBrainstorm", feedback: text }, refreshActiveSession);
}

function continueRun() {
    chrome.runtime.sendMessage({ action: "continueBrainstorm", additionalRounds: parseInt(ELEMENTS.continueRoundsInput.value) || 2 }, refreshActiveSession);
}

function triggerFinale(finaleType: FinaleType) {
    chrome.runtime.sendMessage({ action: "generateFinale", finaleType }, () => {
        setTimeout(refreshActiveSession, 1000);
    });
}

function forkCheckpoint(checkpointId: string) {
    if (!currentSession) return;
    chrome.runtime.sendMessage({
        action: "createBranchFromCheckpoint",
        sessionId: currentSession.id,
        checkpointId,
        branchLabel: `Branch from ${checkpointId.slice(0, 4)}`
    }, () => {
        switchTab('active');
    });
}

function openLiveMonitor() {
    if (!currentState?.active || !currentState.sessionId) return;
    chrome.tabs.create({ url: `transcript.html?liveSessionId=${encodeURIComponent(currentState.sessionId)}` });
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
    await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: ['content.js'] }).catch(() => { });
    chrome.tabs.sendMessage(targetTabId, { action: type === 'last' ? 'getLastResponse' : 'scrapeConversation' }, (response) => {
        if (chrome.runtime.lastError || !response?.text) {
            ELEMENTS.exportStatus.textContent = t('errorCommunicating', currentLang);
            return;
        }
        chrome.storage.local.set({
            transcriptData: response.text,
            transcriptMeta: {
                title: currentSession ? `Studio Export: ${currentSession.topic.slice(0, 36)}` : 'Studio Export',
                date: Date.now(),
                filename: `studio-export-${type}-${Date.now()}.md`
            }
        }, () => {
            chrome.tabs.create({ url: 'transcript.html' });
            ELEMENTS.exportStatus.textContent = t('exportDone', currentLang);
        });
    });
}

function loadHistory() {
    chrome.runtime.sendMessage({ action: "getAllSessions" }, (sessions: BrainstormSession[]) => {
        currentHistorySessions = sessions || [];
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
                    <span>${session.mode === "DISCUSSION" ? 'Agent Workshop' : 'Collaborative Exchange'}</span>
                    <span>${new Date(session.timestamp).toLocaleString()}</span>
                </div>
                <strong>${escapeHtml(session.topic)}</strong>
                <div class="status-text">${session.branchLabel ? `Branch: ${escapeHtml(session.branchLabel)}` : 'Primary session'} · checkpoints: ${(session.checkpoints || []).length}</div>`;
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
    });
}

function viewHistorySession(id: string) {
    const session = currentHistorySessions.find(item => item.id === id);
    if (!session) return;
    ELEMENTS.historyDetailTitle.textContent = `Session Details`;
    ELEMENTS.historyDetailContent.innerHTML = `
        <div class="output-block"><strong>Topic</strong><div>${escapeHtml(session.topic)}</div></div>
        <div class="output-block"><strong>Artifacts</strong><div>${escapeHtml(session.artifacts?.synthesis || 'No synthesis')}</div></div>
        <div class="output-block"><strong>Transcript</strong><div>${session.transcript.map(entry => `<p><strong>${entry.agent}:</strong> ${escapeHtml(entry.text)}</p>`).join('')}</div></div>`;
    ELEMENTS.historyDetailView.style.display = 'flex';
}

function exportHistorySession(id: string) {
    const session = currentHistorySessions.find(item => item.id === id);
    if (!session) return;
    const md = `# Studio Session\n\n**Topic:** ${session.topic}\n**Mode:** ${session.mode}\n**Role:** ${session.role}\n\n${session.transcript.map(entry => `## ${entry.agent}\n${entry.text}`).join('\n\n')}`;
    chrome.storage.local.set({
        transcriptData: md,
        transcriptMeta: { title: `History: ${session.topic.slice(0, 32)}`, date: session.timestamp, filename: `session-${session.id}.md` }
    }, () => chrome.tabs.create({ url: 'transcript.html' }));
}

function deleteHistorySession(id: string) {
    if (!confirm(t('deleteConfirm', currentLang))) return;
    chrome.runtime.sendMessage({ action: "deleteSession", id }, loadHistory);
}

function clearLocalData() {
    if (!confirm(t('clearLocalDataConfirm', currentLang))) return;
    chrome.runtime.sendMessage({ action: "clearLocalData" }, (response) => {
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
    });
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
    await loadStoredData();
    renderProfiles();
    setMode((ELEMENTS.modeSelect.value as "PING_PONG" | "DISCUSSION") || "PING_PONG");
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
        chrome.runtime.sendMessage({ action: "pauseBrainstorm" }, refreshActiveSession);
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
    ELEMENTS.clearLocalDataBtn.addEventListener('click', clearLocalData);
    ELEMENTS.refreshHistoryBtn.addEventListener('click', loadHistory);
    ELEMENTS.closeHistoryDetailBtn.addEventListener('click', () => { ELEMENTS.historyDetailView.style.display = 'none'; });
    ELEMENTS.tabActiveBtn.addEventListener('click', () => switchTab('active'));
    ELEMENTS.tabHistoryBtn.addEventListener('click', () => switchTab('history'));

    [ELEMENTS.geminiSelect, ELEMENTS.chatGPTSelect, ELEMENTS.roundsInput, ELEMENTS.geminiPromptInput, ELEMENTS.chatGPTPromptInput, ELEMENTS.topicInput, ELEMENTS.roleSelect]
        .forEach(el => el.addEventListener('change', () => {
            ELEMENTS.customRoleInputs.style.display = ELEMENTS.roleSelect.value === "CUSTOM" ? 'flex' : 'none';
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
            langBtn.textContent = currentLang === 'en' ? 'عربي' : 'English';
            setMode(ELEMENTS.modeSelect.value as "PING_PONG" | "DISCUSSION");
        });
    }
});
