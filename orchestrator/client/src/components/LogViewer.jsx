import React, { useEffect, useRef } from 'react';

function formatLine(line) {
  const ts = line.match(/\[(.+?)\]/)?.[1] || '';
  const level = line.includes('ERROR')
    ? 'error'
    : line.includes('WARN')
    ? 'warn'
    : 'info';

  const colorMap = {
    info: { color: 'var(--accent-cyan)', textShadow: '0 0 8px rgba(6,182,212,0.15)' },
    warn: { color: 'var(--status-pending)', textShadow: '0 0 8px rgba(245,158,11,0.15)' },
    error: { color: 'var(--status-failed)', textShadow: '0 0 8px rgba(239,68,68,0.2)' },
  };

  return { ts, text: line.replace(/\[.+?\]\s*/, ''), style: colorMap[level] };
}

export default function LogViewer({ logs, delay = 0 }) {
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

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
      }}
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

      {/* Terminal header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Terminal
        </span>
        <span />
      </div>

      {/* Log output */}
      <div
        ref={outputRef}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          lineHeight: 1.7,
          padding: '16px 20px',
          height: 320,
          overflowY: 'auto',
          background: 'rgba(8, 8, 14, 0.6)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs.map((line, i) => {
          const { ts, text, style } = formatLine(line);
          return (
            <span key={i}>
              <span style={{ color: '#3a3a50', marginRight: 8 }}>{ts}</span>
              <span style={style}>{text}</span>
              {'\n'}
            </span>
          );
        })}
      </div>
    </div>
  );
}
