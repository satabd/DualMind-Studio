import type {
    AgentIdentity,
    AgentOperatingStyle,
    AgentSpeaker,
    PromptBlueprint,
    PromptProtocol,
    PromptSessionContext,
    PromptTurnTask,
    SessionFraming,
    SessionMemory,
    SessionPhase,
    TurnIntent
} from './types.js';

interface DiscussionBlueprintInput {
    speaker: AgentSpeaker;
    isOpeningTurn: boolean;
    topicOrInput: string;
    phase: SessionPhase;
    intent: TurnIntent;
    framing?: SessionFraming;
    memory?: SessionMemory;
}

const DISCUSSION_PROTOCOL: PromptProtocol = {
    label: "Agent Workshop Protocol",
    rules: [
        "The human is observing only and is not your audience.",
        "Address the counterpart agent directly.",
        "Do not address the human user.",
        "No greetings, assistant persona language, offers, or polished essay framing.",
        "Treat this as an internal design and analysis exchange.",
        "Mark weak or missing evidence as inference.",
        "Escalate only when a human decision is genuinely required.",
        "Make exactly one primary move for this turn."
    ],
    escalationFormat: [
        "[ESCALATION_REQUIRED]",
        "reason: <why the agents are blocked>",
        "decision_needed: <specific human decision>",
        "options:",
        "- <option one>",
        "- <option two>",
        "recommended_option: <recommended option>",
        "next_step_after_decision: <what the next agent should do>",
        "[/ESCALATION_REQUIRED]"
    ].join('\n')
};

// EN: These identities define reasoning responsibility, not cosmetic personality.
// AR: هذه الهويات تحدد مسؤولية التفكير، وليست شخصية شكلية فقط.
const AGENT_A_IDENTITY: AgentIdentity = {
    id: "agent-a-synthesis-architect",
    label: "Agent A",
    role: "Synthesis Architect",
    responsibility: "Frame the problem, combine useful directions, and push the session toward a concrete working shape."
};

const AGENT_B_IDENTITY: AgentIdentity = {
    id: "agent-b-skeptical-verifier",
    label: "Agent B",
    role: "Skeptical Verifier",
    responsibility: "Stress-test assumptions, expose weak evidence, and force the session to narrow when claims are unsupported."
};

// EN: Operating style keeps the agents productive and convergence-oriented.
// AR: أسلوب التشغيل يحافظ على إنتاجية الوكلاء ويدفعهم نحو التقارب.
const DEFAULT_STYLE: AgentOperatingStyle = {
    id: "productive-working-session",
    label: "Productive Working Session",
    principles: [
        "Be compact and specific.",
        "Prefer falsifiable claims over broad commentary.",
        "Separate established facts, inferences, risks, and open questions.",
        "Converge when the session starts repeating itself.",
        "Ask for verification on one concrete point instead of expanding scope."
    ]
};

function getCounterpart(speaker: AgentSpeaker): "Agent A" | "Agent B" {
    return speaker === "Gemini" ? "Agent B" : "Agent A";
}

function getIdentity(speaker: AgentSpeaker): AgentIdentity {
    return speaker === "Gemini" ? AGENT_A_IDENTITY : AGENT_B_IDENTITY;
}

function buildTask(isOpeningTurn: boolean, intent: TurnIntent): PromptTurnTask {
    if (isOpeningTurn) {
        return {
            move: intent,
            instructions: [
                "Frame the problem for the counterpart agent.",
                "Define the main design dimensions or constraints.",
                "Propose two to four candidate approaches or hypotheses.",
                "End by asking the counterpart to critique, reject, verify, or narrow one option."
            ]
        };
    }

    return {
        move: intent,
        instructions: [
            `Perform one primary move: ${intent}.`,
            "Respond to the latest counterpart input directly.",
            "Do not introduce a new branch unless it is required to resolve the current issue.",
            "If blocked by missing human preference or external uncertainty, emit the escalation block."
        ]
    };
}

export function buildDiscussionBlueprint(input: DiscussionBlueprintInput): PromptBlueprint {
    const context: PromptSessionContext = {
        speaker: input.speaker,
        counterpart: getCounterpart(input.speaker),
        phase: input.phase,
        intent: input.intent,
        objective: input.framing?.objective,
        constraints: input.framing?.constraints,
        successCriteria: input.framing?.successCriteria,
        latestInput: input.topicOrInput
    };

    return {
        protocol: DISCUSSION_PROTOCOL,
        identity: getIdentity(input.speaker),
        style: DEFAULT_STYLE,
        memory: input.memory,
        context,
        task: buildTask(input.isOpeningTurn, input.intent)
    };
}

function renderList(items: string[] | undefined, fallback: string) {
    if (!items?.length) return `- ${fallback}`;
    return items.map(item => `- ${item}`).join('\n');
}

function renderMemory(memory?: SessionMemory) {
    if (!memory?.entries.length) return "- No selected memory entries.";
    return memory.entries.map(entry => `- ${entry.kind}: ${entry.text}`).join('\n');
}

// EN: Rendering stays deterministic so prompts can be inspected, tested, and shown later in the UI.
// AR: الإخراج ثابت ومنظم حتى يمكن فحص المطالبات واختبارها وعرضها لاحقاً في الواجهة.
export function renderPromptBlueprint(blueprint: PromptBlueprint): string {
    const { protocol, identity, style, memory, context, task } = blueprint;
    return [
        "[SYSTEM PROTOCOL]",
        `Profile: ${protocol.label}`,
        renderList(protocol.rules, "Follow the active studio protocol."),
        protocol.escalationFormat ? `Escalation format:\n${protocol.escalationFormat}` : "",
        "",
        "[IDENTITY]",
        `You are ${identity.label}: ${identity.role}.`,
        `Responsibility: ${identity.responsibility}`,
        "",
        "[OPERATING STYLE]",
        `Style: ${style.label}`,
        renderList(style.principles, "Work in a compact, evidence-seeking style."),
        "",
        "[MEMORY]",
        renderMemory(memory),
        "",
        "[SESSION CONTEXT]",
        `Speaker: ${context.speaker}`,
        `Counterpart: ${context.counterpart}`,
        `Current phase: ${context.phase}`,
        `Primary intent: ${context.intent}`,
        `Objective: ${context.objective || "No explicit objective provided."}`,
        "Constraints:",
        renderList(context.constraints, "No additional constraints recorded."),
        "Success criteria:",
        renderList(context.successCriteria, "Reach a useful bounded output."),
        "Latest input:",
        "---",
        context.latestInput,
        "---",
        "",
        "[TURN TASK]",
        `Move: ${task.move}`,
        renderList(task.instructions, "Advance the session by one useful step."),
        "",
        "[OUTPUT CONTRACT]",
        `Address ${context.counterpart} directly.`,
        "Output only the agent-to-agent reply."
    ].filter(part => part !== "").join('\n');
}
