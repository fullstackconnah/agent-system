import React from 'react';

function ContainerItem({ container }) {
  return (
    <li
      style={{
        background: 'rgba(12, 12, 20, 0.5)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'transform 0.15s, border-color 0.2s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--accent-cyan)',
          }}
        >
          {container.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          {container.image} · {container.status}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--status-done)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--status-done)',
            boxShadow: '0 0 6px var(--status-done), 0 0 12px rgba(16,185,129,0.3)',
            animation: 'glowPulse 2s ease-in-out infinite',
            display: 'inline-block',
          }}
        />
        Running
      </div>
    </li>
  );
}

export default function ContainerCard({ containers, delay = 0 }) {
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
          top: 0, left: 0, right: 0,
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
          Active Agents
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
          {containers.length}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {containers.length === 0 ? (
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
              No agents running
            </li>
          ) : (
            containers.map((c) => <ContainerItem key={c.id} container={c} />)
          )}
        </ul>
      </div>
    </div>
  );
}
