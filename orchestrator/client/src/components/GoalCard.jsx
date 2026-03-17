import React, { useState } from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

const statusColors = {
  pending: 'var(--status-pending)',
  in_progress: 'var(--status-running)',
  done: 'var(--status-done)',
  failed: 'var(--status-failed)',
};

function SubtaskRow({ subtask, theme }) {
  const isSignal = theme === 'signal';
  const color = statusColors[subtask.status] || 'var(--text-ghost)';

  return (
    <li style={{
      padding: '8px 12px 8px 28px',
      borderBottom: `1px solid var(--border)`,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      fontFamily: isSignal ? 'var(--font-data)' : 'var(--font-body)',
      fontSize: 13,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: isSignal ? 0 : '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: 'var(--text-primary)', flex: 1 }}>
        {subtask.title || subtask.externalId}
      </span>
      <span style={{ fontSize: 10, color, fontFamily: 'var(--font-data)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {subtask.status.replace('_', ' ')}
      </span>
    </li>
  );
}

function GoalRow({ goal }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const color = statusColors[goal.status] || 'var(--text-ghost)';
  const hasSubtasks = goal.subtasks?.length > 0;

  return (
    <li style={{ borderBottom: isForge ? '2px dashed var(--border)' : '1px solid var(--border)' }}>
      {/* Goal header row */}
      <div
        style={{
          padding: '10px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: hasSubtasks ? 'pointer' : 'default',
          fontFamily: isSignal ? 'var(--font-data)' : 'var(--font-body)',
        }}
        onClick={() => hasSubtasks && setExpanded(e => !e)}
      >
        <span style={{ width: 8, height: 8, borderRadius: isSignal ? 0 : '50%', background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>
          {goal.title || goal.externalId}
        </span>
        {hasSubtasks && (
          <span style={{ fontSize: 10, color: 'var(--text-ghost)', fontFamily: 'var(--font-data)' }}>
            {goal.subtasks.length} subtask{goal.subtasks.length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>
          {goal.project}
        </span>
        <span style={{ fontSize: 10, color, fontFamily: 'var(--font-data)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {goal.status.replace('_', ' ')}
        </span>
      </div>

      {/* Summary (when done) */}
      {goal.status === 'done' && goal.summary && (
        <div style={{
          padding: '4px 12px 10px 18px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          lineHeight: 1.5,
          borderLeft: `2px solid var(--status-done)`,
          marginLeft: 4,
          marginBottom: 4,
        }}>
          {goal.summary}
        </div>
      )}

      {/* Subtasks (collapsible) */}
      {expanded && hasSubtasks && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {goal.subtasks.map(s => (
            <SubtaskRow key={s.taskId} subtask={s} theme={theme} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function GoalCard({ goals = [], title, delay = 0 }) {
  const { theme } = useTheme();
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const cardStyle = {
    background: 'var(--bg-surface)',
    border: `var(--border-width) solid var(--border)`,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    animation: `fadeSlideUp 0.4s ease both`,
    animationDelay: `${delay}s`,
    ...(isForge ? { boxShadow: `var(--shadow-x, 4px) var(--shadow-y, 4px) 0 var(--shadow-color)`, borderWidth: 2 } : {}),
  };

  return (
    <div className="animate-entrance hud-card" style={cardStyle}>
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid var(--border)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11, fontWeight: isMeridian ? 500 : 700,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          textTransform: isMeridian ? 'none' : 'uppercase',
          letterSpacing: isMeridian ? '0.02em' : '0.08em',
        }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-data)' }}>
          {goals.length}
        </span>
      </div>
      <div style={{ padding: '0 20px' }}>
        {goals.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-ghost)', fontSize: 12, fontFamily: 'var(--font-data)' }}>
            No goals
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {goals.slice(0, 10).map(g => <GoalRow key={g.taskId} goal={g} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
