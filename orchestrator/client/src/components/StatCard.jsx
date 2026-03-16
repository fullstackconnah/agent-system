import React, { useEffect, useRef, useState } from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

const colorMap = {
  pending: 'var(--status-pending)',
  running: 'var(--status-running)',
  done:    'var(--status-done)',
  failed:  'var(--status-failed)',
};

const iconMap = {
  pending: '▪',
  running: '●',
  done:    '◆',
  failed:  '▲',
};

export default function StatCard({ type, value, label, delay = 0 }) {
  const { theme } = useTheme();
  const color = colorMap[type];
  const prevRef = useRef(value);
  const [pop, setPop] = useState(false);

  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  useEffect(() => {
    if (prevRef.current !== value) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 250);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  const cardStyle = {
    background: 'var(--card-bg)',
    border: `var(--border-width) solid var(--card-border)`,
    borderRadius: 'var(--radius)',
    padding: isMeridian ? '20px' : '16px 20px',
    display: 'flex',
    flexDirection: isMeridian ? 'column' : 'row',
    alignItems: isMeridian ? 'center' : 'center',
    gap: isMeridian ? 8 : 16,
    position: 'relative',
    overflow: 'hidden',
    animationDelay: `${delay}s`,
    transition: 'transform 0.15s, border-color 0.15s',
    cursor: 'default',
    textAlign: isMeridian ? 'center' : 'left',
  };

  if (isForge) {
    cardStyle.boxShadow = `var(--shadow-x) var(--shadow-y) 0px var(--shadow-color)`;
  }
  if (isMeridian) {
    cardStyle.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.2)';
  }

  return (
    <div
      className="animate-entrance"
      style={cardStyle}
      onMouseEnter={(e) => {
        if (isForge) {
          e.currentTarget.style.transform = 'translate(-2px, -2px)';
          e.currentTarget.style.boxShadow = '6px 6px 0 var(--shadow-color)';
        } else {
          e.currentTarget.style.borderColor = 'var(--card-hover-border)';
        }
      }}
      onMouseLeave={(e) => {
        if (isForge) {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = `var(--shadow-x) var(--shadow-y) 0px var(--shadow-color)`;
        } else {
          e.currentTarget.style.borderColor = 'var(--card-border)';
        }
      }}
    >
      {/* Left accent bar (SIGNAL & FORGE) */}
      {!isMeridian && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: isForge ? 4 : 3,
          background: color,
        }} />
      )}

      {/* Icon */}
      <span style={{
        fontSize: isMeridian ? 14 : 16,
        color,
        fontFamily: 'var(--font-data)',
        flexShrink: 0,
        width: isMeridian ? 'auto' : 24,
        textAlign: 'center',
      }}>
        {iconMap[type]}
      </span>

      {/* Number + Label */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: isMeridian ? 'center' : 'flex-start',
      }}>
        <span
          className={pop ? 'counter-pop' : ''}
          style={{
            fontSize: isMeridian ? 32 : 36,
            fontWeight: 700,
            lineHeight: 1,
            color,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-1px',
          }}
        >
          {String(value).padStart(2, '0')}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          textTransform: isMeridian ? 'none' : 'uppercase',
          letterSpacing: isMeridian ? '0.02em' : '0.1em',
          fontFamily: 'var(--font-data)',
        }}>
          {isMeridian ? label : label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
