import React, { useEffect, useRef, useState } from 'react';

const colorMap = {
  pending: { color: 'var(--status-pending)', glow: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  running: { color: 'var(--status-running)', glow: 'rgba(6,182,212,0.4)', bg: 'rgba(6,182,212,0.12)', icon: '⚡' },
  done:    { color: 'var(--status-done)',    glow: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.12)', icon: '✓' },
  failed:  { color: 'var(--status-failed)',  glow: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.12)',  icon: '✕' },
};

export default function StatCard({ type, value, label, delay = 0 }) {
  const { color, glow, bg, icon } = colorMap[type];
  const prevRef = useRef(value);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 350);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div
      className="animate-entrance"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${delay}s`,
        transition: 'transform 0.2s, border-color 0.3s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: '0 4px 4px 0',
          background: color,
          boxShadow: `0 0 12px ${glow}`,
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          background: bg,
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          className={pop ? 'counter-pop' : ''}
          style={{
            fontSize: 28,
            fontWeight: 800,
            lineHeight: 1,
            color,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
