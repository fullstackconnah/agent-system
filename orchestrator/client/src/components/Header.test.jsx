import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';

describe('Header', () => {
  it('should render the NEXUS branding', () => {
    render(<Header online={true} onNewTask={() => {}} />);
    expect(screen.getByText('NEXUS')).toBeInTheDocument();
    expect(screen.getByText('Agent Orchestrator')).toBeInTheDocument();
  });

  it('should show Online when online is true', () => {
    render(<Header online={true} onNewTask={() => {}} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should show Offline when online is false', () => {
    render(<Header online={false} onNewTask={() => {}} />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should call onNewTask when New Task button is clicked', () => {
    const onNewTask = vi.fn();
    render(<Header online={true} onNewTask={onNewTask} />);
    fireEvent.click(screen.getByText('New Task'));
    expect(onNewTask).toHaveBeenCalledTimes(1);
  });

  it('should render the SVG logo', () => {
    const { container } = render(<Header online={true} onNewTask={() => {}} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should apply hover styles on the button', () => {
    render(<Header online={true} onNewTask={() => {}} />);
    const btn = screen.getByText('New Task').closest('button');

    fireEvent.mouseEnter(btn);
    expect(btn.style.transform).toBe('scale(1.03)');

    fireEvent.mouseLeave(btn);
    expect(btn.style.transform).toBe('');
  });
});
