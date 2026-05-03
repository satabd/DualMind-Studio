import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Build pipeline must be a React + Tailwind pipeline.
// ---------------------------------------------------------------------------
const vite = readFileSync(resolve('vite.config.ts'), 'utf8');
const tsconfig = readFileSync(resolve('tsconfig.json'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const panelHtml = readFileSync(resolve('src/panel.html'), 'utf8');
const panelTs = readFileSync(resolve('src/panel.ts'), 'utf8');

assert.match(vite, /@vitejs\/plugin-react/, 'Vite must include the React plugin');
assert.match(vite, /studio:\s*resolve\(__dirname,\s*'src\/studio\.html'\)/, 'Vite must build studio.html');
assert.match(tsconfig, /"jsx"\s*:\s*"react-jsx"/, 'tsconfig must enable react-jsx');
assert.ok(pkg.dependencies.react, 'package.json must depend on react');
assert.ok(pkg.dependencies['react-dom'], 'package.json must depend on react-dom');
assert.ok(pkg.dependencies.zustand, 'package.json must depend on zustand');
assert.ok(pkg.dependencies['@radix-ui/react-tabs'], 'package.json must depend on @radix-ui/react-tabs');
assert.ok(pkg.devDependencies.tailwindcss, 'package.json must devDepend on tailwindcss');
assert.ok(pkg.devDependencies['@vitejs/plugin-react'], 'package.json must devDepend on @vitejs/plugin-react');
assert.ok(existsSync(resolve('postcss.config.cjs')), 'postcss.config.cjs must exist (the .cjs extension matters)');
assert.ok(existsSync(resolve('tailwind.config.ts')), 'tailwind.config.ts must exist');

// ---------------------------------------------------------------------------
// Studio entry: HTML must be a single mount div + script reference to studio.tsx.
// ---------------------------------------------------------------------------
const studioHtmlPath = resolve('src/studio.html');
const studioTsxPath = resolve('src/studio.tsx');
const studioCssPath = resolve('src/studio.css');

assert.ok(existsSync(studioHtmlPath), 'studio.html must exist as the workshop tab entry');
assert.ok(existsSync(studioTsxPath), 'studio.tsx must drive the workshop tab as a React app');
assert.ok(existsSync(studioCssPath), 'studio.css must style the workshop tab');
assert.ok(!existsSync(resolve('src/studio.ts')), 'legacy src/studio.ts must be removed (replaced by studio.tsx)');

const studioHtml = readFileSync(studioHtmlPath, 'utf8');
const studioTsx = readFileSync(studioTsxPath, 'utf8');
const studioCss = readFileSync(studioCssPath, 'utf8');

assert.match(studioHtml, /id="studioMount"/, 'studio.html must contain the React mount point');
assert.match(studioHtml, /studio\.tsx/, 'studio.html must reference studio.tsx');
assert.match(studioTsx, /createRoot/, 'studio.tsx must boot React with createRoot');
assert.match(studioTsx, /studioMount/, 'studio.tsx must mount into #studioMount');

// Side-panel integration must still open the studio tab.
assert.match(panelHtml, /id="openWorkshopBtn"/, 'side panel must expose an Open Workshop button');
assert.match(panelTs, /openWorkshopBtn/, 'panel script must bind the Open Workshop button');
assert.match(panelTs, /createTab\('studio\.html'\)/, 'panel must open the workshop tab manually');

// ---------------------------------------------------------------------------
// Design tokens — every component reads tokens, never hex codes.
// ---------------------------------------------------------------------------
assert.match(studioCss, /@tailwind base/, 'studio.css must include the Tailwind base layer');
assert.match(studioCss, /@tailwind components/, 'studio.css must include the Tailwind components layer');
assert.match(studioCss, /--color-seat-a:/, 'studio.css must define the seat A token');
assert.match(studioCss, /--color-seat-b:/, 'studio.css must define the seat B token');
assert.match(studioCss, /--color-system:/, 'studio.css must define the system token');
assert.match(studioCss, /prefers-color-scheme: dark/, 'studio.css must define dark-mode tokens');
assert.match(studioCss, /\.prose-studio/, 'studio.css must define prose-studio markdown styles');
assert.match(studioCss, /padding-inline-start/, 'prose-studio must use logical properties for RTL correctness');

// ---------------------------------------------------------------------------
// Header status model — lifecycle separated from phase / intent.
// ---------------------------------------------------------------------------
const header = readFileSync(resolve('src/studio/components/Header.tsx'), 'utf8');
assert.match(header, /deriveLifecycle/, 'Header must derive a lifecycle status (idle/running/paused/finished)');
assert.match(header, /finished/, 'Header must distinguish a finished session from idle');
assert.match(header, /DIVERGE: 'Explore'/, 'Header must use friendly phase names (DIVERGE → Explore)');
assert.match(header, /CONVERGE: 'Narrow'/, 'Header must use friendly phase names (CONVERGE → Narrow)');
assert.match(header, /FINALIZE: 'Finalize'/, 'Header must use friendly phase names (FINALIZE → Finalize)');
assert.match(header, /lastTurnPhase/, 'Header must derive the displayed phase from the last completed turn when finished');
assert.doesNotMatch(header, /breadcrumbParts\.push\(state\.currentIntent\)/, 'Header must not show the raw current intent string');
assert.doesNotMatch(header, /breadcrumbParts\.push\(state\.currentPhase\)/, 'Header must not show the raw current phase string');

// ---------------------------------------------------------------------------
// Component composition: the App tree must include all the major pieces.
// ---------------------------------------------------------------------------
const appPath = resolve('src/studio/App.tsx');
assert.ok(existsSync(appPath), 'src/studio/App.tsx must exist');
const app = readFileSync(appPath, 'utf8');
assert.match(app, /id="studioRoot"/, 'App must render a #studioRoot wrapper');
assert.match(app, /<Header\s*\/>/, 'App must render the Header');
assert.match(app, /<ThrottlingNotice\s*\/>/, 'App must render the ThrottlingNotice banner');
assert.match(app, /id="studioTabs"/, 'App must render the tabs container');
assert.match(app, /id="tabTriggerSessions"/, 'App must render the Sessions tab trigger');
assert.match(app, /id="tabTriggerMemory"/, 'App must render the Memory tab trigger');
assert.match(app, /id="tabTriggerDecisions"/, 'App must render the Decisions tab trigger');
assert.match(app, /id="tabTriggerAgents"/, 'App must render the Agents tab trigger');
assert.match(app, /document\.visibilityState/, 'App must visibility-gate its polling loop');

// ---------------------------------------------------------------------------
// Required component / store / lib files exist.
// ---------------------------------------------------------------------------
const requiredFiles = [
    'src/studio/lib/utils.ts',
    'src/studio/lib/extension.ts',
    'src/studio/store/workshop.ts',
    'src/studio/ui/button.tsx',
    'src/studio/ui/badge.tsx',
    'src/studio/ui/card.tsx',
    'src/studio/ui/tabs.tsx',
    'src/studio/components/Header.tsx',
    'src/studio/components/ThrottlingNotice.tsx',
    'src/studio/components/MarkdownBody.tsx',
    'src/studio/components/Timeline.tsx',
    'src/studio/components/SessionsList.tsx',
    'src/studio/components/Composer.tsx',
    'src/studio/components/EscalationCard.tsx',
    'src/studio/tabs/SessionsTab.tsx',
    'src/studio/tabs/MemoryTab.tsx',
    'src/studio/tabs/DecisionsTab.tsx',
    'src/studio/tabs/AgentsTab.tsx'
];
for (const path of requiredFiles) {
    assert.ok(existsSync(resolve(path)), `${path} must exist`);
}

// ---------------------------------------------------------------------------
// Markdown body must sanitise after parsing, NOT escape before parsing.
// ---------------------------------------------------------------------------
const markdown = readFileSync(resolve('src/studio/components/MarkdownBody.tsx'), 'utf8');
assert.match(markdown, /marked\.parse/, 'MarkdownBody must call marked.parse');
assert.match(markdown, /DOMPurify\.sanitize/, 'MarkdownBody must sanitise rendered HTML');
assert.match(markdown, /dir="auto"/, 'MarkdownBody must use dir="auto" for RTL detection');

// ---------------------------------------------------------------------------
// Timeline geometry — 3-col grid, seat-tinted cards, sticky round headers.
// ---------------------------------------------------------------------------
const timeline = readFileSync(resolve('src/studio/components/Timeline.tsx'), 'utf8');
assert.match(timeline, /grid-cols-\[80px_36px_1fr\]/, 'Timeline must use the 80/36/1fr column grid');
assert.match(timeline, /bg-seat-a-soft/, 'Timeline must use seat-A tinted card backgrounds');
assert.match(timeline, /bg-seat-b-soft/, 'Timeline must use seat-B tinted card backgrounds');
assert.match(timeline, /MutationObserver|scrollIntoView/, 'Timeline must implement auto-scroll on new turns');
assert.match(timeline, /Move to last/, 'Timeline must expose a "Move to last" jump button');
assert.match(timeline, /id="timelineScroll"/, 'Timeline must keep the stable timelineScroll DOM id');
assert.match(timeline, /id="jumpToLastBtn"/, 'Timeline must keep the stable jumpToLastBtn DOM id');

// ---------------------------------------------------------------------------
// Composer must keep the Ctrl+Period hotkey contract from the legacy studio.
// ---------------------------------------------------------------------------
const composer = readFileSync(resolve('src/studio/components/Composer.tsx'), 'utf8');
assert.match(composer, /Ctrl\+Period|key === '\.'/i, 'Composer must wire the Ctrl+Period hotkey');
assert.match(composer, /pauseBrainstorm|resumeBrainstorm/, 'Composer must call the existing pause/resume runtime messages');
assert.match(composer, /\[CRITICAL OVERRIDE\]/, 'Composer must show the moderator wrapper preview');

// ---------------------------------------------------------------------------
// Store must guard against stale refresh responses.
// ---------------------------------------------------------------------------
const store = readFileSync(resolve('src/studio/store/workshop.ts'), 'utf8');
assert.match(store, /refreshToken/, 'store must use a refresh token to discard stale responses');
assert.match(store, /selectedSessionId/, 'store must track the user-selected session');
assert.match(store, /getBrainstormState|fetchBrainstormState/, 'store must read background state');
assert.match(store, /getSession|fetchSession/, 'store must read sessions');

// ---------------------------------------------------------------------------
// ThrottlingNotice must point users at the chrome://settings/performance fix
// — that is the actual remedy for hidden-tab throttling.
// ---------------------------------------------------------------------------
const notice = readFileSync(resolve('src/studio/components/ThrottlingNotice.tsx'), 'utf8');
assert.match(notice, /chrome:\/\/settings\/performance/, 'ThrottlingNotice must link to chrome://settings/performance');
assert.match(notice, /chatgpt\.com/, 'ThrottlingNotice must mention chatgpt.com');
assert.match(notice, /gemini\.google\.com/, 'ThrottlingNotice must mention gemini.google.com');

console.log('studio workshop source tests passed');
