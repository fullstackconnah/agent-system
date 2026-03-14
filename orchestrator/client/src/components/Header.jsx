import React from 'react';

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'rgba(6, 6, 11, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    padding: '0 32px',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '0.12em',
    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
    backgroundSize: '200% 200%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    animation: 'gradientShift 4s ease infinite',
  },
  logoSub: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-muted)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    animation: 'glowPulse 2s ease-in-out infinite',
    transition: 'background 0.4s, box-shadow 0.4s',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
    border: 'none',
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 20px',
    borderRadius: 'var(--radius-btn)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.3s',
    boxShadow: '0 2px 12px rgba(168,85,247,0.25)',
  },
  plus: {
    fontSize: 18,
    fontWeight: 300,
    lineHeight: 1,
  },
};

export default function Header({ online, onNewTask }) {
  const dotStyle = online
    ? {
        ...styles.statusDot,
        background: 'var(--status-done)',
        boxShadow: '0 0 6px var(--status-done), 0 0 12px rgba(16,185,129,0.3)',
      }
    : {
        ...styles.statusDot,
        background: 'var(--status-failed)',
        boxShadow: '0 0 6px var(--status-failed), 0 0 12px rgba(239,68,68,0.3)',
      };

  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <svg width="36" height="36" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }}>
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <polygon points="50,3 93,25 93,75 50,97 7,75 7,25" fill="url(#logoGrad)" stroke="url(#logoGrad)" strokeWidth="1" />
        </svg>
        <div>
          <div style={styles.logoTitle}>NEXUS</div>
          <div style={styles.logoSub}>Agent Orchestrator</div>
        </div>
      </div>

      <div style={styles.center}>
        <span style={dotStyle} />
        <span style={styles.statusText}>{online ? 'Online' : 'Offline'}</span>
      </div>

      <button
        style={styles.btn}
        onClick={onNewTask}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(168,85,247,0.25)';
        }}
      >
        <span style={styles.plus}>+</span>
        <span>New Task</span>
      </button>
    </header>
  );
}
