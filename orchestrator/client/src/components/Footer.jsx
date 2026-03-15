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
  const deploy = __DEPLOYED_PR__;

  if (!deploy) return null;

  return (
    <footer style={footerStyle}>
      <span>Deployed:</span>
      <span style={linkStyle}>
        {deploy.sha && <span style={{ opacity: 0.6 }}>{deploy.sha} </span>}
        {deploy.title}
      </span>
    </footer>
  );
}
