import React, { useState } from 'react';
import { useApi } from './hooks/useApi';
import { useTheme } from './ThemeContext';
import Header from './components/Header';
import StatCard from './components/StatCard';
import TaskCard from './components/TaskCard';
import ContainerCard from './components/ContainerCard';
import RepoCard from './components/RepoCard';
import RepoPanel from './components/RepoPanel';
import LogViewer from './components/LogViewer';
import QuickTask from './components/QuickTask';
import GoalCard from './components/GoalCard';
import SectionLabel from './components/SectionLabel';
import HistoryTabs from './components/HistoryTabs';
import Footer from './components/Footer';

export default function App() {
  const { data, logs, submitTask, submitGoal, cloneRepo } = useApi(5000);
  const { theme } = useTheme();
  const [repoPanelOpen, setRepoPanelOpen] = useState(false);

  const isSignal = theme === 'signal';
  const isMeridian = theme === 'meridian';

  return (
    <>
      {/* Scanline overlay for SIGNAL */}
      {isSignal && <div className="scanline-overlay" />}

      <Header online={data.online} />

      <main style={{ padding: '24px 32px 60px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Bar — full width */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          <StatCard type="pending" value={data.pending.length} label="Pending" delay={0} />
          <StatCard type="running" value={data.inProgress.length} label="Running" delay={0.06} />
          <StatCard type="done" value={data.done.length} label="Done" delay={0.12} />
          <StatCard type="failed" value={data.failed.length} label="Failed" delay={0.18} />
        </div>

        {/* Two-zone layout */}
        <div className="nexus-two-zone" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* LEFT: Main column */}
          <div style={{ flex: '2.5 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Section: Active Work */}
            <SectionLabel text="ACTIVE WORK" />

            {/* Active Goals + Containers side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <GoalCard
                title={isSignal ? 'ACTIVE GOALS' : (isMeridian ? 'Active Goals' : 'ACTIVE GOALS')}
                goals={[...data.goals.pending, ...data.goals.inProgress]}
                delay={0.18}
              />
              <ContainerCard containers={data.containers} delay={0.24} />
            </div>

            {/* Pending Tasks full-width in left column */}
            <TaskCard
              title={isSignal ? 'MISSION QUEUE' : (isMeridian ? 'Pending Tasks' : 'PENDING TASKS')}
              status="pending"
              tasks={data.pending}
              count={data.pending.length}
              delay={0.30}
            />

            {/* Section: History */}
            <SectionLabel text="HISTORY" />

            {/* Completed Goals */}
            <GoalCard
              title={isSignal ? 'COMPLETED GOALS' : (isMeridian ? 'Completed Goals' : 'COMPLETED GOALS')}
              goals={[...data.goals.done, ...data.goals.failed]}
              delay={0.36}
            />

            {/* History Tabs — Done + Failed tasks */}
            <HistoryTabs
              doneTasks={data.done}
              failedTasks={data.failed}
              delay={0.42}
            />
          </div>

          {/* RIGHT: Sidebar */}
          <div className="nexus-sidebar" style={{ flex: '1 1 0', minWidth: 280, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <QuickTask repos={data.repositories} onSubmit={submitGoal} delay={0.12} defaultOpen={true} />
            <RepoCard repos={data.repositories} delay={0.48} onAddRepo={() => setRepoPanelOpen(true)} />
            <LogViewer logs={logs} delay={0.54} compact={true} />
          </div>
        </div>
      </main>

      <Footer online={data.online} />

      <RepoPanel
        open={repoPanelOpen}
        onClose={() => setRepoPanelOpen(false)}
        onClone={cloneRepo}
        localRepos={data.repositories}
      />
    </>
  );
}
