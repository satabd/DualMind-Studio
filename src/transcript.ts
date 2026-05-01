import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BrainstormSession } from './types.js';
import { buildSessionMarkdown } from './sessionExport.js';

document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('content');
    const titleEl = document.getElementById('transcriptTitle');
    const printBtn = document.getElementById('printBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const metaEl = document.getElementById('transcriptMeta');

    let rawMarkdown = '';
    let filenameToDownload = 'transcript.md';
    let livePollHandle: number | null = null;

    function renderMarkdown(markdown: string) {
        rawMarkdown = markdown;
        if (contentEl) {
            const html = marked.parse(markdown) as string;
            contentEl.innerHTML = DOMPurify.sanitize(html);
        }
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
                renderMarkdown(buildSessionMarkdown(session));
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
