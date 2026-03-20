import React, { useState, useRef } from 'react';

export default function AuthBadge({ auth, onRefresh, onLogin }) {
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const fileRef = useRef(null);

  if (!auth) return null;

  const isOk = auth.authenticated && !auth.expired;
  const isExpired = auth.authenticated && auth.expired;

  const handleRefresh = async () => {
    setLoading(true);
    setShowLogin(false);
    try {
      await onRefresh();
    } catch {
      setShowLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await onLogin(json);
      setShowLogin(false);
    } catch (err) {
      alert('Failed to upload credentials: ' + err.message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
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

  const btnBase = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-data)',
    fontSize: 10,
    padding: '2px 8px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor, display: 'inline-block', flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11, fontFamily: 'var(--font-data)',
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: '0.05em', whiteSpace: 'nowrap',
      }}>
        {labelText}
      </span>

      {!isOk && !loading && !showLogin && (
        <button onClick={handleRefresh} style={{
          ...btnBase,
          background: 'var(--bg-elevated)',
          color: 'var(--text-secondary)',
        }}>
          Refresh
        </button>
      )}

      {!isOk && !loading && showLogin && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              ...btnBase,
              background: 'var(--accent-glow, rgba(139,92,246,0.1))',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
            }}
          >
            Upload Credentials
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </>
      )}

      {loading && (
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-data)',
          color: 'var(--text-ghost)', textTransform: 'uppercase',
        }}>
          ...
        </span>
      )}
    </div>
  );
}
