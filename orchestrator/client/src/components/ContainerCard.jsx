import React from 'react';
import { useTheme } from '../ThemeContext';

function ContainerItem({ container, theme }) {
  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';

  return (
    <li style={{
      padding: '10px 0',
      borderBottom: isForge
        ? '2px dashed var(--border)'
        : '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'default',
      transition: 'background 0.1s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-data)',
          color: isSignal ? 'var(--accent-dim)' : 'var(--accent)',
        }}>
          {container.name}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-ghost)',
          marginTop: 3,
          fontFamily: 'var(--font-data)',
        }}>
          {container.image} · {container.status}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--status-running)',
        fontFamily: 'var(--font-data)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: isSignal ? 0 : '50%',
          background: 'var(--status-running)',
          animation: 'pulse 2s ease-in-out infinite',
          display: 'inline-block',
          ...(isMeridian ? { boxShadow: '0 0 6px rgba(72, 187, 120, 0.4)' } : {}),
        }} />
        Running
      </div>
    </li>
  );
}

export default function ContainerCard({ containers, delay = 0 }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';

  const sectionPrefix = isSignal ? '> ' : (isMeridian ? '◈ ' : '');

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
      {/* Left accent bar for FORGE */}
      {isForge && (
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: 'var(--status-running)',
        }} />
      )}

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
          Active Agents
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 10px',
          borderRadius: 'var(--radius-badge)',
          background: 'var(--accent-glow)',
          color: 'var(--accent)',
          border: isForge ? 'var(--border-width) solid var(--border)' : '1px solid var(--accent-muted)',
          fontFamily: 'var(--font-data)',
        }}>
          {containers.length}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 20px 16px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {containers.length === 0 ? (
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
                  NO ACTIVE AGENTS
                  <span style={{ animation: 'cursorBlink 1s step-end infinite' }}>_</span>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.3 }}>
                    {isMeridian ? '◈' : '○'}
                  </div>
                  No agents running
                </>
              )}
            </li>
          ) : (
            containers.map((c) => <ContainerItem key={c.id} container={c} theme={theme} />)
          )}
        </ul>
      </div>
    </div>
  );
}
