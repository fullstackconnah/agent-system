import React, { useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';

function formatLine(line, theme) {
  const ts = line.match(/\[(.+?)\]/)?.[1] || '';
  const isError = line.includes('ERROR');
  const isWarn = line.includes('WARN');
  const level = isError ? 'error' : isWarn ? 'warn' : 'info';

  const isMeridian = theme === 'meridian';

  const colorMap = {
    info:  { color: isMeridian ? 'var(--text-secondary)' : 'var(--text-secondary)' },
    warn:  { color: 'var(--status-pending)' },
    error: { color: 'var(--status-failed)' },
  };

  return { ts, text: line.replace(/\[.+?\]\s*/, ''), style: colorMap[level] };
}

export default function LogViewer({ logs, delay = 0 }) {
  const { theme } = useTheme();
  const outputRef = useRef(null);

  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';

  const sectionPrefix = isSignal ? '> ' : (isMeridian ? '◈ ' : '');

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className="animate-entrance hud-card"
      style={{
        background: 'var(--card-bg)',
        border: `var(--border-width) solid var(--card-border)`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        position: 'relative',
        animationDelay: `${delay}s`,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
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
          {isMeridian ? 'System Log' : 'SYSTEM LOG'}
        </span>
        <span style={{
          fontSize: 11,
          color: 'var(--text-ghost)',
          fontFamily: 'var(--font-data)',
        }}>
          {logs.length} lines
        </span>
      </div>

      {/* Log output */}
      <div
        ref={outputRef}
        style={{
          fontFamily: 'var(--font-data)',
          fontSize: 12,
          lineHeight: 1.6,
          padding: '16px 20px',
          height: 360,
          overflowY: 'auto',
          background: isForge ? 'var(--bg-surface)' : 'var(--bg-terminal)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {logs.length === 0 ? (
          <span style={{ color: 'var(--text-ghost)' }}>
            {isSignal ? (
              <>
                <span style={{ color: 'var(--accent)' }}>{'>'} </span>
                Awaiting log output
                <span style={{ animation: 'cursorBlink 1s step-end infinite' }}>_</span>
              </>
            ) : (
              'Awaiting log output...'
            )}
          </span>
        ) : (
          logs.map((line, i) => {
            const { ts, text, style } = formatLine(line, theme);
            return (
              <span key={i}>
                <span style={{
                  color: isMeridian ? 'var(--accent)' : 'var(--text-ghost)',
                  marginRight: 8,
                  opacity: isMeridian ? 0.7 : 1,
                }}>
                  {ts}
                </span>
                <span style={style}>{text}</span>
                {'\n'}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}
