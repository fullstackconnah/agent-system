import React, { useState, useEffect, useRef } from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

async function fetchGithubRepos() {
  const res = await fetch('/repositories/github');
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

export default function RepoPanel({ open, onClose, onClone, localRepos = [] }) {
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubError, setGithubError] = useState(null);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [cloning, setCloning] = useState(null); // repo name being cloned
  const [feedback, setFeedback] = useState(null); // { name, success, error }
  const urlRef = useRef(null);

  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  // Load GitHub repos when panel opens
  useEffect(() => {
    if (!open) return;
    setLoadingGithub(true);
    setGithubError(null);
    fetchGithubRepos()
      .then(({ repos, error }) => {
        setGithubRepos(repos || []);
        if (error) setGithubError(error);
      })
      .catch((err) => setGithubError(err.message))
      .finally(() => setLoadingGithub(false));
    setTimeout(() => urlRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const localNames = new Set(localRepos.map(r => r.name));

  const handleClone = async (cloneUrl, name) => {
    setCloning(name || cloneUrl);
    setFeedback(null);
    try {
      await onClone(cloneUrl);
      setFeedback({ name: name || cloneUrl, success: true });
      if (!name) setUrl('');
    } catch (err) {
      setFeedback({ name: name || cloneUrl, success: false, error: err.message });
    } finally {
      setCloning(null);
    }
  };

  const inputBase = {
    background: isForge ? 'var(--bg-surface)' : 'var(--bg-input)',
    border: `var(--border-width) solid var(--border)`,
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
    padding: '10px 14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'var(--font-data)',
    flex: 1,
    caretColor: 'var(--accent)',
    ...(isForge ? { boxShadow: '3px 3px 0 var(--shadow-color)' } : {}),
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
          top: 0, right: 0, bottom: 0,
          width: 480,
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
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: isMeridian ? 18 : 14,
            fontWeight: isMeridian ? 600 : 700,
            color: 'var(--accent)',
            fontFamily: 'var(--font-heading)',
            textTransform: isMeridian ? 'none' : 'uppercase',
            letterSpacing: isMeridian ? '0.02em' : '0.08em',
          }}>
            {sectionPrefix}{isMeridian ? 'Add Repository' : 'ADD REPOSITORY'}
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
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>

          {/* Manual URL clone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>
              {isMeridian ? 'Clone URL' : 'CLONE URL'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={urlRef}
                type="text"
                placeholder="https://github.com/user/repo.git"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && url.trim()) handleClone(url.trim()); }}
                style={inputBase}
                onFocus={(e) => { e.target.style.borderColor = 'var(--border-active)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
              />
              <button
                onClick={() => url.trim() && handleClone(url.trim())}
                disabled={!url.trim() || cloning !== null}
                style={{
                  background: 'var(--accent)',
                  border: `var(--border-width) solid var(--accent)`,
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-inverse)',
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '10px 16px',
                  cursor: url.trim() && !cloning ? 'pointer' : 'not-allowed',
                  opacity: url.trim() && !cloning ? 1 : 0.4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 0.1s',
                  ...(isForge ? { boxShadow: '3px 3px 0 var(--shadow-color)' } : {}),
                }}
              >
                {cloning === url.trim() ? '...' : (isSignal ? '[ CLONE ]' : 'Clone')}
              </button>
            </div>
            {feedback && !feedback.name.startsWith('http') && (
              <div style={{
                fontSize: 12,
                color: feedback.success ? 'var(--status-running)' : 'var(--status-failed)',
                fontFamily: 'var(--font-data)',
              }}>
                {feedback.success ? `✓ Cloned successfully` : `✗ ${feedback.error}`}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid var(--border)`, marginTop: -8 }} />

          {/* GitHub repos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>
                {isMeridian ? 'GitHub Repositories' : 'GITHUB REPOSITORIES'}
              </label>
              {!githubError && (
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-ghost)',
                  fontFamily: 'var(--font-data)',
                }}>
                  {loadingGithub ? 'Loading...' : `${githubRepos.length} repos`}
                </span>
              )}
            </div>

            {githubError && (
              <div style={{
                padding: '12px 16px',
                border: `1px solid var(--status-failed)`,
                borderRadius: 'var(--radius)',
                color: 'var(--status-failed)',
                fontSize: 12,
                fontFamily: 'var(--font-data)',
                background: 'rgba(255, 82, 82, 0.05)',
              }}>
                {githubError.includes('GITHUB_TOKEN') ? (
                  <>Set <code style={{ color: 'var(--accent)' }}>GITHUB_TOKEN</code> env var to browse your GitHub repos</>
                ) : githubError}
              </div>
            )}

            {loadingGithub && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    height: 52,
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-elevated)',
                    opacity: 0.5 - i * 0.07,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {!loadingGithub && githubRepos.length > 0 && (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {githubRepos.map((repo) => {
                  const isCloned = localNames.has(repo.name);
                  const isThisCloning = cloning === repo.name;
                  const thisFeedback = feedback?.name === repo.name ? feedback : null;

                  return (
                    <li
                      key={repo.fullName}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        background: isCloned ? 'var(--bg-elevated)' : 'transparent',
                        border: `1px solid ${isCloned ? 'var(--border)' : 'transparent'}`,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { if (!isCloned) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                      onMouseLeave={(e) => { if (!isCloned) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: 'var(--font-data)',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          {repo.name}
                          {repo.private && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-badge)',
                              background: 'rgba(255,200,0,0.1)',
                              color: 'var(--status-pending)',
                              border: '1px solid rgba(255,200,0,0.2)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}>
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <div style={{
                            fontSize: 11,
                            color: 'var(--text-ghost)',
                            marginTop: 2,
                            fontFamily: 'var(--font-body)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {repo.description}
                          </div>
                        )}
                        {thisFeedback && (
                          <div style={{
                            fontSize: 11,
                            color: thisFeedback.success ? 'var(--status-running)' : 'var(--status-failed)',
                            marginTop: 2,
                            fontFamily: 'var(--font-data)',
                          }}>
                            {thisFeedback.success ? '✓ Cloned' : `✗ ${thisFeedback.error}`}
                          </div>
                        )}
                      </div>

                      {isCloned ? (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-badge)',
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent-muted)',
                          fontFamily: 'var(--font-data)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {isSignal ? '[ Downloaded ]' : 'Downloaded'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleClone(repo.cloneUrl, repo.name)}
                          disabled={isThisCloning || cloning !== null}
                          style={{
                            background: 'transparent',
                            border: `var(--border-width) solid var(--border)`,
                            borderRadius: 'var(--radius)',
                            color: 'var(--accent)',
                            fontFamily: 'var(--font-data)',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '4px 12px',
                            cursor: cloning ? 'not-allowed' : 'pointer',
                            opacity: cloning && !isThisCloning ? 0.4 : 1,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            transition: 'all 0.1s',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            ...(isForge && !cloning ? { boxShadow: '2px 2px 0 var(--shadow-color)' } : {}),
                          }}
                          onMouseEnter={(e) => {
                            if (!cloning) {
                              e.currentTarget.style.background = 'var(--accent-glow)';
                              e.currentTarget.style.borderColor = 'var(--accent)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          {isThisCloning ? '...' : (isSignal ? '[ Clone ]' : 'Clone')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
