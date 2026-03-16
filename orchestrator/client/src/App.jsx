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
import TaskPanel from './components/TaskPanel';
import Footer from './components/Footer';

export default function App() {
  const { data, logs, submitTask, cloneRepo } = useApi(5000);
  const { theme } = useTheme();
  const [panelOpen, setPanelOpen] = useState(false);
  const [repoPanelOpen, setRepoPanelOpen] = useState(false);

  const isSignal = theme === 'signal';

  const gridStyle = {
    padding: '24px 32px 60px',
    maxWidth: 1400,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
  };

  return (
    <>
      {/* Scanline overlay for SIGNAL */}
      {isSignal && <div className="scanline-overlay" />}

      <Header online={data.online} onNewTask={() => setPanelOpen(true)} />

      <main style={gridStyle}>
        {/* Stats row */}
        <StatCard type="pending" value={data.pending.length} label="Pending" delay={0} />
        <StatCard type="running" value={data.inProgress.length} label="Running" delay={0.06} />
        <StatCard type="done" value={data.done.length} label="Done" delay={0.12} />
        <StatCard type="failed" value={data.failed.length} label="Failed" delay={0.18} />

        {/* Task cards - 2 columns */}
        <div style={{ gridColumn: 'span 2' }}>
          <TaskCard
            title={isSignal ? 'MISSION QUEUE' : (theme === 'meridian' ? 'Pending Tasks' : 'PENDING TASKS')}
            status="pending"
            tasks={data.pending}
            count={data.pending.length}
            delay={0.24}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <ContainerCard containers={data.containers} delay={0.3} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <TaskCard
            title={isSignal ? 'COMPLETED' : (theme === 'meridian' ? 'Recently Completed' : 'COMPLETED')}
            status="done"
            tasks={data.done}
            count={data.done.length}
            delay={0.36}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <TaskCard
            title={isSignal ? 'FAILED' : (theme === 'meridian' ? 'Failed Tasks' : 'FAILED')}
            status="failed"
            tasks={data.failed}
            count={data.failed.length}
            delay={0.42}
          />
        </div>

        {/* Repositories - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <RepoCard repos={data.repositories} delay={0.48} onAddRepo={() => setRepoPanelOpen(true)} />
        </div>

        {/* Log viewer - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <LogViewer logs={logs} delay={0.54} />
        </div>
      </main>

      <Footer online={data.online} />

      <TaskPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSubmit={submitTask}
      />

      <RepoPanel
        open={repoPanelOpen}
        onClose={() => setRepoPanelOpen(false)}
        onClone={cloneRepo}
        localRepos={data.repositories}
      />
    </>
  );
}
