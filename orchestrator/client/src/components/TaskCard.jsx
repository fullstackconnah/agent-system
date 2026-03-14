import React from 'react';

const badgeStyles = {
  pending:    { background: 'rgba(245,158,11,0.12)', color: 'var(--status-pending)', border: '1px solid rgba(245,158,11,0.2)' },
  inProgress: { background: 'rgba(6,182,212,0.12)',  color: 'var(--status-running)', border: '1px solid rgba(6,182,212,0.2)' },
  done:       { background: 'rgba(16,185,129,0.12)', color: 'var(--status-done)',    border: '1px solid rgba(16,185,129,0.2)' },
  failed:     { background: 'rgba(239,68,68,0.12)',  color: 'var(--status-failed)',  border: '1px solid rgba(239,68,68,0.2)' },
};

const accentColors = {
  pending: 'var(--status-pending)',
  inProgress: 'var(--status-running)',
  done: 'var(--status-done)',
  failed: 'var(--status-failed)',
};

const priorityColors = {
  high: 'var(--status-failed)',
  medium: 'var(--status-pending)',
  low: 'var(--text-muted)',
};

function TaskItem({ task, status }) {
  const title = task.filename
    ?.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace('.md', '') || task.id || 'Task';

  return (
    <li
      style={{
        background: 'rgba(12, 12, 20, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        transition: 'transform 0.15s, border-color 0.2s, background 0.2s',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
        e.currentTarget.style.background = 'rgba(18, 18, 30, 0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'rgba(12, 12, 20, 0.5)';
      }}
    >
      {/* Left accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: accentColors[status],
        }}
      />

      {/* Badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 'var(--radius-badge)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginTop: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          ...badgeStyles[status],
        }}
      >
        {status}
      </span>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {task.project || ''}
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: priorityColors[task.priority || 'medium'] }}>
            {task.priority || 'medium'}
          </span>
        </div>
      </div>
    </li>
  );
}

export default function TaskCard({ title, status, tasks, count, delay = 0 }) {
  return (
    <div
      className="animate-entrance"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        position: 'relative',
        animationDelay: `${delay}s`,
        transition: 'border-color 0.3s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Gradient top border */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan), var(--accent-pink))',
          opacity: 0.6,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.15))',
            color: 'var(--accent-cyan)',
            border: '1px solid rgba(6,182,212,0.15)',
          }}
        >
          {count}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.length === 0 ? (
            <li
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>○</div>
              No {status} tasks
            </li>
          ) : (
            tasks.slice(0, 5).map((task, i) => (
              <TaskItem key={task.filename || task.id || i} task={task} status={status} />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
