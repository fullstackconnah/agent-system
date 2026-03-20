import React, { useState } from 'react';

export default function AuthBadge({ auth, onRefresh, onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!auth) return null;

  const isOk = auth.authenticated && !auth.expired;
  const isExpired = auth.authenticated && auth.expired;

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await onRefresh();
    } catch (e) {
      setError('refresh-failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onLogin();
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const dotColor = isOk
    ? 'var(--status-running)'
    : isExpired
      ? 'var(--status-warning, #f5a623)'
      : 'var(--status-failed)';

  const labelText = isOk
    ? 'Auth OK'
    : isExpired
      ? 'Token Expired'
      : 'Not Authenticated';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: dotColor,
        display: 'inline-block',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11,
        fontFamily: 'var(--font-data)',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        {labelText}
      </span>

      {!isOk && !loading && error !== 'refresh-failed' && (
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-data)',
            fontSize: 10,
            padding: '2px 8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
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
          Refresh
        </button>
      )}

      {!isOk && !loading && error === 'refresh-failed' && (
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            background: 'var(--accent-glow, rgba(139,92,246,0.1))',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-data)',
            fontSize: 10,
            padding: '2px 8px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}
        >
          Login
        </button>
      )}

      {loading && (
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-data)',
          color: 'var(--text-ghost)',
          textTransform: 'uppercase',
        }}>
          ...
        </span>
      )}
    </div>
  );
}
