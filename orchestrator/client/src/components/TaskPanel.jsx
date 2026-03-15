import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../ThemeContext';

export default function TaskPanel({ open, onClose, onSubmit }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [body, setBody] = useState('');
  const [feedback, setFeedback] = useState(false);
  const titleRef = useRef(null);

  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';

  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!title.trim() || !project.trim() || !body.trim()) return;
    await onSubmit({ title: title.trim(), project: project.trim(), priority, body: body.trim() });
    setTitle('');
    setProject('');
    setPriority('medium');
    setBody('');
    setFeedback(true);
    setTimeout(() => { setFeedback(false); onClose(); }, 2000);
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
    width: '100%',
    caretColor: 'var(--accent)',
    ...(isForge ? { boxShadow: '3px 3px 0 var(--shadow-color)' } : {}),
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = 'var(--border-active)';
  };
  const handleBlur = (e) => {
    e.target.style.borderColor = 'var(--border)';
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: isMeridian ? 500 : 600,
    textTransform: isMeridian ? 'none' : 'uppercase',
    letterSpacing: isMeridian ? '0.02em' : '0.08em',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  };

  const sectionPrefix = isSignal ? '> ' : (isMeridian ? '◈ ' : '');
  const closeText = isSignal ? '[ ESC ]' : '✕';
  const submitText = isSignal ? '[ EXECUTE ]' : (isMeridian ? 'Submit Task' : '[ EXECUTE ]');

  const priorities = ['high', 'medium', 'low'];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isForge ? 'rgba(0,0,0,0.3)' : 'rgba(8, 8, 12, 0.85)',
        zIndex: 200,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transition: 'opacity 0.2s, visibility 0.2s',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          maxWidth: '90vw',
          background: isForge ? 'var(--bg-void)' : 'var(--bg-surface)',
          borderLeft: `var(--border-width) solid var(--accent)`,
          zIndex: 201,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isForge ? '-6px 0 0 var(--shadow-color)' : '-8px 0 40px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid var(--border)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: isMeridian ? 18 : 14,
            fontWeight: isMeridian ? 600 : 700,
            color: 'var(--accent)',
            fontFamily: 'var(--font-heading)',
            textTransform: isMeridian ? 'none' : 'uppercase',
            letterSpacing: isMeridian ? '0.02em' : '0.08em',
          }}>
            {sectionPrefix}{isMeridian ? 'New Task' : 'NEW TASK'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: isSignal ? `1px solid var(--border)` : 'none',
              borderRadius: 'var(--radius)',
              color: 'var(--text-secondary)',
              fontSize: isSignal ? 11 : 18,
              cursor: 'pointer',
              padding: isSignal ? '4px 10px' : '4px',
              fontFamily: isSignal ? 'var(--font-data)' : 'var(--font-body)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {closeText}
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: 24,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
        }}>
          {/* Task Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>{isMeridian ? 'Task Title' : 'TASK TITLE'}</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputBase}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Project */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>{isMeridian ? 'Project' : 'PROJECT'}</label>
            <input
              type="text"
              placeholder="e.g. agent-system"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              style={inputBase}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Priority Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>{isMeridian ? 'Priority' : 'PRIORITY'}</label>
            <div style={{ display: 'flex', gap: isForge ? 8 : 4 }}>
              {priorities.map(p => {
                const isActive = priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: `var(--border-width) solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      background: isActive ? 'var(--accent-glow)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text-ghost)',
                      fontFamily: 'var(--font-data)',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                      ...(isForge && isActive ? { boxShadow: '3px 3px 0 var(--shadow-color)' } : {}),
                    }}
                  >
                    {isSignal ? `[ ${p.toUpperCase()} ]` : p.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>{isMeridian ? 'Description' : 'DESCRIPTION'}</label>
            <textarea
              placeholder="Describe the task in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                ...inputBase,
                resize: 'vertical',
                minHeight: 120,
                lineHeight: 1.6,
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            style={{
              background: 'var(--accent)',
              border: isForge ? 'var(--border-width) solid var(--border)' : `var(--border-width) solid var(--accent)`,
              color: 'var(--text-inverse)',
              fontFamily: 'var(--font-heading)',
              fontSize: 13,
              fontWeight: 600,
              padding: '14px 24px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              transition: 'all 0.1s',
              textTransform: isMeridian ? 'none' : 'uppercase',
              letterSpacing: isMeridian ? '0.02em' : '0.08em',
              width: '100%',
              marginTop: 8,
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
              } else if (isSignal) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }
            }}
            onMouseUp={(e) => {
              if (isSignal) {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'var(--text-inverse)';
              }
            }}
          >
            {submitText}
          </button>

          {feedback && (
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--status-running)',
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
              fontFamily: 'var(--font-data)',
            }}>
              {isSignal ? '[ TASK QUEUED ✓ ]' : '✓ Task queued successfully'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
