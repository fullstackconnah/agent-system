import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('should render the value and label', () => {
    render(<StatCard type="pending" value={5} label="Pending" />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render pending icon', () => {
    render(<StatCard type="pending" value={0} label="Pending" />);
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('should render running icon', () => {
    render(<StatCard type="running" value={0} label="Running" />);
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should render done icon', () => {
    render(<StatCard type="done" value={0} label="Done" />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should render failed icon', () => {
    render(<StatCard type="failed" value={0} label="Failed" />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('should apply counter-pop class when value changes', () => {
    const { rerender } = render(<StatCard type="done" value={3} label="Done" />);

    rerender(<StatCard type="done" value={4} label="Done" />);

    const counter = screen.getByText('4');
    expect(counter.className).toContain('counter-pop');
  });

  it('should not apply counter-pop class when value stays the same', () => {
    const { rerender } = render(<StatCard type="done" value={3} label="Done" />);

    rerender(<StatCard type="done" value={3} label="Done" />);

    const counter = screen.getByText('3');
    expect(counter.className).not.toContain('counter-pop');
  });

  it('should apply animation delay', () => {
    const { container } = render(<StatCard type="pending" value={0} label="Pending" delay={0.5} />);
    const card = container.firstChild;
    expect(card.style.animationDelay).toBe('0.5s');
  });
});
