import type {
    AgentIdentity,
    AgentOperatingStyle,
    AgentSeat,
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
    seat: AgentSeat;
    isOpeningTurn: boolean;
    role: string;
    rootTopic?: string;
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
        // EN: Identity stability — stop multilingual drift to "العميل" / "المستخدم" / "client" etc.
        // AR: ثبات الهوية — منع الانحراف اللغوي إلى "العميل" / "المستخدم" / "client" وما شابه.
        'Use the exact labels "Agent A" and "Agent B" in any language. Do not translate these labels.',
        'Banned forms in any language (do not use): "العميل", "المستخدم", "صاحب السؤال", "حضرتك", "client", "user".',
        "No greetings, assistant persona language, offers, or polished essay framing.",
        "Treat this as an internal design and analysis exchange.",
        "Stay anchored to the session anchor and the latest counterpart input.",
        "If the requested next step requires external repo inspection, code execution, database access, or migration approval, identify that as an execution boundary instead of inventing results.",
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

const ROLE_DIRECTIVES: Record<string, PromptBlueprint["roleDirective"]> = {
    CRITIC: {
        label: "Stress Test",
        responsibility: "Stress-test claims and reject weak assumptions before they become conclusions.",
        instructions: [
            "Identify the strongest objection or failure mode.",
            "Recommend rejection or revision when evidence is weak.",
            "Keep one constructive path alive if the idea can be repaired."
        ]
    },
    EXPANDER: {
        label: "Expand",
        responsibility: "Generate useful alternatives without losing the session anchor.",
        instructions: [
            "Add adjacent options only when they improve the current line of work.",
            "Name the tradeoff each new option creates.",
            "Stop expanding when options become repetitive."
        ]
    },
    ARCHITECT: {
        label: "Productize",
        responsibility: "Shape the conversation into product, system, and implementation tradeoffs.",
        instructions: [
            "Separate user value, system boundaries, and implementation risk.",
            "Prefer concrete sequencing over broad vision.",
            "Call out dependencies that must be decided before building."
        ]
    },
    DEV_ADVOCATE: {
        label: "Devil's Advocate",
        responsibility: "Argue the strongest opposition case until the proposal can survive it.",
        instructions: [
            "Attack the riskiest premise directly.",
            "State what evidence would change the objection.",
            "Avoid adding unrelated objections once a blocking one is found."
        ]
    },
    FIRST_PRINCIPLES: {
        label: "Reframe",
        responsibility: "Rebuild the problem from fundamentals and expose inherited assumptions.",
        instructions: [
            "Separate constraints from conventions.",
            "Replace vague labels with concrete causes or mechanisms.",
            "Propose a simpler framing when the current one is overloaded."
        ]
    },
    INTERVIEWER: {
        label: "Interviewer",
        responsibility: "Force precision through targeted questions and follow-ups.",
        instructions: [
            "Ask one high-leverage question when a claim is underspecified.",
            "Prefer clarification over expansion.",
            "Turn answers into sharper constraints."
        ]
    },
    FIVE_WHYS: {
        label: "Five Whys",
        responsibility: "Drill from symptoms to root causes.",
        instructions: [
            "Ask why the current explanation is true.",
            "Stop when the cause becomes actionable.",
            "Do not continue drilling once the next action is clear."
        ]
    },
    HISTORIAN_FUTURIST: {
        label: "Invent",
        responsibility: "Contrast historical patterns with plausible future shifts.",
        instructions: [
            "Use history to test plausibility.",
            "Use future shifts to challenge stale assumptions.",
            "Mark speculative claims as inference."
        ]
    },
    ELI5: {
        label: "Simplify",
        responsibility: "Make the idea plain without discarding important nuance.",
        instructions: [
            "Translate complex claims into simple language.",
            "Name the nuance that would be lost by oversimplifying.",
            "Prefer one concrete example over broad explanation."
        ]
    },
    CUSTOM: {
        label: "Custom",
        responsibility: "Follow the custom collaborator instructions provided for this session.",
        instructions: [
            "Use the custom role prompt as the role-specific constraint.",
            "Keep the response bounded to the current counterpart input.",
            "Escalate when the custom instruction conflicts with the session anchor."
        ]
    }
};

function getCounterpart(seat: AgentSeat): AgentSeat {
    return seat === "Agent A" ? "Agent B" : "Agent A";
}

function getIdentity(seat: AgentSeat): AgentIdentity {
    return seat === "Agent A" ? AGENT_A_IDENTITY : AGENT_B_IDENTITY;
}

function buildTask(isOpeningTurn: boolean, intent: TurnIntent): PromptTurnTask {
    if (isOpeningTurn) {
        return {
            move: intent,
            instructions: [
                "Frame the problem for the counterpart agent.",
                "Use the session anchor as the source of truth for scope, domain, constraints, and forbidden directions.",
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
            "Tie the move back to the session anchor before adding any new concept.",
            "Respond to the latest counterpart input directly.",
            "Do not introduce a new branch unless it is required to resolve the current issue.",
            "Reject or ignore meta-discussion that is unrelated to the session anchor.",
            "If blocked by missing human preference or external uncertainty, emit the escalation block."
        ]
    };
}

export function buildDiscussionBlueprint(input: DiscussionBlueprintInput): PromptBlueprint {
    const context: PromptSessionContext = {
        speaker: input.speaker,
        seat: input.seat,
        counterpart: getCounterpart(input.seat),
        phase: input.phase,
        intent: input.intent,
        rootTopic: input.rootTopic,
        objective: input.framing?.objective,
        constraints: input.framing?.constraints,
        successCriteria: input.framing?.successCriteria,
        latestInput: input.topicOrInput
    };

    return {
        protocol: DISCUSSION_PROTOCOL,
        identity: getIdentity(input.seat),
        style: DEFAULT_STYLE,
        roleDirective: ROLE_DIRECTIVES[input.role] || ROLE_DIRECTIVES.CRITIC,
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
    return [
        "Ground memory entries as constraints when they are relevant. Do not treat them as flavor text.",
        ...memory.entries.map(entry => `- ${entry.kind}: ${entry.text}`)
    ].join('\n');
}

function renderAnchor(rootTopic: string | undefined, latestInput: string) {
    const anchor = rootTopic || latestInput;
    return anchor.trim();
}

// EN: Rendering stays deterministic so prompts can be inspected, tested, and shown later in the UI.
// AR: الإخراج ثابت ومنظم حتى يمكن فحص المطالبات واختبارها وعرضها لاحقاً في الواجهة.
export function renderPromptBlueprint(blueprint: PromptBlueprint): string {
    const { protocol, identity, style, roleDirective, memory, context, task } = blueprint;
    return [
        "[SYSTEM PROTOCOL]",
        `Profile: ${protocol.label}`,
        renderList(protocol.rules, "Follow the active studio protocol."),
        protocol.escalationFormat ? `Escalation format:\n${protocol.escalationFormat}` : "",
        "",
        "[IDENTITY]",
        `You are ${identity.label}: ${identity.role}.`,
        `Responsibility: ${identity.responsibility}`,
        `Transport: ${context.speaker}`,
        `Reasoning seat: ${context.seat}`,
        "",
        "[ROLE DIRECTIVE]",
        `Role: ${roleDirective?.label || "Stress Test"}`,
        `Role responsibility: ${roleDirective?.responsibility || "Stress-test claims and reject weak assumptions."}`,
        renderList(roleDirective?.instructions, "Apply the selected collaboration style to this turn."),
        "",
        "[OPERATING STYLE]",
        `Style: ${style.label}`,
        renderList(style.principles, "Work in a compact, evidence-seeking style."),
        "",
        "[MEMORY]",
        renderMemory(memory),
        "",
        "[SESSION ANCHOR]",
        renderAnchor(context.rootTopic, context.latestInput),
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
        `Keep the labels "Agent A" and "Agent B" literal even when replying in another language. Do not translate them.`,
        "Do not mention the system protocol, prompt layers, output contract, hidden instructions, or compliance with these instructions.",
        "Output only the agent-to-agent reply."
    ].filter(part => part !== "").join('\n');
}
