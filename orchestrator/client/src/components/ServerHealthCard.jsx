import { useTheme } from '../ThemeContext';

const STATUS_COLOR = {
  healthy: 'var(--accent-green, #22c55e)',
  warning: 'var(--accent-yellow, #eab308)',
  critical: 'var(--accent-red, #ef4444)',
  unknown: 'var(--text-dim, #666)',
};

function MetricBar({ label, value, threshold }) {
  const over = value >= threshold;
  const color = over ? STATUS_COLOR.warning : STATUS_COLOR.healthy;
  return (
    <div style={{ textAlign: 'center', padding: '0 12px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value != null ? `${Math.round(value)}%` : '—'}</div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ServerHealthCard({ serverHealth, delay = 0 }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';

  if (!serverHealth) {
    return (
      <div style={cardStyle(delay)}>
        <div style={headerStyle()}>
          <span>{isSignal ? 'SERVER STATUS' : 'Server Health'}</span>
          <span style={{ color: STATUS_COLOR.unknown, fontSize: 12 }}>● CONNECTING</span>
        </div>
      </div>
    );
  }

  const { status, cpu, ram, disk, containers, activeAlerts, checkedAt } = serverHealth;
  const dotColor = STATUS_COLOR[status] ?? STATUS_COLOR.unknown;
  const checkedAgo = checkedAt ? timeSince(new Date(checkedAt)) : '—';
  const runningCount = containers?.filter(c => c.running).length ?? 0;
  const totalCount = containers?.length ?? 0;

  return (
    <div style={cardStyle(delay)}>
      <div style={headerStyle()}>
        <span>{isSignal ? 'SERVER STATUS' : 'Server Health'}</span>
        <span style={{ fontSize: 12, color: dotColor }}>
          ● {status?.toUpperCase() ?? 'UNKNOWN'} &nbsp;
          <span style={{ color: 'var(--text-dim)' }}>last checked {checkedAgo}</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <MetricBar label="CPU" value={cpu} threshold={80} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <MetricBar label="RAM" value={ram} threshold={85} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <MetricBar label="DISK" value={disk} threshold={90} />
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <div style={{ padding: '0 16px', color: runningCount < totalCount ? STATUS_COLOR.warning : STATUS_COLOR.healthy }}>
          {runningCount}/{totalCount} containers ✓
        </div>
      </div>

      {activeAlerts?.length > 0 && (
        <div style={{ padding: '8px 16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>ACTIVE ALERTS</div>
          {activeAlerts.map(alert => (
            <div key={alert.alertId} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <span style={{ color: alert.severity === 'critical' ? STATUS_COLOR.critical : STATUS_COLOR.warning }}>
                {alert.severity === 'critical' ? '🔴' : '⚠️'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{formatTime(alert.createdAt)}</span>
              <span>{alert.message}</span>
              {alert.actionTaken && (
                <span style={{ color: STATUS_COLOR.healthy, marginLeft: 'auto' }}>→ {alert.actionTaken}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {(!activeAlerts || activeAlerts.length === 0) && (
        <div style={{ padding: '10px 16px', fontSize: 12, color: STATUS_COLOR.healthy }}>
          All systems normal
        </div>
      )}
    </div>
  );
}

function cardStyle(delay) {
  return {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    animation: `fadeInUp 0.4s ease ${delay}s both`,
  };
}

function headerStyle() {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--text)',
  };
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  return `${Math.floor(seconds / 3600)} hr ago`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
