import React from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

function RepoItem({ repo, theme }) {
  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const shortRemote = repo.remote
    ? repo.remote.replace(/^https?:\/\//, '').replace(/^git@/, '').replace(/:/, '/').replace(/\.git$/, '')
    : null;

  return (
    <li
      style={{
        padding: '10px 0',
        borderBottom: isForge ? '2px dashed var(--border)' : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'default',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'var(--font-data)',
          color: isSignal ? 'var(--accent-dim)' : 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {repo.name}
          {repo.branch && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 'var(--radius-badge)',
              background: 'var(--accent-glow)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {repo.branch}
            </span>
          )}
        </div>
        {shortRemote && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-ghost)',
            marginTop: 3,
            fontFamily: 'var(--font-data)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {shortRemote}
          </div>
        )}
        {repo.lastCommit && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 2,
            fontFamily: 'var(--font-data)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {repo.lastCommit}
            {repo.lastCommitTime && (
              <span style={{ color: 'var(--text-ghost)', marginLeft: 6 }}>
                · {repo.lastCommitTime}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function RepoCard({ repos = [], delay = 0 }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const sectionPrefix = isSignal ? '> ' : (isMeridian ? '◈ ' : '');
  const title = isSignal ? 'REPOSITORIES' : (isMeridian ? 'Repositories' : 'REPOSITORIES');

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
      {isForge && (
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: 'var(--accent)',
        }} />
      )}

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
          {title}
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
          {repos.length}
        </span>
      </div>

      <div style={{ padding: '8px 20px 16px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {repos.length === 0 ? (
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
                  NO REPOSITORIES FOUND
                  <span style={{ animation: 'cursorBlink 1s step-end infinite' }}>_</span>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 20, marginBottom: 8, opacity: 0.3 }}>
                    {isMeridian ? '◈' : '○'}
                  </div>
                  No repositories found
                </>
              )}
            </li>
          ) : (
            repos.map((r) => <RepoItem key={r.name} repo={r} theme={theme} />)
          )}
        </ul>
      </div>
    </div>
  );
}
