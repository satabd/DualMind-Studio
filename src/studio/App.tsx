import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.js';
import { Header } from './components/Header.js';
import { ThrottlingNotice } from './components/ThrottlingNotice.js';
import { SessionsTab } from './tabs/SessionsTab.js';
import { MemoryTab } from './tabs/MemoryTab.js';
import { DecisionsTab } from './tabs/DecisionsTab.js';
import { AgentsTab } from './tabs/AgentsTab.js';
import { useWorkshopStore, type ActiveTab } from './store/workshop.js';

export function App() {
    const { activeTab, setActiveTab, refresh, state, selectedSession } = useWorkshopStore();

    // Visibility-gated polling: every 2s while the Workshop tab is in front,
    // plus an immediate refresh on focus / first mount.
    useEffect(() => {
        refresh();
        const handle = window.setInterval(() => {
            if (document.visibilityState === 'visible') refresh();
        }, 2000);
        const visibilityHandler = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        return () => {
            window.clearInterval(handle);
            document.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, [refresh]);

    const memoryCount = selectedSession?.memory?.entries?.length ?? 0;
    const decisionCount = (selectedSession?.memory?.entries || []).filter(e => e.kind === 'decision').length
        + (selectedSession?.moderatorDecisions?.length ?? 0);

    return (
        <div id="studioRoot" className="min-h-screen flex flex-col bg-bg text-fg">
            <Header />
            <ThrottlingNotice />

            <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as ActiveTab)}
                className="flex-1 flex flex-col"
            >
                <div className="px-3 pt-3 pb-1 sm:px-5">
                    <TabsList id="studioTabs">
                        <TabsTrigger value="sessions" id="tabTriggerSessions">
                            Sessions
                            {state.awaitingHumanDecision && (
                                <span className="w-2 h-2 rounded-full bg-danger" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="memory" id="tabTriggerMemory">
                            Memory
                            {memoryCount > 0 && (
                                <span className="text-[10px] font-mono text-fg-subtle">({memoryCount})</span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="decisions" id="tabTriggerDecisions">
                            Decisions
                            {decisionCount > 0 && (
                                <span className="text-[10px] font-mono text-fg-subtle">({decisionCount})</span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="agents" id="tabTriggerAgents">
                            Agents
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 px-3 pb-5 sm:px-5">
                    <TabsContent value="sessions" className="mt-0 h-full">
                        <SessionsTab />
                    </TabsContent>
                    <TabsContent value="memory" className="mt-0 h-full">
                        <MemoryTab />
                    </TabsContent>
                    <TabsContent value="decisions" className="mt-0 h-full">
                        <DecisionsTab />
                    </TabsContent>
                    <TabsContent value="agents" className="mt-0 h-full">
                        <AgentsTab />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
