import React, { useState } from 'react';
import { useApi } from './hooks/useApi';
import Header from './components/Header';
import StatCard from './components/StatCard';
import TaskCard from './components/TaskCard';
import ContainerCard from './components/ContainerCard';
import LogViewer from './components/LogViewer';
import TaskPanel from './components/TaskPanel';

const gridStyle = {
  padding: '24px 32px 48px',
  maxWidth: 1440,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 20,
};

export default function App() {
  const { data, logs, submitTask } = useApi(5000);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
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
            title="Pending Tasks"
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
            title="Recently Completed"
            status="done"
            tasks={data.done}
            count={data.done.length}
            delay={0.36}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <TaskCard
            title="Failed"
            status="failed"
            tasks={data.failed}
            count={data.failed.length}
            delay={0.42}
          />
        </div>

        {/* Log viewer - full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <LogViewer logs={logs} delay={0.48} />
        </div>
      </main>

      <TaskPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSubmit={submitTask}
      />
    </>
  );
}
