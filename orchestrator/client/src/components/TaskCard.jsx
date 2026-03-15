import React from 'react';
import { useTheme } from '../ThemeContext';

const priorityColors = {
  high: 'var(--status-failed)',
  medium: 'var(--status-pending)',
  low: 'var(--text-secondary)',
};

const statusColors = {
  pending: 'var(--status-pending)',
  inProgress: 'var(--status-running)',
  done: 'var(--status-done)',
  failed: 'var(--status-failed)',
};

function TaskItem({ task, status, theme }) {
  const title = task.filename
    ?.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace('.md', '') || task.id || 'Task';

  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';
  const accentColor = statusColors[status];

  const priorityLabel = (task.priority || 'medium').toUpperCase();
  const priorityShort = { HIGH: 'HIGH', MEDIUM: 'MED ', LOW: 'LOW ' }[priorityLabel] || 'MED ';

  return (
    <li
      style={{
        padding: '10px 0',
        borderBottom: isForge
          ? '2px dashed var(--border)'
          : `1px solid var(--border)`,
        display: 'flex',
        alignItems: 'center',
        gap: isSignal ? 12 : 10,
        fontFamily: isSignal ? 'var(--font-data)' : 'var(--font-body)',
        fontSize: 13,
        cursor: 'default',
        transition: 'background 0.1s',
        position: 'relative',
        paddingLeft: isSignal ? 8 : 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        if (isSignal) {
          e.currentTarget.style.borderLeft = '2px solid var(--accent)';
          e.currentTarget.style.paddingLeft = '6px';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        if (isSignal) {
          e.currentTarget.style.borderLeft = 'none';
          e.currentTarget.style.paddingLeft = '8px';
        }
      }}
    >
      {/* Status dot */}
      <span style={{
        width: 6,
        height: 6,
        borderRadius: isSignal ? 0 : '50%',
        background: accentColor,
        flexShrink: 0,
      }} />

      {/* Priority */}
      {isForge ? (
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 'var(--radius-badge)',
          border: 'var(--border-width) solid var(--border)',
          background: priorityColors[task.priority || 'medium'],
          color: 'var(--text-inverse)',
          fontFamily: 'var(--font-heading)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}>
          {task.priority || 'medium'}
        </span>
      ) : (
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: priorityColors[task.priority || 'medium'],
          fontFamily: 'var(--font-data)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          flexShrink: 0,
          width: isSignal ? 36 : 'auto',
        }}>
          {isSignal ? priorityShort : (task.priority || 'medium')}
        </span>
      )}

      {/* Title */}
      <span style={{
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        color: 'var(--text-primary)',
        fontWeight: isMeridian ? 400 : 500,
      }}>
        {title}
      </span>

      {/* Project */}
      <span style={{
        fontSize: 11,
        color: 'var(--text-ghost)',
        fontFamily: 'var(--font-data)',
        flexShrink: 0,
      }}>
        {task.project || ''}
      </span>
    </li>
  );
}

export default function TaskCard({ title, status, tasks, count, delay = 0 }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';
  const accentColor = statusColors[status];

  const sectionPrefix = isSignal ? '> ' : (isMeridian ? '◈ ' : '');

  return (
    <div
      className={`animate-entrance hud-card`}
      style={{
        background: 'var(--card-bg)',
        border: `var(--border-width) solid var(--card-border)`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        position: 'relative',
        animationDelay: `${delay}s`,
      }}
    >
      {/* Left accent bar for FORGE */}
      {isForge && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accentColor,
        }} />
      )}

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: `1px solid var(--border)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: isMeridian ? 16 : 13,
          fontWeight: isMeridian ? 600 : 700,
          textTransform: isMeridian ? 'none' : 'uppercase',
          letterSpacing: isMeridian ? '0.02em' : '0.08em',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-heading)',
        }}>
          <span style={{ color: 'var(--accent)' }}>{sectionPrefix}</span>
          {title}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 10px',
          borderRadius: 'var(--radius-badge)',
          background: 'var(--accent-glow)',
          color: 'var(--accent)',
          border: isForge ? 'var(--border-width) solid var(--border)' : `1px solid var(--accent-muted)`,
          fontFamily: 'var(--font-data)',
        }}>
          {count}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 20px 16px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {tasks.length === 0 ? (
            <li style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: 'var(--text-ghost)',
              fontSize: 13,
              fontFamily: 'var(--font-data)',
            }}>
              {isSignal ? (
                <>
                  <span style={{ color: 'var(--accent)' }}>{'>'} </span>
                  NO {status.toUpperCase()} TASKS
                  <span style={{ animation: 'cursorBlink 1s step-end infinite' }}>_</span>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.3 }}>
                    {isMeridian ? '◈' : '○'}
                  </div>
                  No {status} tasks
                </>
              )}
            </li>
          ) : (
            tasks.slice(0, 5).map((task, i) => (
              <TaskItem key={task.filename || task.id || i} task={task} status={status} theme={theme} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
