import React, { useState, useEffect, useRef } from 'react';

const inputStyle = {
  background: 'rgba(12, 12, 20, 0.6)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-primary)',
  fontSize: 14,
  padding: '12px 16px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: "'Inter', sans-serif",
  width: '100%',
};

const focusStyle = {
  borderColor: 'var(--accent-purple)',
  boxShadow: '0 0 0 3px rgba(168,85,247,0.1), 0 0 12px rgba(168,85,247,0.1)',
};

function FormInput({ type = 'text', placeholder, value, onChange, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      style={{ ...inputStyle, ...(focused ? focusStyle : {}) }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

export default function TaskPanel({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [body, setBody] = useState('');
  const [feedback, setFeedback] = useState(false);
  const [selectFocused, setSelectFocused] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (open && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 350);
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
    setTimeout(() => {
      setFeedback(false);
      onClose();
    }, 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        transition: 'opacity 0.3s, visibility 0.3s',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          maxWidth: '90vw',
          background: 'rgba(12, 12, 20, 0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid var(--border)',
          zIndex: 201,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient left border */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: 2,
            background: 'linear-gradient(180deg, var(--accent-purple), var(--accent-cyan), var(--accent-pink))',
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            New Task
          </span>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: "'Inter', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 28,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>Task Title</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              onFocus={(e) => Object.assign(e.target.style, focusStyle)}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Project</label>
              <FormInput placeholder="e.g. TripCore" value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b80' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                  ...(selectFocused ? focusStyle : {}),
                }}
                onFocus={() => setSelectFocused(true)}
                onBlur={() => setSelectFocused(false)}
              >
                <option value="high" style={{ background: 'var(--bg-deep)' }}>High</option>
                <option value="medium" style={{ background: 'var(--bg-deep)' }}>Medium</option>
                <option value="low" style={{ background: 'var(--bg-deep)' }}>Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              placeholder="Describe the task in detail..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 120,
                lineHeight: 1.6,
                ...(textareaFocused ? focusStyle : {}),
              }}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
            />
          </div>

          <button
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
              border: 'none',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              padding: '14px 24px',
              borderRadius: 'var(--radius-btn)',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.3s',
              boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
              width: '100%',
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(168,85,247,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.3)';
            }}
          >
            Submit Task
          </button>

          {feedback && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--status-done)',
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              ✓ Task queued successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
};
