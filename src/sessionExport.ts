import { BrainstormSession, TranscriptEntry } from './types.js';

function formatSessionHeader(session: BrainstormSession, title: string) {
    return [
        `# ${title}`,
        "",
        `**Topic:** ${session.topic}`,
        `**Role:** ${session.role}`,
        `**Mode:** ${session.mode}`,
        `**Started:** ${new Date(session.timestamp).toLocaleString()}`,
        "",
        "---",
        ""
    ].join('\n');
}

function formatTranscriptEntry(entry: TranscriptEntry) {
    const meta = [
        entry.phase ? `Phase: ${entry.phase}` : "",
        entry.intent ? `Intent: ${entry.intent}` : "",
        entry.repairStatus ? `Repair: ${entry.repairStatus}` : ""
    ].filter(Boolean).join(" | ");

    return [
        `## ${entry.agent}`,
        meta ? `_${meta}_\n` : "",
        entry.text,
        ""
    ].join('\n');
}

export function buildSessionMarkdown(session: BrainstormSession) {
    let md = formatSessionHeader(session, "Studio Session");

    session.transcript.forEach(entry => {
        md += `${formatTranscriptEntry(entry)}\n`;
    });

    if (session.escalations && session.escalations.length > 0) {
        md += `---\n\n# Escalations\n\n`;
        session.escalations.forEach((item, index) => {
            md += `## Escalation ${index + 1}\n`;
            md += `- **Reason:** ${item.reason}\n`;
            md += `- **Decision Needed:** ${item.decision_needed}\n`;
            if (item.options.length > 0) {
                md += `- **Options:**\n`;
                item.options.forEach(option => {
                    md += `  - ${option}\n`;
                });
            }
            md += `- **Recommended:** ${item.recommended_option}\n`;
            md += `- **Next Step:** ${item.next_step_after_decision}\n\n`;
        });
    }

    if (session.artifacts?.synthesis) {
        md += `---\n\n# Final Synthesis\n\n${session.artifacts.synthesis}\n`;
    }

    return md.trimEnd();
}

export function buildLastResponseMarkdown(session: BrainstormSession) {
    const lastAgentEntry = session.transcript.filter(entry => entry.agent === "Gemini" || entry.agent === "ChatGPT").slice(-1)[0];
    if (!lastAgentEntry) return buildSessionMarkdown({ ...session, transcript: [] });

    return [
        formatSessionHeader(session, "Studio Last Response"),
        formatTranscriptEntry(lastAgentEntry)
    ].join('').trimEnd();
}
