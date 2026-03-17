import React from 'react';
import { useTheme, isForgeTheme } from '../ThemeContext';

export default function SectionLabel({ text }) {
  const { theme } = useTheme();
  const isSignal = theme === 'signal';
  const isForge = isForgeTheme(theme);
  const isMeridian = theme === 'meridian';

  const prefix = isSignal ? '// ' : '';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: -4,
    }}>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: isMeridian ? 'none' : 'uppercase',
        letterSpacing: isMeridian ? '0.02em' : '0.14em',
        color: 'var(--text-ghost)',
        fontFamily: 'var(--font-data)',
        whiteSpace: 'nowrap',
      }}>
        {prefix}{isMeridian ? text.toLowerCase().replace(/^\w/, c => c.toUpperCase()) : text}
      </span>
      <div style={{
        flex: 1,
        height: isForge ? 2 : 1,
        background: 'var(--border)',
      }} />
    </div>
  );
}
