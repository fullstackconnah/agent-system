import React, { useState, useEffect, useRef } from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

export default function QuickTask({ repos, onSubmit, delay = 0 }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [project, setProject] = useState('');
  const [feedback, setFeedback] = useState(false);
  const textareaRef = useRef(null);

  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  // Auto-select first repo when repos load
  useEffect(() => {
    if (repos.length > 0 && !project) {
      setProject(repos[0].name);
    }
  }, [repos]);

  // Focus textarea when accordion opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!body.trim() || !project) return;
    const title = body.trim().split('\n')[0].slice(0, 80);
    await onSubmit({ title, body: body.trim(), project });
    setBody('');
    setFeedback(true);
    setTimeout(() => { setFeedback(false); setOpen(false); }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  const inputBase = {
    background: isForge ? 'var(--bg-surface)' : 'var(--bg-input)',
    border: `var(--border-width) solid var(--border)`,
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 14,
    padding: '12px 16px',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: isSignal ? 'var(--font-data)' : 'var(--font-body)',
    caretColor: 'var(--accent)',
    ...(isForge ? { boxShadow: '3px 3px 0 var(--shadow-color)' } : {}),
  };

  const handleFocus = (e) => { e.target.style.borderColor = 'var(--border-active)'; };
  const handleBlur = (e) => { e.target.style.borderColor = 'var(--border)'; };

  const cardStyle = {
    background: 'var(--bg-surface)',
    border: `var(--border-width) solid var(--border)`,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    animation: `fadeSlideUp 0.4s ease both`,
    animationDelay: `${delay}s`,
    ...(isForge ? {
      boxShadow: `var(--shadow-x, 4px) var(--shadow-y, 4px) 0 var(--shadow-color)`,
      borderWidth: 2,
    } : {}),
  };

  const headerStyle = {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: open ? `1px solid var(--border)` : 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: isMeridian ? 500 : 600,
    textTransform: isMeridian ? 'none' : 'uppercase',
    letterSpacing: isMeridian ? '0.02em' : '0.08em',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  };

  const chevron = open ? '▲' : '▼';
  const headerLabel = isSignal ? '> NEW TASK' : (isMeridian ? '◈ New Task' : 'NEW TASK');
  const submitText = isSignal ? '[ EXECUTE ]' : (isMeridian ? 'Submit Task' : '[ EXECUTE ]');

  return (
    <div className="animate-entrance hud-card" style={cardStyle}>
      {/* Accordion Header */}
      <div
        style={headerStyle}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{
          fontSize: isMeridian ? 14 : 12,
          fontWeight: isMeridian ? 500 : 700,
          color: 'var(--accent)',
          fontFamily: 'var(--font-heading)',
          textTransform: isMeridian ? 'none' : 'uppercase',
          letterSpacing: isMeridian ? '0.02em' : '0.1em',
        }}>
          {headerLabel}
        </span>
        <span style={{
          fontSize: 10,
          color: 'var(--text-ghost)',
          fontFamily: 'var(--font-data)',
        }}>
          {chevron}
        </span>
      </div>

      {/* Accordion Body */}
      <div style={{
        maxHeight: open ? '360px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Repo selector + submit row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
              <label style={labelStyle}>{isMeridian ? 'Repository' : 'REPOSITORY'}</label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                style={{
                  ...inputBase,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 32,
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                {repos.length === 0 && (
                  <option value="" disabled>No repos cloned</option>
                )}
                {repos.map(r => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>
                {isMeridian ? 'Task description' : 'TASK DESCRIPTION'}
                <span style={{ marginLeft: 8, fontWeight: 400, opacity: 0.6, textTransform: 'none', letterSpacing: 0 }}>
                  {isSignal ? '// ctrl+enter to submit' : '· ⌘↵ to submit'}
                </span>
              </label>
              <textarea
                ref={textareaRef}
                placeholder="Describe what needs to be done..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                style={{
                  ...inputBase,
                  resize: 'vertical',
                  minHeight: 72,
                  lineHeight: 1.6,
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>

            <button
              onClick={handleSubmit}
              style={{
                background: 'var(--accent)',
                border: isForge ? 'var(--border-width) solid var(--border)' : `var(--border-width) solid var(--accent)`,
                color: 'var(--text-inverse)',
                fontFamily: 'var(--font-heading)',
                fontSize: 12,
                fontWeight: 600,
                padding: '12px 20px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'all 0.1s',
                textTransform: isMeridian ? 'none' : 'uppercase',
                letterSpacing: isMeridian ? '0.02em' : '0.08em',
                whiteSpace: 'nowrap',
                alignSelf: 'flex-end',
                ...(isForge ? { boxShadow: '4px 4px 0 var(--shadow-color)' } : {}),
              }}
              onMouseEnter={(e) => {
                if (isForge) {
                  e.currentTarget.style.transform = 'translate(-2px, -2px)';
                  e.currentTarget.style.boxShadow = '6px 6px 0 var(--shadow-color)';
                } else {
                  e.currentTarget.style.background = 'var(--accent-dim)';
                }
              }}
              onMouseLeave={(e) => {
                if (isForge) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '4px 4px 0 var(--shadow-color)';
                } else {
                  e.currentTarget.style.background = 'var(--accent)';
                }
              }}
              onMouseDown={(e) => {
                if (isForge) {
                  e.currentTarget.style.transform = 'translate(4px, 4px)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
              onMouseUp={(e) => {
                if (isForge) {
                  e.currentTarget.style.transform = 'translate(-2px, -2px)';
                  e.currentTarget.style.boxShadow = '6px 6px 0 var(--shadow-color)';
                }
              }}
            >
              {submitText}
            </button>
          </div>

          {feedback && (
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--status-running)',
              fontFamily: 'var(--font-data)',
              animation: 'fadeIn 0.2s ease',
            }}>
              {isSignal ? '[ GOAL QUEUED ✓ ]' : '✓ Goal queued successfully'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
