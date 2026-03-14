import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LogViewer from './LogViewer';

describe('LogViewer', () => {
  it('should render the Terminal header', () => {
    render(<LogViewer logs={[]} />);
    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('should render traffic light dots', () => {
    const { container } = render(<LogViewer logs={[]} />);
    const dots = container.querySelectorAll('span[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('should render log lines', () => {
    const logs = [
      '[2024-01-01T00:00:00Z] INFO: Server started',
      '[2024-01-01T00:00:01Z] INFO: Task completed',
    ];
    render(<LogViewer logs={logs} />);
    // formatLine strips the [timestamp] prefix, so text becomes "INFO: Server started"
    expect(screen.getByText('INFO: Server started')).toBeInTheDocument();
    expect(screen.getByText('INFO: Task completed')).toBeInTheDocument();
  });

  it('should extract timestamp from log line', () => {
    const logs = ['[2024-01-01T12:00:00Z] INFO: test'];
    render(<LogViewer logs={logs} />);
    expect(screen.getByText('2024-01-01T12:00:00Z')).toBeInTheDocument();
  });

  it('should apply cyan color for info logs', () => {
    const logs = ['[ts] INFO: info message'];
    render(<LogViewer logs={logs} />);
    const text = screen.getByText('INFO: info message');
    expect(text.style.color).toBe('var(--accent-cyan)');
  });

  it('should apply orange color for warn logs', () => {
    const logs = ['[ts] WARN: warning message'];
    render(<LogViewer logs={logs} />);
    // formatLine strips the [ts] bracket, text becomes "WARN: warning message"
    const text = screen.getByText('WARN: warning message');
    expect(text.style.color).toBe('var(--status-pending)');
  });

  it('should apply red color for error logs', () => {
    const logs = ['[ts] ERROR: error message'];
    render(<LogViewer logs={logs} />);
    const text = screen.getByText('ERROR: error message');
    expect(text.style.color).toBe('var(--status-failed)');
  });

  it('should render empty when no logs', () => {
    const { container } = render(<LogViewer logs={[]} />);
    const output = container.querySelector('div[style*="overflow-y: auto"]');
    expect(output.children.length).toBe(0);
  });

  it('should apply animation delay', () => {
    const { container } = render(<LogViewer logs={[]} delay={0.48} />);
    const card = container.firstChild;
    expect(card.style.animationDelay).toBe('0.48s');
  });
});
