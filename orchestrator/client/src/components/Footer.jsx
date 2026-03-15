import React, { useState, useEffect } from 'react';
import { useTheme } from '../ThemeContext';

export default function Footer({ online }) {
  const { theme } = useTheme();
  const [uptime, setUptime] = useState(0);

  const isSignal = theme === 'signal';
  const isForge = theme === 'forge';
  const isMeridian = theme === 'meridian';

  useEffect(() => {
    const id = setInterval(() => setUptime(u => u + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const formatUptime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
  };

  let deploy;
  try { deploy = __DEPLOYED_PR__; } catch { deploy = null; }

  const separator = isMeridian ? ' · ' : ' │ ';

  const barStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    background: isForge ? 'var(--bg-surface)' : 'var(--bg-surface)',
    borderTop: `1px solid var(--border)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    fontFamily: 'var(--font-data)',
    fontSize: 11,
    color: 'var(--text-ghost)',
    zIndex: 100,
    transition: 'background 0.3s',
  };

  if (isForge) {
    barStyle.borderTop = '3px solid var(--border)';
  }

  const statusColor = online ? 'var(--status-running)' : 'var(--status-failed)';
  const statusText = online
    ? (isSignal ? 'SYS:ONLINE' : 'System Online')
    : (isSignal ? 'SYS:OFFLINE' : 'System Offline');

  return (
    <div style={barStyle}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: isSignal ? 0 : '50%',
          background: statusColor,
          display: 'inline-block',
          marginRight: 4,
        }} />
        <span style={{ color: statusColor }}>{statusText}</span>
        <span>{separator}</span>
        <span>CRON:2m</span>
        {deploy && (
          <>
            <span>{separator}</span>
            <span style={{ color: 'var(--text-ghost)' }}>
              {deploy.sha && <span style={{ opacity: 0.7 }}>{deploy.sha} </span>}
              {deploy.title}
            </span>
          </>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>UPTIME:{formatUptime(uptime)}</span>
        <span>{separator}</span>
        <span style={{ color: 'var(--accent)', opacity: 0.6 }}>NEXUS v1.0</span>
      </div>
    </div>
  );
}
