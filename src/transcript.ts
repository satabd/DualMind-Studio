import { marked } from 'marked';
import { BrainstormSession } from './types.js';

document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('content');
    const titleEl = document.getElementById('transcriptTitle');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const metaEl = document.getElementById('transcriptMeta');

    let rawMarkdown = '';
    let filenameToDownload = 'transcript.md';
    let livePollHandle: number | null = null;

    function escapeHtml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function sanitizeMarkdownInput(markdown: string) {
        return escapeHtml(markdown);
    }

    function renderMarkdown(markdown: string) {
        rawMarkdown = markdown;
        if (contentEl) {
            const html = marked.parse(sanitizeMarkdownInput(markdown));
            contentEl.innerHTML = html as string;
        }
    }

    function buildMarkdownFromSession(session: BrainstormSession): string {
        let md = `# Live Session\n\n`;
        md += `**Topic:** ${session.topic}\n`;
        md += `**Role:** ${session.role}\n`;
        md += `**Mode:** ${session.mode}\n`;
        md += `**Started:** ${new Date(session.timestamp).toLocaleString()}\n\n---\n\n`;

        session.transcript.forEach(entry => {
            md += `## ${entry.agent}\n\n${entry.text}\n\n`;
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

        return md;
    }

    function startLiveMonitor(sessionId: string) {
        if (titleEl) titleEl.textContent = 'Live Session Monitor';
        filenameToDownload = `live-session-${sessionId}.md`;

        const poll = () => {
            chrome.runtime.sendMessage({ action: 'getSession', id: sessionId }, (session: BrainstormSession | null) => {
                if (!session) {
                    if (metaEl) metaEl.textContent = 'Waiting for session data...';
                    return;
                }

                if (metaEl) {
                    metaEl.textContent = `Live updates every 2 seconds. Last refresh ${new Date().toLocaleTimeString()}`;
                }
                renderMarkdown(buildMarkdownFromSession(session));
            });
        };

        poll();
        livePollHandle = window.setInterval(poll, 2000);
    }

    const sessionId = new URLSearchParams(window.location.search).get('liveSessionId');
    if (sessionId) {
        startLiveMonitor(sessionId);
    } else {
        chrome.storage.local.get(['transcriptData', 'transcriptMeta'], (result) => {
            if (!result.transcriptData) {
                if (contentEl) contentEl.innerHTML = '<p>No transcript data found.</p>';
                return;
            }

            rawMarkdown = result.transcriptData;

            if (result.transcriptMeta) {
                if (titleEl) titleEl.textContent = result.transcriptMeta.title || 'Chat Transcript';
                if (metaEl && result.transcriptMeta.date) {
                    metaEl.textContent = `Generated on ${new Date(result.transcriptMeta.date).toLocaleString()}`;
                }
                if (result.transcriptMeta.filename) {
                    filenameToDownload = result.transcriptMeta.filename;
                }
            }

            renderMarkdown(rawMarkdown);
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!rawMarkdown) return;
            const blob = new Blob([rawMarkdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filenameToDownload;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    window.addEventListener('beforeunload', () => {
        if (livePollHandle !== null) {
            window.clearInterval(livePollHandle);
        }
    });
});
