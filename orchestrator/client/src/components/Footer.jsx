import React from 'react';

const footerStyle = {
  padding: '24px 32px',
  maxWidth: 1440,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderTop: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontSize: 13,
};

const linkStyle = {
  color: 'var(--accent-purple)',
  textDecoration: 'none',
  fontWeight: 500,
  transition: 'color 0.2s ease',
};

export default function Footer() {
  const pr = __DEPLOYED_PR__;

  if (!pr) return null;

  return (
    <footer style={footerStyle}>
      <span>Deployed PR:</span>
      <a
        href={`https://github.com/fullstackconnah/agent-system/pull/${pr.number}`}
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={(e) => (e.target.style.color = 'var(--accent-cyan)')}
        onMouseLeave={(e) => (e.target.style.color = 'var(--accent-purple)')}
      >
        #{pr.number} {pr.title}
      </a>
    </footer>
  );
}
