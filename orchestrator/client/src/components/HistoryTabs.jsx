import React, { useState } from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';
import TaskCard from './TaskCard';

export default function HistoryTabs({ doneTasks, failedTasks, delay = 0 }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('done');
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const tabs = [
    {
      id: 'done',
      label: isMeridian ? 'Completed' : 'COMPLETED',
      count: doneTasks.length,
    },
    {
      id: 'failed',
      label: isMeridian ? 'Failed' : 'FAILED',
      count: failedTasks.length,
    },
  ];

  const tabBarStyle = {
    display: 'flex',
    gap: 4,
    marginBottom: 0,
    borderBottom: `var(--border-width) solid var(--border)`,
    background: 'var(--card-bg)',
    borderTop: `var(--border-width) solid var(--card-border)`,
    borderLeft: `var(--border-width) solid var(--card-border)`,
    borderRight: `var(--border-width) solid var(--card-border)`,
    borderRadius: `var(--radius) var(--radius) 0 0`,
    padding: '0 16px',
    ...(isForge ? {
      boxShadow: `var(--shadow-x) var(--shadow-y) 0 var(--shadow-color)`,
      borderWidth: 2,
    } : {}),
  };

  return (
    <div className="animate-entrance" style={{ animationDelay: `${delay}s` }}>
      {/* Tab Bar */}
      <div style={tabBarStyle}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id
                ? `2px solid var(--accent)`
                : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-data)',
              textTransform: isMeridian ? 'none' : 'uppercase',
              letterSpacing: isMeridian ? '0.02em' : '0.08em',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -1,
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {tab.label}
            <span style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 'var(--radius-badge)',
              background: activeTab === tab.id ? 'var(--accent-glow)' : 'var(--bg-elevated)',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-ghost)',
              fontWeight: 600,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content — wraps TaskCard but removes its top rounded corners */}
      <div style={{
        borderRadius: `0 0 var(--radius) var(--radius)`,
        overflow: 'hidden',
      }}>
        {activeTab === 'done' ? (
          <TaskCard
            title={isMeridian ? 'Completed' : 'COMPLETED'}
            status="done"
            tasks={doneTasks}
            count={doneTasks.length}
            delay={0}
            hideHeader={true}
          />
        ) : (
          <TaskCard
            title={isMeridian ? 'Failed' : 'FAILED'}
            status="failed"
            tasks={failedTasks}
            count={failedTasks.length}
            delay={0}
            hideHeader={true}
          />
        )}
      </div>
    </div>
  );
}
