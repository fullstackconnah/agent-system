import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import LogViewer from './LogViewer';
import { renderWithTheme } from '../test/renderWithTheme';

describe('LogViewer', () => {
  it('should render the SYSTEM LOG header', () => {
    renderWithTheme(<LogViewer logs={[]} />);
    expect(screen.getByText('SYSTEM LOG')).toBeInTheDocument();
  });

  it('should show line count in header', () => {
    renderWithTheme(<LogViewer logs={[]} />);
    expect(screen.getByText('0 lines')).toBeInTheDocument();
  });

  it('should render log lines', () => {
    const logs = [
      '[2024-01-01T00:00:00Z] INFO: Server started',
      '[2024-01-01T00:00:01Z] INFO: Task completed',
    ];
    renderWithTheme(<LogViewer logs={logs} />);
    expect(screen.getByText('INFO: Server started')).toBeInTheDocument();
    expect(screen.getByText('INFO: Task completed')).toBeInTheDocument();
  });

  it('should extract timestamp from log line', () => {
    const logs = ['[2024-01-01T12:00:00Z] INFO: test'];
    renderWithTheme(<LogViewer logs={logs} />);
    expect(screen.getByText('2024-01-01T12:00:00Z')).toBeInTheDocument();
  });

  it('should apply text-secondary color for info logs', () => {
    const logs = ['[ts] INFO: info message'];
    renderWithTheme(<LogViewer logs={logs} />);
    const text = screen.getByText('INFO: info message');
    expect(text.style.color).toBe('var(--text-secondary)');
  });

  it('should apply orange color for warn logs', () => {
    const logs = ['[ts] WARN: warning message'];
    renderWithTheme(<LogViewer logs={logs} />);
    const text = screen.getByText('WARN: warning message');
    expect(text.style.color).toBe('var(--status-pending)');
  });

  it('should apply red color for error logs', () => {
    const logs = ['[ts] ERROR: error message'];
    renderWithTheme(<LogViewer logs={logs} />);
    const text = screen.getByText('ERROR: error message');
    expect(text.style.color).toBe('var(--status-failed)');
  });

  it('should show empty state when no logs', () => {
    renderWithTheme(<LogViewer logs={[]} />);
    expect(screen.getByText(/Awaiting log output/)).toBeInTheDocument();
  });

  it('should apply animation delay', () => {
    const { container } = renderWithTheme(<LogViewer logs={[]} delay={0.48} />);
    const card = container.querySelector('.animate-entrance');
    expect(card.style.animationDelay).toBe('0.48s');
  });
});
