import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { cn } from '../lib/utils.js';

// Markdown rendering rules:
// 1. marked → DOMPurify (in that order).  Escaping markdown source before
//    parsing breaks fences and tables; sanitize the rendered HTML instead.
// 2. dir="auto" on the wrapper triggers browser-native RTL detection per
//    paragraph, so Arabic / Hebrew turns flow right-to-left without us
//    having to detect script ourselves.  prose-studio styles use logical
//    properties so lists and blockquotes flip correctly.

const SANITIZE_CONFIG: DOMPurify.Config = {
    ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'del', 'a', 'code', 'pre',
        'ul', 'ol', 'li',
        'blockquote', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'dir']
};

interface MarkdownBodyProps {
    text: string;
    className?: string;
}

export function MarkdownBody({ text, className }: MarkdownBodyProps) {
    const html = useMemo(() => {
        const raw = marked.parse(text || '', { async: false }) as string;
        return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
    }, [text]);

    return (
        <div
            dir="auto"
            className={cn('prose-studio text-sm text-fg', className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
