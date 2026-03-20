import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, isForgeTheme } from '../ThemeContext';
import AuthBadge from './AuthBadge';

export default function Header({ online, auth, onRefreshAuth, onLoginAuth }) {
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const logoMark = isMeridian ? '◈' : '■';
  const logoMarkColor = 'var(--accent)';
  const subtitleText = isMeridian ? 'Observatory' : 'Agent Orchestrator';

  const headerStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'var(--header-bg)',
    borderBottom: `var(--border-width) solid var(--border)`,
    padding: '0 32px',
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background 0.3s',
  };

  if (isForge) {
    headerStyle.boxShadow = '0 3px 0 var(--shadow-color)';
  }

  const dotStyle = {
    width: 8,
    height: 8,
    borderRadius: isSignal ? 0 : '50%',
    background: online ? 'var(--status-running)' : 'var(--status-failed)',
    animation: online ? 'pulse 2s ease-in-out infinite' : 'none',
    display: 'inline-block',
    flexShrink: 0,
  };

  if (isMeridian && online) {
    dotStyle.boxShadow = '0 0 6px rgba(245, 166, 35, 0.4)';
  }

  return (
    <header style={headerStyle}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontSize: 14,
          color: logoMarkColor,
          fontFamily: 'var(--font-data)',
        }}>
          {logoMark}
        </span>
        <div>
          <span style={{
            fontSize: 16,
            fontWeight: isMeridian ? 500 : 600,
            letterSpacing: '0.12em',
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            textTransform: isSignal || isForge ? 'uppercase' : 'none',
          }}>
            NEXUS
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 400,
            color: 'var(--text-ghost)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            marginLeft: 8,
            fontFamily: 'var(--font-body)',
          }}>
            {subtitleText}
          </span>
        </div>
      </div>

      {/* Center: Status + Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={dotStyle} />
          <span style={{
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'var(--font-data)',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {online ? (isSignal ? 'SYS:ONLINE' : 'Online') : (isSignal ? 'SYS:OFFLINE' : 'Offline')}
          </span>
        </div>

        {/* Auth Badge */}
        <AuthBadge auth={auth} onRefresh={onRefreshAuth} onLogin={onLoginAuth} />

        {/* Theme Selector */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'var(--bg-elevated)',
              border: `var(--border-width) solid var(--border)`,
              borderRadius: 'var(--radius)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              padding: '4px 12px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'border-color 0.15s, color 0.15s',
              boxShadow: isForge ? '2px 2px 0 var(--shadow-color)' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-active)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {THEMES.find(t => t.id === theme)?.label || 'THEME'}
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 6,
              background: 'var(--bg-surface)',
              border: `var(--border-width) solid var(--border)`,
              borderRadius: 'var(--radius)',
              padding: 4,
              zIndex: 200,
              minWidth: 160,
              boxShadow: isForge
                ? '4px 4px 0 var(--shadow-color)'
                : '0 8px 24px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.15s ease',
            }}>
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setDropdownOpen(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    background: theme === t.id ? 'var(--accent-glow)' : 'transparent',
                    color: theme === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-data)',
                    fontSize: 11,
                    textAlign: 'left',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (theme !== t.id) {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (theme !== t.id) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{t.label}</span>
                  <span style={{
                    marginLeft: 8,
                    fontSize: 10,
                    opacity: 0.6,
                    fontFamily: 'var(--font-body)',
                    textTransform: 'none',
                    letterSpacing: 'normal',
                  }}>
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
